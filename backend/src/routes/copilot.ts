import { Router } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generateStrategy, getStrategyHistory } from '../services/copilot';

const router = Router();

/**
 * Verify that a teacher is assigned to the student via shared school_id.
 * Admins bypass this check entirely.
 */
async function verifyTeacherStudentScope(teacherId: string, studentId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM users t
     JOIN users s ON t.school_id = s.school_id
     WHERE t.id = $1 AND s.id = $2
     AND t.school_id IS NOT NULL AND s.role = 'student' AND s.deleted_at IS NULL`,
    [teacherId, studentId]
  );
  return result.rows.length > 0;
}

// POST /api/v1/copilot/:studentId/strategy
// Generate a comprehensive intervention strategy. Teachers/admins only.
router.post('/:studentId/strategy', authenticate, requireRole(['teacher', 'admin']), async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);
  const teacherId = req.user?.id;

  try {
    // Scope check: teachers must be at the same school as the student
    if (req.user?.role === 'teacher') {
      const hasAccess = await verifyTeacherStudentScope(teacherId!, studentId);
      if (!hasAccess) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to this student' } });
      }
    }

    const strategy = await generateStrategy(studentId, teacherId);
    res.json({ strategy });
  } catch (error) {
    console.error('Error generating copilot strategy:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate intervention strategy' } });
  }
});

// GET /api/v1/copilot/:studentId/history
// Get previous copilot sessions for a student.
router.get('/:studentId/history', authenticate, requireRole(['teacher', 'admin']), async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);

  try {
    // Scope check: teachers must be at the same school as the student
    if (req.user?.role === 'teacher') {
      const hasAccess = await verifyTeacherStudentScope(req.user.id, studentId);
      if (!hasAccess) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not assigned to this student' } });
      }
    }

    const history = await getStrategyHistory(studentId);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching copilot history:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch history' } });
  }
});

export default router;

