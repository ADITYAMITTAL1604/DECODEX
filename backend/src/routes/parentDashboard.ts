import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getLatestHealthScore, getHealthScoreHistory } from '../services/healthScore';
import { getLatestScreening } from '../services/riskScreening';
import { generateStrategy } from '../services/copilot';
import { synthesizeSpeech } from '../services/tts';

const router = Router();

const requireParent = requireRole(['parent', 'admin']);

// GET /api/v1/parent/children/:studentId/progress
// Get a child's progress overview (health score, trends, risk indicators).
router.get('/children/:studentId/progress', authenticate, requireParent, async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);
  const parentId = req.user?.id;

  try {
    // Verify parent-student link
    if (req.user?.role === 'parent') {
      const linkRes = await query(
        `SELECT 1 FROM parent_student_links
         WHERE parent_id = $1 AND student_id = $2 AND withdrawn_at IS NULL`,
        [parentId, studentId]
      );
      if (linkRes.rows.length === 0) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No linked child found' } });
      }
    }

    // Get student info
    const studentRes = await query(
      `SELECT id, display_name, grade_level FROM users WHERE id = $1`,
      [studentId]
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found' } });
    }

    // Get health score
    const healthScore = await getLatestHealthScore(studentId);
    const healthHistory = await getHealthScoreHistory(studentId, 10);

    // Get risk screening
    const screening = await getLatestScreening(studentId);

    // Get recent sessions
    const sessionsRes = await query(
      `SELECT rs.id, rs.started_at, rs.words_per_minute, rs.duration_seconds,
              ep.error_rate, ep.total_words_read, ep.total_errors,
              p.title as passage_title
       FROM reading_sessions rs
       LEFT JOIN error_profiles ep ON ep.session_id = rs.id
       LEFT JOIN passages p ON rs.passage_id = p.id
       WHERE rs.student_id = $1 AND rs.status = 'completed' AND rs.deleted_at IS NULL
       ORDER BY rs.started_at DESC LIMIT 10`,
      [studentId]
    );

    // Compute strength areas
    const strengthAreas: string[] = [];
    if (healthScore) {
      if (healthScore.accuracy >= 80) strengthAreas.push('Strong reading accuracy');
      if (healthScore.fluency >= 80) strengthAreas.push('Good reading fluency');
      if (healthScore.wpmNormalized >= 80) strengthAreas.push('Above-average reading speed');
      if (healthScore.improvementTrend >= 60) strengthAreas.push('Positive improvement trend');
    }
    if (strengthAreas.length === 0) strengthAreas.push('Building foundational skills');

    // Compute recommendations
    const recommendations: string[] = [];
    if (healthScore && healthScore.score < 60) {
      recommendations.push('Consider daily 10-minute reading practice');
      recommendations.push('Use the Decodex practice drills after each session');
    }
    if (screening && screening.risk !== 'low') {
      recommendations.push('Discuss screening results with the classroom teacher');
    }
    recommendations.push('Celebrate reading milestones together');
    recommendations.push('Listen to your child read aloud for 15 minutes daily');

    res.json({
      student: studentRes.rows[0],
      healthScore,
      healthHistory,
      screening,
      recentSessions: sessionsRes.rows,
      strengthAreas,
      recommendations,
    });
  } catch (error) {
    console.error('Error fetching child progress:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch progress' } });
  }
});

// GET /api/v1/parent/children
// Get all linked children with summary data.
router.get('/children', authenticate, requireParent, async (req: AuthRequest, res) => {
  const parentId = req.user?.id;

  try {
    const childrenRes = await query(
      `SELECT u.id, u.display_name, u.grade_level,
              psl.consent_granted, psl.consent_date,
              (SELECT COUNT(*) FROM reading_sessions rs WHERE rs.student_id = u.id AND rs.status = 'completed') as session_count,
              (SELECT hs.score FROM health_scores hs WHERE hs.student_id = u.id ORDER BY hs.computed_at DESC LIMIT 1) as health_score,
              (SELECT rs2.words_per_minute FROM reading_sessions rs2 WHERE rs2.student_id = u.id AND rs2.status = 'completed' ORDER BY rs2.started_at DESC LIMIT 1) as latest_wpm
       FROM parent_student_links psl
       JOIN users u ON u.id = psl.student_id
       WHERE psl.parent_id = $1 AND psl.withdrawn_at IS NULL AND u.deleted_at IS NULL`,
      [parentId]
    );

    res.json({ children: childrenRes.rows });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch children' } });
  }
});

