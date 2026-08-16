/**
 * Classification Corrections tests — validates teacher feedback flow and cache invalidation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { mockQuery, generateTestToken, TEST_USERS } from './helpers/setup';
import app from '../server';
import { getCache, deleteCache, setCache } from '../services/cache';

const mockedGetCache = vi.mocked(getCache);
const mockedSetCache = vi.mocked(setCache);
const mockedDeleteCache = vi.mocked(deleteCache);

describe('POST /api/v1/sessions/:id/classifications/:errorIndex/feedback', () => {
  const teacherToken = generateTestToken(TEST_USERS.teacher);
  const sessionId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const errorIndex = '0';

  beforeEach(() => {
    vi.clearAllMocks();
    // Fully reset mockQuery to clear any mockResolvedValueOnce queues
    mockQuery.mockReset();
    // Default: cache miss (no cached classification)
    mockedGetCache.mockResolvedValue(null);
    mockedSetCache.mockResolvedValue(undefined);
    mockedDeleteCache.mockResolvedValue(undefined);
  });

  function setupFeedbackMocks(classificationRow, correctionRow) {
    let callCount = 0;
    mockQuery.mockImplementation(async (sql) => {
      callCount++;
      if (callCount === 1) {
        // First call: fetch classification
        return { rows: classificationRow ? [classificationRow] : [] };
      } else if (callCount === 2) {
        // Second call: insert correction
        return { rows: correctionRow ? [correctionRow] : [] };
      }
      return { rows: [] };
    });
  }

  it('should allow teacher to submit correction', async () => {
    // Mock fetching the classification (for cache key computation)
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ source_word: 'saw', spoken_word: 'was' }],
      })
      // Mock inserting the correction
      .mockResolvedValueOnce({
        rows: [{
          id: 'correction-id',
          error_id: 'error-id',
          teacher_id: TEST_USERS.teacher.id,
          original_category: 'SUB',
          corrected_category: 'REV',
          created_at: new Date().toISOString(),
        }],
      });

    await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'REV' });

    expect(mockedDeleteCache).toHaveBeenCalledWith('classify:sub:saw:was');
  });

  it('should deny non-teacher from submitting correction', async () => {
    const studentToken = generateTestToken(TEST_USERS.studentA);

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${studentToken}`)
      .send({ corrected_category: 'REV' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 400 for invalid category', async () => {
    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 when classification not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'REV' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should invalidate classification cache when correction is submitted (omission)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ source_word: 'the', spoken_word: null }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'correction-id',
          error_id: 'error-id',
          teacher_id: TEST_USERS.teacher.id,
          original_category: 'SUB',
          corrected_category: 'OMI',
          created_at: new Date().toISOString(),
        }],
      });

    await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'OMI' });

    expect(mockedDeleteCache).toHaveBeenCalledWith('classify:omi:the');
  });

  it('should invalidate classification cache when correction is submitted (insertion)', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ source_word: null, spoken_word: 'extra' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'correction-id',
          error_id: 'error-id',
          teacher_id: TEST_USERS.teacher.id,
          original_category: 'SUB',
          corrected_category: 'INS',
          created_at: new Date().toISOString(),
        }],
      });

    await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'INS' });

    expect(mockedDeleteCache).toHaveBeenCalledWith('classify:ins:extra');
  });

  it('should normalize case and trim whitespace when computing cache key', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ source_word: '  Saw  ', spoken_word: '  WAS  ' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'correction-id',
          error_id: 'error-id',
          teacher_id: TEST_USERS.teacher.id,
          original_category: 'SUB',
          corrected_category: 'REV',
          created_at: new Date().toISOString(),
        }],
      });

    await request(app)
      .post(`/api/v1/sessions/${sessionId}/classifications/${errorIndex}/feedback`)
      .set('Cookie', `token=${teacherToken}`)
      .send({ corrected_category: 'REV' });

    expect(mockedDeleteCache).toHaveBeenCalledWith('classify:sub:saw:was');
  });
});