import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

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

// Initialize DB schema & migrations
import { initDB } from './db/init';

// Initialize background workers
import './queue/worker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

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
