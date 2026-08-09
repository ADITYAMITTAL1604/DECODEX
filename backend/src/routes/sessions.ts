import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireConsent } from '../middleware/consent';
import { upload } from '../middleware/upload';
import { audioQueue } from '../queue';
import { processAudioJob } from '../queue/worker';
import { getCache, deleteCache } from '../services/cache';
import { getAudioStorage, generateStorageKey, isBase64DataUri } from '../services/audioStorage';

const router = Router();

// Store SSE connections in memory for the worker to access.
// Key: sessionId, Value: Response object.
// Note: This is suitable for single-process deployments. For horizontal scaling,
// replace with a Redis pub/sub layer and sticky sessions.
const sseClients = new Map<string, Response>();

export const getSSEClient = (sessionId: string) => {
  const res = sseClients.get(sessionId);
  if (!res) return null;
  
  return {
    sendEvent: (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };
};

// POST /api/v1/sessions
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { passage_id } = req.body;
  const student_id = req.user?.id;

  if (!passage_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'passage_id is required' } });
  }

  try {
    const passageRes = await query('SELECT id FROM passages WHERE id = $1', [passage_id]);
    if (passageRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Passage not found' } });
    }

    const result = await query(
      `INSERT INTO reading_sessions (student_id, passage_id, status) 
       VALUES ($1, $2, 'in_progress') RETURNING *`,
      [student_id, passage_id]
    );

    res.status(201).json({ session: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create session' } });
  }
});

// POST /api/v1/sessions/:id/audio
router.post('/:id/audio', authenticate, requireConsent, upload.single('audio'), async (req: AuthRequest, res) => {
  const sessionId: string = req.params.id as string;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Audio file is required' } });
  }

  try {
    // Verify the session belongs to the requesting student
    const sessionRes = await query(
      `SELECT rs.student_id, p.content FROM reading_sessions rs
       JOIN passages p ON rs.passage_id = p.id
       WHERE rs.id = $1 AND rs.student_id = $2`,
      [sessionId, req.user?.id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const studentId: string = sessionRes.rows[0].student_id;
    const passageText = sessionRes.rows[0].content;

    // Read audio buffer and upload to object storage
    let storageKey: string | null = null;
    let storageMimeType: string | null = null;
    let storageSizeBytes: number | null = null;
    let storageProvider: string | null = null;
    let uploadFailed = false;

    try {
      const audioBuffer = fs.readFileSync(file.path);
      const rawMimeType = Array.isArray(file.mimetype) ? file.mimetype[0] : file.mimetype;
      const mimeTypeValue: string = (rawMimeType || 'audio/webm') as string;
      const key = generateStorageKey(studentId, sessionId, mimeTypeValue);

      const storage = await getAudioStorage();
      const result = await storage.upload(key, audioBuffer, mimeTypeValue);

      storageKey = result.storageKey;
      storageMimeType = result.mimeType;
      storageSizeBytes = result.sizeBytes;
      storageProvider = result.provider;
    } catch (storageErr) {
      console.error('Object storage upload failed:', storageErr);
      uploadFailed = true;
    }

    // Update session with storage info (or legacy fallback if upload failed)
    if (!uploadFailed && storageKey) {
      await query(
        `UPDATE reading_sessions
         SET audio_storage_key = $1, audio_mime_type = $2, audio_size_bytes = $3, audio_storage_provider = $4,
             audio_base64 = NULL, audio_file_path = $5
         WHERE id = $6`,
        [storageKey, storageMimeType, storageSizeBytes, storageProvider, file.filename || file.path, sessionId]
      );
    } else {
      // Fallback: store legacy fields only so pipeline can still run
      await query(
        `UPDATE reading_sessions SET audio_file_path = $1, audio_base64 = NULL WHERE id = $2`,
        [file.filename || file.path, sessionId]
      );
    }

    const jobData = {
      sessionId: String(sessionId),
      passageText,
      filePath: file.path,
    };

    // Try Bull queue first; fall back to in-process execution if Redis is unavailable
    let queued = false;
    try {
      await audioQueue.add(jobData);
      queued = true;
    } catch (queueErr) {
      console.warn('Bull queue unavailable, running pipeline in-process:', (queueErr as Error).message);
    }

    if (!queued) {
      // In-process fallback: run the pipeline directly (fire-and-forget)
      processAudioJob(jobData).catch(err => {
        console.error('In-process audio pipeline failed:', err);
      });
    }

    res.status(202).json({
      message: 'Audio upload received and queued for processing',
      status: 'queued',
      session_id: sessionId
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to queue audio' } });
  }
});

// GET /api/v1/sessions/:id/status/stream
// SECURITY: Ownership check — students can only stream their own sessions.
router.get('/:id/status/stream', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  try {
    // Verify session exists and check ownership
    const sessionRes = await query(
      'SELECT student_id FROM reading_sessions WHERE id = $1',
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    // IDOR guard: student can only stream their own session
    if (requesterRole === 'student' && sessionRes.rows[0].student_id !== requesterId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Register client
    sseClients.set(id as string, res);

    // Send initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'SSE connection established' })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(id as string);
    });
  } catch (error) {
    console.error('Error setting up SSE stream:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to establish stream' } });
  }
});

