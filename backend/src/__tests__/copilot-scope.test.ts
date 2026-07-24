/**
 * Copilot scope tests — proves the teacher-student school-based scope check works.
 * A teacher without a shared school_id cannot access a student's copilot data.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { mockQuery, generateTestToken, TEST_USERS } from './helpers/setup';
import app from '../server';

describe('Copilot Teacher-Student Scope Check', () => {
  describe('POST /api/v1/copilot/:studentId/strategy', () => {
    it('should deny a teacher without school relationship', async () => {
      const teacherToken = generateTestToken(TEST_USERS.teacher);

      // School scope check returns no rows — teacher is not at the same school
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post(`/api/v1/copilot/${TEST_USERS.studentA.id}/strategy`)
        .set('Cookie', `token=${teacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Not assigned');
    });

    it('should allow a teacher with school relationship', async () => {
      const teacherToken = generateTestToken(TEST_USERS.teacher);

      // School scope check returns a matching row
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const res = await request(app)
        .post(`/api/v1/copilot/${TEST_USERS.studentA.id}/strategy`)
        .set('Cookie', `token=${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.strategy).toBeDefined();
    });

    it('should allow an admin without school check', async () => {
      const adminToken = generateTestToken(TEST_USERS.admin);

      // Admin bypasses the scope check entirely — no mockQuery needed for scope
      const res = await request(app)
        .post(`/api/v1/copilot/${TEST_USERS.studentA.id}/strategy`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/copilot/:studentId/history', () => {
    it('should deny a teacher without school relationship', async () => {
      const teacherToken = generateTestToken(TEST_USERS.teacher);

      // School scope check returns no rows
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/v1/copilot/${TEST_USERS.studentA.id}/history`)
        .set('Cookie', `token=${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('should deny a student trying to access copilot', async () => {
      const studentToken = generateTestToken(TEST_USERS.studentA);

      const res = await request(app)
        .get(`/api/v1/copilot/${TEST_USERS.studentA.id}/history`)
        .set('Cookie', `token=${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
