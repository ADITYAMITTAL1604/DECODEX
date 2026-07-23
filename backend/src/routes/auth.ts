import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
};

interface ParentRegistrationBody {
  email?: unknown;
  password?: unknown;
  display_name?: unknown;
}

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  const { email, password, display_name, grade_level } = req.body;
  
  if (!email || !password || !display_name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
  }

  const role = 'student';

  try {
    const password_hash = await bcrypt.hash(password, 12);
    const invite_code = randomBytes(3).toString('hex').toUpperCase();
    
    const result = await query(
      `INSERT INTO users (email, password_hash, role, display_name, grade_level, invite_code) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role, display_name`,
      [email, password_hash, role, display_name, grade_level ?? null, invite_code]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, getCookieOptions());

    res.status(201).json({ user, token });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already exists' } });
    }
    console.error('Auth register error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Server error' } });
  }
});

// POST /api/v1/auth/register/parent
router.post('/register/parent', async (req, res) => {
  const { email, password, display_name } = req.body as ParentRegistrationBody;

  if (typeof email !== 'string' || typeof password !== 'string' || typeof display_name !== 'string' || !email || !password || !display_name) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters' } });
  }

  const role = 'parent';

  try {
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4) RETURNING id, email, role, display_name`,
      [email, password_hash, role, display_name]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, getCookieOptions());

    res.status(201).json({ user, token });
  } catch (error: unknown) {
    if (isPostgresUniqueViolation(error)) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already exists' } });
    }
    console.error('Auth register parent error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (error as Error).message || 'Server error' } });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, getCookieOptions());

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        display_name: user.display_name
      },
      token
    });
  } catch (error: any) {
    console.error('Auth login error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Server error' } });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', getCookieOptions());
  res.json({ success: true });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, email, role, display_name FROM users WHERE id = $1', [req.user?.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Server error' } });
  }
});

export default router;

function isPostgresUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === '23505';
}
