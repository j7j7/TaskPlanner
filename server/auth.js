import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { usersDb, sessionsDb } from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kanban-secret-key-change-in-production';

export async function register(username, password) {
  const existingUser = usersDb.findByUsername(username);
  if (existingUser) {
    return { error: 'Username already exists' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    passwordHash: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  usersDb.create(user);

  const token = uuidv4();
  const session = {
    id: uuidv4(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  sessionsDb.create(session);

  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

export async function login(username, password) {
  const user = usersDb.findByUsername(username);
  if (!user) {
    return { error: 'Invalid credentials' };
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return { error: 'Invalid credentials' };
  }

  const token = uuidv4();
  const session = {
    id: uuidv4(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  sessionsDb.create(session);

  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

export function logout(token) {
  sessionsDb.delete(token);
}

export function getSession(token) {
  if (!token) return null;
  const session = sessionsDb.findByToken(token);
  if (!session) return null;
  
  const user = usersDb.findById(session.userId);
  if (!user) return null;

  const { passwordHash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword };
}

export function verifyToken(token) {
  try {
    return getSession(token);
  } catch (error) {
    return null;
  }
}
