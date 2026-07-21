import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getConsentStatus } from '../middleware/consent';

const router = Router();

// GET /api/v1/students/me/consent-status
router.get('/me/consent-status', authenticate, async (req: AuthRequest, res) => {
  try {
    const studentResult = await query(
      'SELECT invite_code FROM users WHERE id = $1 AND role = $2 AND deleted_at IS NULL',
      [req.user!.id, 'student']
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student account not found' } });
    }

    let inviteCode = studentResult.rows[0].invite_code;
    
    if (!inviteCode) {
      inviteCode = randomBytes(3).toString('hex').toUpperCase();
      await query('UPDATE users SET invite_code = $1 WHERE id = $2', [inviteCode, req.user!.id]);
    }

    const pendingLinkResult = await query(
      [
        'SELECT parent.display_name AS pending_parent_name, parent.email AS pending_parent_email',
        'FROM parent_student_links link',
        'JOIN users parent ON parent.id = link.parent_id',
        'WHERE link.student_id = $1 AND link.consent_granted = FALSE AND link.withdrawn_at IS NULL AND parent.deleted_at IS NULL',
        'LIMIT 1',
      ].join('\n'),
      [req.user!.id]
    );
    const pendingParent = pendingLinkResult.rows[0] as { pending_parent_name: string; pending_parent_email: string } | undefined;

    const consentStatus = await getConsentStatus(req.user!.id);
    res.json({
      invite_code: inviteCode,
      ...consentStatus,
      pending_parent_name: pendingParent?.pending_parent_name || null,
      pending_parent_email: pendingParent?.pending_parent_email || null,
    });
  } catch {
    console.error('Failed to fetch consent status.');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch consent status' } });
  }
});

export default router;
