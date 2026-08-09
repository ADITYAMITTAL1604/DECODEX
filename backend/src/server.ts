import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';

// Initialize Sentry before other imports that might throw
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  console.log('[Sentry] Initialized — error reporting active');
} else {
  console.log('[Sentry] DSN not set — error reporting disabled');
}

import authRoutes from './routes/auth';
import passageRoutes from './routes/passages';
import sessionRoutes from './routes/sessions';
import analyticsRoutes from './routes/analytics';
import teacherRoutes from './routes/teacher';
import consentRoutes from './routes/consent';
import studentRoutes from './routes/students';

// V2 route modules — AI Intervention Platform
import healthScoreRoutes from './routes/healthScore';
import copilotRoutes from './routes/copilot';
import learningPathRoutes from './routes/learningPaths';
import storyRoutes from './routes/stories';
import gamificationRoutes from './routes/gamification';
import riskScreeningRoutes from './routes/riskScreening';
import classroomAnalyticsRoutes from './routes/classroomAnalytics';
import parentDashboardRoutes from './routes/parentDashboard';

// V2 Dex Voice-First Tutor
import ttsRoutes from './routes/tts';
import dexRoutes from './routes/dex';

// Initialize DB schema & migrations
import { initDB } from './db/init';

// Initialize background workers
import './queue/worker';

dotenv.config();

// --- Startup validation ---
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or too short (minimum 32 characters).');
  console.error('Generate one with: openssl rand -base64 32');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
// Trust first proxy (Render / Vercel reverse proxy) so rate limiter
// sees real client IPs instead of the proxy's IP.
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        console.error('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// --- Rate limiting (Section 1e) ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login/register attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 300 API requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

app.use(express.json());
app.use(cookieParser());

// Apply strict rate limiter to auth endpoints
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/register/parent', authLimiter);
app.use('/api/v1/auth/login', authLimiter);

// Apply moderate global rate limiter to all API routes
app.use('/api/v1', globalLimiter);

// Routes — V1 Core
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/passages', passageRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/teacher', teacherRoutes);
app.use('/api/v1/consent', consentRoutes);
app.use('/api/v1/students', studentRoutes);

// Routes — V2 AI Intervention Platform
app.use('/api/v1/health-score', healthScoreRoutes);
app.use('/api/v1/copilot', copilotRoutes);
app.use('/api/v1/learning-paths', learningPathRoutes);
app.use('/api/v1/stories', storyRoutes);
app.use('/api/v1/gamification', gamificationRoutes);
app.use('/api/v1/risk-screening', riskScreeningRoutes);
app.use('/api/v1/classroom', classroomAnalyticsRoutes);
app.use('/api/v1/parent', parentDashboardRoutes);

// Routes — Dex Voice-First Tutor
app.use('/api/v1/tts', ttsRoutes);
app.use('/api/v1/dex', dexRoutes);

// Root route redirect to frontend app
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(frontendUrl);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database on startup:', err);
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (DB init failed)`);
  });
});

export default app;