// GET /api/v1/sessions/:id/status — Polling endpoint for session processing status.
// Used as a fallback when SSE connections are unreliable (serverless, proxies, etc.).
router.get('/:id/status', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT status, words_per_minute FROM reading_sessions WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const session = result.rows[0];
    const statusMap: Record<string, { step: string; message: string }> = {
      in_progress: { step: 'processing', message: 'Processing your recording...' },
      completed: { step: 'complete', message: 'Processing complete!' },
      error: { step: 'error', message: 'Processing failed. Please try again.' },
    };

    const mapped = statusMap[session.status] || { step: session.status, message: 'Processing...' };

    res.json({
      status: session.status,
      step: mapped.step,
      message: mapped.message,
      wpm: session.words_per_minute || null,
    });
  } catch (error) {
    console.error('Error fetching session status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch status' } });
  }
});

/**
 * GET /api/v1/sessions/:id/audio
 * Streams the student's recorded audio file for playback.
 * Authorization:
 *   - Student: own sessions only
 *   - Parent: linked child via parent_student_links (withdrawn_at IS NULL)
 *   - Teacher: students at same school_id
 *   - Admin: bypass all checks
 * Storage priority: object storage -> legacy base64 -> legacy disk path
 */
router.get('/:id/audio', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  try {
    // Fetch session with audio metadata and relationship data
    const sessionRes = await query(
      `SELECT
         rs.id,
         rs.student_id,
         rs.audio_storage_key,
         rs.audio_mime_type,
         rs.audio_file_path,
         rs.audio_base64,
         u.school_id as student_school_id
       FROM reading_sessions rs
       JOIN users u ON u.id = rs.student_id
       WHERE rs.id = $1 AND rs.deleted_at IS NULL`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const session = sessionRes.rows[0];

    // Authorization checks
    if (requesterRole === 'student') {
      if (session.student_id !== requesterId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    } else if (requesterRole === 'parent') {
      const linkRes = await query(
        `SELECT 1 FROM parent_student_links
         WHERE parent_id = $1 AND student_id = $2 AND withdrawn_at IS NULL`,
        [requesterId, session.student_id]
      );
      if (linkRes.rows.length === 0) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No linked child found' } });
      }
    } else if (requesterRole === 'teacher') {
      const teacherRes = await query('SELECT school_id FROM users WHERE id = $1', [requesterId]);
      const teacherSchoolId = teacherRes.rows[0]?.school_id;
      if (!teacherSchoolId || teacherSchoolId !== session.student_school_id) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied: different school' } });
      }
    }
    // Admin bypasses all checks

    // 1. Try object storage first
    if (session.audio_storage_key) {
      try {
        const storage = await getAudioStorage();
        const buffer = await storage.getBuffer(session.audio_storage_key);
        if (buffer) {
          const mimeType = session.audio_mime_type || storage.getMimeType(session.audio_storage_key);
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'private, max-age=3600');
          return res.send(buffer);
        }
      } catch (storageErr) {
        console.warn('Object storage read failed, falling back to legacy:', storageErr);
      }
    }

    // 2. Fallback: legacy base64 data URI
    if (isBase64DataUri(session.audio_base64)) {
      const matches = session.audio_base64!.match(/^data:(audio\/[a-zA-Z0-9-]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.send(buffer);
      }
    }

    // 3. Fallback: legacy disk file_path
    if (session.audio_file_path) {
      const diskPath = fs.existsSync(session.audio_file_path)
        ? session.audio_file_path
        : path.resolve(process.cwd(), 'uploads', path.basename(session.audio_file_path));

      if (fs.existsSync(diskPath)) {
        const ext = path.extname(diskPath).toLowerCase();
        const mimeType = ext.includes('webm') ? 'audio/webm' :
                         ext.includes('wav') ? 'audio/wav' : 'audio/mpeg';
        res.setHeader('Content-Type', mimeType);
        return res.sendFile(path.resolve(diskPath));
      }
    }

    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No audio recording found' } });
  } catch (error) {
    console.error('Error serving session audio:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch session audio' } });
  }
});


