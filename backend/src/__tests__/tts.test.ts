/**
 * TTS endpoint tests — validates audio synthesis route behavior.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { generateTestToken, TEST_USERS } from './helpers/setup';
import app from '../server';
import { synthesizeSpeech } from '../services/tts';
import { vi } from 'vitest';

const mockedSynthesize = vi.mocked(synthesizeSpeech);

describe('POST /api/v1/tts', () => {
  const token = generateTestToken(TEST_USERS.studentA);

  it('should return audio/mpeg when TTS succeeds', async () => {
    mockedSynthesize.mockResolvedValueOnce({
      audioBuffer: Buffer.from('fake-mp3-data'),
      useBrowserTts: false,
    });

    const res = await request(app)
      .post('/api/v1/tts')
      .set('Cookie', `token=${token}`)
      .send({ text: 'Hello, great job reading!' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.body).toBeTruthy();
  });

  it('should return { useBrowserTts: true } when circuit breaker falls back', async () => {
    mockedSynthesize.mockResolvedValueOnce({
      audioBuffer: null,
      useBrowserTts: true,
    });

    const res = await request(app)
      .post('/api/v1/tts')
      .set('Cookie', `token=${token}`)
      .send({ text: 'Hello world' });

    expect(res.status).toBe(200);
    expect(res.body.useBrowserTts).toBe(true);
  });

  it('should return 400 when text is missing', async () => {
    const res = await request(app)
      .post('/api/v1/tts')
      .set('Cookie', `token=${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when text exceeds 1000 characters', async () => {
    const longText = 'a'.repeat(1001);

    const res = await request(app)
      .post('/api/v1/tts')
      .set('Cookie', `token=${token}`)
      .send({ text: longText });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('1000');
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/v1/tts')
      .send({ text: 'Hello' });

    expect(res.status).toBe(401);
  });
});
