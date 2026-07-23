import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireConsent } from '../middleware/consent';
import { upload } from '../middleware/upload';
import { audioQueue } from '../queue';
import { processAudioJob } from '../queue/worker';

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
  const { id } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Audio file is required' } });
  }

  try {
    // Verify the session belongs to the requesting student
    const sessionRes = await query(
      `SELECT p.content FROM reading_sessions rs 
       JOIN passages p ON rs.passage_id = p.id 
       WHERE rs.id = $1 AND rs.student_id = $2`,
      [id, req.user?.id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const jobData = {
      sessionId: String(id),
      passageText: sessionRes.rows[0].content,
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
      session_id: id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to queue audio' } });
  }
});

// GET /api/v1/sessions/:id/status/stream
router.get('/:id/status/stream', authenticate, (req, res) => {
  const { id } = req.params;

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

    res.json({ success: true, correction: result.rows[0] });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save feedback' } });
  }
});

// POST /api/v1/sessions/drills/:id/complete
router.post('/drills/:id/complete', authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE drills SET completed = TRUE, completed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Drill not found' } });
    }
    res.json({ success: true, drill: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to complete drill' } });
  }
});

export default router;
