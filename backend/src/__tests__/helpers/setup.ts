/**
 * Shared test setup — mocks the pg pool and provides test utilities.
 * Loaded automatically by vitest.config.ts setupFiles.
 */
import { vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Load test env vars before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long-for-validation';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.REDIS_URL = 'redis://localhost:6379';

// ---- Mock the database module ----
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
  connect: vi.fn().mockResolvedValue({
    query: mockQuery,
    release: vi.fn(),
  }),
  on: vi.fn(),
};

vi.mock('../../db', () => ({
  query: mockQuery,
  pool: mockPool,
}));

// ---- Mock the queue module ----
vi.mock('../../queue', () => ({
  audioQueue: {
    add: vi.fn(),
    process: vi.fn(),
    on: vi.fn(),
  },
}));

// ---- Mock the worker module ----
vi.mock('../../queue/worker', () => ({
  processAudioJob: vi.fn(),
}));

// ---- Mock services that hit external APIs ----
vi.mock('../../services/copilot', () => ({
  generateStrategy: vi.fn().mockResolvedValue({ summary: 'Test strategy' }),
  getStrategyHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/healthScore', () => ({
  computeHealthScore: vi.fn(),
  getLatestHealthScore: vi.fn().mockResolvedValue(null),
  getHealthScoreHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/riskScreening', () => ({
  runRiskScreening: vi.fn(),
  getLatestScreening: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/email', () => ({
  sendConsentEmail: vi.fn(),
  sendConsentWithdrawalEmail: vi.fn(),
}));

vi.mock('../../queue/consentErasure', () => ({
  eraseConsentDataForLink: vi.fn(),
}));

vi.mock('../../services/tts', () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue({ audioBuffer: Buffer.from('fake-audio'), useBrowserTts: false }),
}));

vi.mock('../../services/dexTutor', () => ({
  gradeSpokenAnswer: vi.fn().mockResolvedValue({ correct: true, feedback: 'Great job!' }),
}));

vi.mock('../../services/openai', () => ({
  transcribeAudio: vi.fn().mockResolvedValue('hello world'),
}));

vi.mock('../../services/cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  generateHashKey: vi.fn().mockReturnValue('mock-hash'),
}));

delete process.env.GROQ_API_KEY;

vi.mock('../../db/init', () => ({
  initDB: vi.fn().mockResolvedValue(undefined),
}));

// ---- Reset mocks before each test ----
beforeEach(() => {
  mockQuery.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Test utilities ----
export { mockQuery, mockPool };

const JWT_SECRET = process.env.JWT_SECRET!;

export function generateTestToken(payload: { id: string; role: string }, expiresIn = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export const TEST_USERS = {
  studentA: { id: '11111111-1111-1111-1111-111111111111', role: 'student' },
  studentB: { id: '22222222-2222-2222-2222-222222222222', role: 'student' },
  teacher: { id: '33333333-3333-3333-3333-333333333333', role: 'teacher' },
  teacherNoSchool: { id: '44444444-4444-4444-4444-444444444444', role: 'teacher' },
  admin: { id: '55555555-5555-5555-5555-555555555555', role: 'admin' },
  parent: { id: '66666666-6666-6666-6666-666666666666', role: 'parent' },
  parentUnlinked: { id: '77777777-7777-7777-7777-777777777777', role: 'parent' },
};
