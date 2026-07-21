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

// Initialize background workers
import './queue/worker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/passages', passageRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/teacher', teacherRoutes);
app.use('/api/v1/consent', consentRoutes);
app.use('/api/v1/students', studentRoutes);

// Root route redirect to frontend app
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(frontendUrl);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
