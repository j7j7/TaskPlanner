import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  ensureDataDir();
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return null;
  }
}

function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  ensureDataDir();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

export const usersDb = {
  getAll: () => readJson('users.json') || [],
  setAll: (users) => writeJson('users.json', users),
  findByUsername: (username) => {
    const users = readJson('users.json') || [];
    return users.find(u => u.username === username);
  },
  findById: (id) => {
    const users = readJson('users.json') || [];
    return users.find(u => u.id === id);
  },
  create: (user) => {
    const users = readJson('users.json') || [];
    users.push(user);
    writeJson('users.json', users);
    return user;
  },
};

export const sessionsDb = {
  getAll: () => readJson('sessions.json') || [],
  setAll: (sessions) => writeJson('sessions.json', sessions),
  create: (session) => {
    const sessions = readJson('sessions.json') || [];
    sessions.push(session);
    writeJson('sessions.json', sessions);
    return session;
  },
  findByToken: (token) => {
    const sessions = readJson('sessions.json') || [];
    return sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  },
  delete: (token) => {
    const sessions = readJson('sessions.json') || [];
    const filtered = sessions.filter(s => s.token !== token);
    writeJson('sessions.json', filtered);
  },
};

export const boardsDb = {
  getAll: () => readJson('boards.json') || [],
  setAll: (boards) => writeJson('boards.json', boards),
  findById: (id) => {
    const boards = readJson('boards.json') || [];
    return boards.find(b => b.id === id);
  },
  findByUserId: (userId) => {
    const boards = readJson('boards.json') || [];
    return boards.filter(b => b.userId === userId);
  },
  create: (board) => {
    const boards = readJson('boards.json') || [];
    boards.push(board);
    writeJson('boards.json', boards);
    return board;
  },
  update: (id, updates) => {
    const boards = readJson('boards.json') || [];
    const index = boards.findIndex(b => b.id === id);
    if (index !== -1) {
      boards[index] = { ...boards[index], ...updates, updatedAt: new Date().toISOString() };
      writeJson('boards.json', boards);
      return boards[index];
    }
    return null;
  },
  delete: (id) => {
    const boards = readJson('boards.json') || [];
    const filtered = boards.filter(b => b.id !== id);
    writeJson('boards.json', filtered);
  },
};

export const labelsDb = {
  getAll: () => readJson('labels.json') || [],
  setAll: (labels) => writeJson('labels.json', labels),
  findByUserId: (userId) => {
    const labels = readJson('labels.json') || [];
    return labels.filter(l => l.userId === 'default' || l.userId === userId);
  },
  create: (label) => {
    const labels = readJson('labels.json') || [];
    labels.push(label);
    writeJson('labels.json', labels);
    return label;
  },
  update: (id, updates) => {
    const labels = readJson('labels.json') || [];
    const index = labels.findIndex(l => l.id === id);
    if (index !== -1) {
      labels[index] = { ...labels[index], ...updates };
      writeJson('labels.json', labels);
      return labels[index];
    }
    return null;
  },
  delete: (id) => {
    const labels = readJson('labels.json') || [];
    const filtered = labels.filter(l => l.id !== id);
    writeJson('labels.json', filtered);
  },
};