// GET /api/v1/sessions/:id/results
// SECURITY: Ownership check — students can only access their own sessions.
// Teachers and admins can access any student's session for review.
router.get('/:id/results', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  try {
    // Basic session and profile info
    const sessionRes = await query(
      `SELECT rs.*, p.title, p.content as original_passage, ep.error_rate, ep.total_words_read, ep.total_errors
       FROM reading_sessions rs
       JOIN passages p ON rs.passage_id = p.id
       LEFT JOIN error_profiles ep ON ep.session_id = rs.id
       WHERE rs.id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const session = sessionRes.rows[0];

    // IDOR guard: student can only read their own session
    if (requesterRole === 'student' && session.student_id !== requesterId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    // Get detailed classifications
    const classRes = await query(
      `SELECT * FROM error_classifications WHERE session_id = $1 ORDER BY word_index ASC`,
      [id]
    );

    // Get generated drills
    const drillsRes = await query(
      `SELECT * FROM drills WHERE session_id = $1`,
      [id]
    );

    res.json({
      session,
      classifications: classRes.rows,
      drills: drillsRes.rows
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch results' } });
  }
});

// POST /api/v1/sessions/:id/classifications/:errorIndex/feedback
// Only teachers and admins can submit classification corrections.
router.post('/:id/classifications/:errorIndex/feedback', authenticate, async (req: AuthRequest, res) => {
  const { id, errorIndex } = req.params;
  const { corrected_category } = req.body;
  const teacherId = req.user?.id;

  if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only teachers can submit feedback' } });
  }

  // Validate the corrected category is a known value
  const VALID_CATEGORIES = ['REV', 'SUB', 'OMI', 'INS', 'BLD', 'PAC', 'UNC'];
  if (!corrected_category || !VALID_CATEGORIES.includes(corrected_category)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid category' } });
  }

  try {
    // First, fetch the original classification to get source_word and spoken_word for cache invalidation
    const classificationRes = await query(
      `SELECT source_word, spoken_word FROM error_classifications WHERE session_id = $1 AND word_index = $2`,
      [id, errorIndex]
    );

    if (classificationRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Classification not found' } });
    }

    const { source_word, spoken_word } = classificationRes.rows[0];

    // Save the correction
    const result = await query(
      `INSERT INTO classification_corrections (error_id, teacher_id, original_category, corrected_category)
       SELECT ec.id, $3, ec.category, $4
       FROM error_classifications ec
       WHERE ec.session_id = $1 AND ec.word_index = $2
       RETURNING *`,
      [id, errorIndex, teacherId, corrected_category]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Classification not found' } });
    }

    // Invalidate the classification cache for this error pattern
    // Use the same key normalization logic as getClassificationCacheKey in classifier.ts
    const src = (source_word || '').toLowerCase().trim();
    const spk = (spoken_word || '').toLowerCase().trim();

    let cacheKey: string;
    if (!src && spk) {
      cacheKey = `classify:ins:${spk}`;
    } else if (src && !spk) {
      cacheKey = `classify:omi:${src}`;
    } else {
      cacheKey = `classify:sub:${src}:${spk}`;
    }

    await deleteCache(cacheKey);
    console.log(`[Cache Invalidation] Deleted classification cache key: ${cacheKey}`);

    res.json({ success: true, correction: result.rows[0] });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save feedback' } });
  }
});

// POST /api/v1/sessions/drills/:id/complete
// SECURITY: Ownership check — students can only complete their own drills.
router.post('/drills/:id/complete', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;

  try {
    let result;

    if (requesterRole === 'teacher' || requesterRole === 'admin') {
      // Teachers/admins can complete any drill
      result = await query(
        `UPDATE drills SET completed = TRUE, completed_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
    } else {
      // Students can only complete drills belonging to their own sessions
      result = await query(
        `UPDATE drills SET completed = TRUE, completed_at = NOW()
         WHERE id = $1
         AND EXISTS (
           SELECT 1 FROM reading_sessions rs
           WHERE rs.id = drills.session_id AND rs.student_id = $2
         )
         RETURNING *`,
        [id, requesterId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Drill not found' } });
    }
    res.json({ success: true, drill: result.rows[0] });
  } catch (error) {
    console.error('Error completing drill:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to complete drill' } });
  }
});

export default router;
