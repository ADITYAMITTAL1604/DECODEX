import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { generateStrategy, getStrategyHistory } from '../services/copilot';

const router = Router();

// POST /api/v1/copilot/:studentId/strategy
// Generate a comprehensive intervention strategy. Teachers/admins only.
router.post('/:studentId/strategy', authenticate, requireRole(['teacher', 'admin']), async (req: AuthRequest, res) => {
  const studentId = String(req.params.studentId);
  const teacherId = req.user?.id;

  try {
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
    const history = await getStrategyHistory(studentId);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching copilot history:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch history' } });
  }
});

export default router;
