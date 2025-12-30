import express from 'express';
import { register, login, logout, getSession } from '../auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const result = await register(username, password);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.cookie('kanban_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ user: result.user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await login(username, password);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.cookie('kanban_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ user: result.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  const token = req.cookies?.kanban_session;
  if (token) {
    logout(token);
  }

  res.clearCookie('kanban_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies?.kanban_session;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  res.json({ user: session.user });
});

export default router;
