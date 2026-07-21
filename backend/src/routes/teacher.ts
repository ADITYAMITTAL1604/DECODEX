import { Router } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Reuse the shared requireRole middleware instead of reimplementing inline.
const requireTeacher = requireRole(['teacher', 'admin']);

// GET /api/v1/teacher/students
router.get('/students', authenticate, requireTeacher, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.display_name, 
        u.grade_level,
        COUNT(DISTINCT rs.id) as session_count,
        MAX(rs.started_at) as last_active,
        AVG(rs.words_per_minute) as avg_wpm,
        AVG(ep.error_rate) as avg_error_rate
      FROM users u
      LEFT JOIN reading_sessions rs ON u.id = rs.student_id AND rs.deleted_at IS NULL
      LEFT JOIN error_profiles ep ON rs.id = ep.session_id
      WHERE u.role = 'student' AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY u.display_name ASC
    `);

    res.json({ students: result.rows });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch students' } });
  }
});

// GET /api/v1/teacher/students/:id/trends
router.get('/students/:id/trends', authenticate, requireTeacher, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         rs.started_at as date,
         rs.words_per_minute,
         rs.duration_seconds,
         ep.error_rate,
         ep.total_words_read,
         ep.total_errors,
         ep.rev_count,
         ep.sub_count,
         ep.omi_count,
         ep.ins_count,
         ep.bld_count,
         ep.pac_count,
         ep.uncertain_count
       FROM error_profiles ep
       JOIN reading_sessions rs ON ep.session_id = rs.id
       WHERE ep.student_id = $1 AND rs.deleted_at IS NULL
       ORDER BY rs.started_at ASC
       LIMIT 10`,
      [req.params.id]
    );

    res.json({ trends: result.rows });
  } catch (error) {
    console.error('Error fetching student trends:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch trends' } });
  }
});

export default router;
