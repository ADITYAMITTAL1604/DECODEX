/**
 * Auth route tests — covers registration, login, JWT verification, and error masking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { mockQuery, generateTestToken, TEST_USERS } from './helpers/setup';

// Must import app AFTER setup mocks are in place
import app from '../server';

describe('Auth Routes', () => {
  // ---- Registration ----
  describe('POST /api/v1/auth/register', () => {
    it('should register a new student successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_USERS.studentA.id,
          email: 'new@decodex.com',
          role: 'student',
          display_name: 'New Student',
        }],
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new@decodex.com',
          password: 'securepass123',
          display_name: 'New Student',
          grade_level: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new@decodex.com');
      expect(res.body.user.role).toBe('student');
      expect(res.body.token).toBeDefined();
      // httpOnly cookie should be set
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
    });

    it('should reject duplicate email (409 CONFLICT)', async () => {
      mockQuery.mockRejectedValueOnce({ code: '23505' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'exists@decodex.com',
          password: 'securepass123',
          display_name: 'Duplicate',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@decodex.com' }); // missing password and display_name

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'securepass123',
          display_name: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('email');
    });

    it('should reject password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@decodex.com',
          password: 'short',
          display_name: 'Test',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('8 characters');
    });
  });

  // ---- Login ----
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_USERS.studentA.id,
          email: 'student@decodex.com',
          password_hash: passwordHash,
          role: 'student',
          display_name: 'Test Student',
        }],
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@decodex.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('student@decodex.com');
      expect(res.body.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_USERS.studentA.id,
          email: 'student@decodex.com',
          password_hash: passwordHash,
          role: 'student',
          display_name: 'Test Student',
        }],
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@decodex.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@decodex.com' }); // missing password

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ---- JWT Middleware ----
  describe('JWT verification middleware', () => {
    it('should reject requests with no token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid tokens', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'token=invalid-jwt-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_EXPIRED');
    });

    it('should accept a valid token and return user data', async () => {
      const token = generateTestToken(TEST_USERS.studentA);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: TEST_USERS.studentA.id,
          email: 'student@decodex.com',
          role: 'student',
          display_name: 'Test Student',
        }],
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(TEST_USERS.studentA.id);
    });
  });
});
