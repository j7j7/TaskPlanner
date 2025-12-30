import express from 'express';
import { usersDb } from '../store.js';
import { getSession } from '../auth.js';

const router = express.Router();

function requireAuth(req, res, next) {
  const token = req.cookies?.kanban_session;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.userId = session.user.id;
  next();
}

router.get('/', requireAuth, (req, res) => {
  try {
    const users = usersDb.getAll();
    const filteredUsers = users
      .filter(u => u.id !== req.userId)
      .map(u => ({ id: u.id, username: u.username }));
    res.json({ users: filteredUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
