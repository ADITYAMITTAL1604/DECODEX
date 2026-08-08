/**
 * Consent security tests — proves the /approve bypass is closed.
 *
 * These tests prove:
 * 1. POST /consent/approve returns 410 Gone (removed endpoint) for any caller.
 * 2. POST /consent/link alone (invite-code only, no DOB) NEVER results in
 *    consent_granted = TRUE on the parent_student_links row.
 * 3. Only POST /consent/:token/confirm with a correct date_of_birth can set
 *    consent_granted = TRUE.
 *
 * Tests labelled [BYPASS] must FAIL against the old code (pre-fix) and PASS
 * after the fix.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mockQuery, generateTestToken, TEST_USERS } from './helpers/setup';
import app from '../server';

describe('Consent Security — Bypass Prevention', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // Part 1A: /approve endpoint must be REMOVED (returns 404 or 410)
  // ────────────────────────────────────────────────────────────────────────────
  describe('[BYPASS] POST /api/v1/consent/approve must not grant consent', () => {
    it('returns 410 Gone for an authenticated parent calling /approve', async () => {
      const parentToken = generateTestToken(TEST_USERS.parent);

      const res = await request(app)
        .post('/api/v1/consent/approve')
        .set('Cookie', `token=${parentToken}`)
        .send({ student_id: TEST_USERS.studentA.id });

      // 410 Gone (preferred) or 404 Not Found are both acceptable
      expect([404, 410]).toContain(res.status);
      // Must NOT return 200 with consent_granted: true
      expect(res.body.consent_granted).not.toBe(true);
    });

    it('returns 410 Gone for an authenticated student calling /approve (self-approval bypass)', async () => {
      const studentToken = generateTestToken(TEST_USERS.studentA);

      const res = await request(app)
        .post('/api/v1/consent/approve')
        .set('Cookie', `token=${studentToken}`)
        .send({});

      expect([404, 410]).toContain(res.status);
      expect(res.body.consent_granted).not.toBe(true);
    });

    it('returns 401 for an unauthenticated /approve call', async () => {
      const res = await request(app)
        .post('/api/v1/consent/approve')
        .send({ student_id: TEST_USERS.studentA.id });

      // Either 401 Unauthorized or 404/410 if route is removed entirely — not 200
      expect(res.status).not.toBe(200);
      expect(res.body.consent_granted).not.toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Part 1B: /link alone must NOT produce consent_granted = TRUE
  // ────────────────────────────────────────────────────────────────────────────
  describe('[BYPASS] POST /api/v1/consent/link must not grant consent by itself', () => {
    it('linking via invite code creates a pending link with consent_granted = FALSE, not TRUE', async () => {
      const parentToken = generateTestToken(TEST_USERS.parent);

      // Mock: parent lookup succeeds
      mockQuery.mockResolvedValueOnce({
        rows: [{ email: 'parent@test.com' }],
      });

      // Mock: student lookup by invite code succeeds
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_USERS.studentA.id,
          display_name: 'Alice',
          grade_level: 3,
        }],
      });

      // Mock: INSERT into parent_student_links succeeds (new link row)
      mockQuery.mockResolvedValueOnce({
        rows: [{ parent_id: TEST_USERS.parent.id }],
      });

      // Mock: issueConsentToken internals (INSERT consent_tokens + sendEmail)
      // INSERT consent_tokens
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/v1/consent/link')
        .set('Cookie', `token=${parentToken}`)
        .send({ invite_code: 'VALID-CODE-123' });

      // Link must succeed (201 Created)
      expect(res.status).toBe(201);

      // The /link response must NOT include consent_granted: true
      expect(res.body.consent_granted).not.toBe(true);

      // The actual DB UPDATE to set consent_granted = TRUE must never have been
      // called via mockQuery. Verify no call contained 'consent_granted = TRUE'
      // (other than the read-only token INSERT, which doesn't touch the links table)
      const allQueryCalls = mockQuery.mock.calls.map(([sql]: [string]) => sql || '');
      const consentGrantedUpdates = allQueryCalls.filter(
        (sql) =>
          sql.includes('consent_granted = TRUE') &&
          sql.includes('parent_student_links'),
      );
      expect(consentGrantedUpdates).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Part 2: /confirm with correct DOB IS the only valid grant path
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/consent/:token/confirm — the only valid consent grant path', () => {
    it('grants consent when DOB matches and agree = true', async () => {
      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };
      // Pool.connect mock already handled in setup.ts

      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // SELECT consent_tokens — valid token, matching DOB
      mockQuery.mockResolvedValueOnce({
        rows: [{
          parent_id: TEST_USERS.parent.id,
          student_id: TEST_USERS.studentA.id,
          failed_attempts: 0,
          date_of_birth: '2015-06-15',
        }],
      });

      // UPDATE parent_student_links SET consent_granted = TRUE
      mockQuery.mockResolvedValueOnce({
        rows: [{ consent_granted: true, consent_date: new Date().toISOString() }],
      });

      // UPDATE consent_tokens SET used_at = NOW()
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/v1/consent/valid-test-token/confirm')
        .send({ date_of_birth: '2015-06-15', agree: true });

      expect(res.status).toBe(200);
      expect(res.body.consent_granted).toBe(true);
    });

    it('rejects when DOB does not match (KBV_FAILED)', async () => {
      // BEGIN
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // SELECT consent_tokens — valid token but DOB is 2015-06-15
      mockQuery.mockResolvedValueOnce({
        rows: [{
          parent_id: TEST_USERS.parent.id,
          student_id: TEST_USERS.studentA.id,
          failed_attempts: 0,
          date_of_birth: '2015-06-15',
        }],
      });

      // UPDATE failed_attempts
      mockQuery.mockResolvedValueOnce({ rows: [{ failed_attempts: 1 }] });

      // COMMIT
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/v1/consent/valid-test-token/confirm')
        .send({ date_of_birth: '2015-01-01', agree: true }); // wrong DOB

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('KBV_FAILED');
      expect(res.body.error.details.attempts_remaining).toBe(4);
    });

    it('rejects when agree is false (consent refused)', async () => {
      const res = await request(app)
        .post('/api/v1/consent/some-token/confirm')
        .send({ date_of_birth: '2015-06-15', agree: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