// GET /api/v1/parent/children/:studentId/sessions/:sessionId/report
// Parent-facing session report with improvement plan (no exercises/drills).
router.get('/children/:studentId/sessions/:sessionId/report', authenticate, requireParent, async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);
  const sessionId = String(req.params.sessionId);
  const parentId = req.user?.id;

  try {
    // Verify parent-student link (same check as /children/:studentId/progress)
    if (req.user?.role === 'parent') {
      const linkRes = await query(
        `SELECT 1 FROM parent_student_links
         WHERE parent_id = $1 AND student_id = $2 AND withdrawn_at IS NULL`,
        [parentId, studentId]
      );
      if (linkRes.rows.length === 0) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No linked child found' } });
      }
    }

    // Fetch session — verify session belongs to the specified student (IDOR guard)
    const sessionRes = await query(
      `SELECT rs.id, rs.started_at, rs.completed_at, rs.duration_seconds,
              rs.words_per_minute, rs.transcript,
              p.title,
              ep.error_rate, ep.total_words_read, ep.total_errors
       FROM reading_sessions rs
       JOIN passages p ON rs.passage_id = p.id
       LEFT JOIN error_profiles ep ON ep.session_id = rs.id
       WHERE rs.id = $1 AND rs.student_id = $2 AND rs.deleted_at IS NULL`,
      [sessionId, studentId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const session = sessionRes.rows[0];

    // Generate improvement plan via copilot — omit recommendedExercises for parents
    let improvementPlan = null;
    try {
      const strategy = await generateStrategy(studentId);
      improvementPlan = {
        summary: strategy.summary,
        keyConcerns: strategy.keyConcerns,
        weeklyRoadmap: strategy.weeklyRoadmap,
        parentCommunicationDraft: strategy.parentCommunicationDraft,
        healthScoreAtGeneration: strategy.healthScoreAtGeneration,
        riskLevelAtGeneration: strategy.riskLevelAtGeneration,
        // NOTE: recommendedExercises is intentionally OMITTED — parents see
        // the plan and the "why," not the drill library.
      };
    } catch (planErr) {
      console.warn('Copilot strategy generation failed for parent report:', planErr);
      // Non-blocking — report still returns session data even if plan fails
    }

    res.json({ session, improvementPlan });
  } catch (error) {
    console.error('Error fetching parent session report:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch session report' } });
  }
});

// GET /api/v1/parent/children/:studentId/sessions/:sessionId/tts-playback
// On-demand TTS synthesis from the session transcript. Never persists audio.
router.get('/children/:studentId/sessions/:sessionId/tts-playback', authenticate, requireParent, async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);
  const sessionId = String(req.params.sessionId);
  const parentId = req.user?.id;

  try {
    // Verify parent-student link
    if (req.user?.role === 'parent') {
      const linkRes = await query(
        `SELECT 1 FROM parent_student_links
         WHERE parent_id = $1 AND student_id = $2 AND withdrawn_at IS NULL`,
        [parentId, studentId]
      );
      if (linkRes.rows.length === 0) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No linked child found' } });
      }
    }

    // Fetch transcript — verify session belongs to the specified student (IDOR guard)
    const sessionRes = await query(
      `SELECT transcript FROM reading_sessions
       WHERE id = $1 AND student_id = $2 AND deleted_at IS NULL`,
      [sessionId, studentId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const transcript = sessionRes.rows[0].transcript;

    if (!transcript || !transcript.trim()) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No transcript available for this session' } });
    }

    // Synthesize speech — never cached or persisted
    const result = await synthesizeSpeech(transcript);

    if (Buffer.isBuffer(result)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', result.length);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(result);
    }

    // Browser TTS fallback — return transcript text so frontend can use SpeechSynthesis
    return res.json({ useBrowserTts: true, transcript });
  } catch (error) {
    console.error('Error generating TTS playback:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate audio playback' } });
  }
});

export default router;
