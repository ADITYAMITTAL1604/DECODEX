import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getLatestHealthScore, getHealthScoreHistory } from '../services/healthScore';
import { getLatestScreening } from '../services/riskScreening';

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

export default router;
