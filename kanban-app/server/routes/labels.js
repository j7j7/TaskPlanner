import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { labelsDb } from '../store.js';
import { getSession } from '../auth.js';

const router = express.Router();

const DEFAULT_LABELS = [
  { id: 'bug', name: 'Bug', color: '#ef4444', userId: 'default' },
  { id: 'feature', name: 'Feature', color: '#22c55e', userId: 'default' },
  { id: 'idea', name: 'Idea', color: '#3b82f6', userId: 'default' },
  { id: 'todo', name: 'Todo', color: '#f59e0b', userId: 'default' },
  { id: 'important', name: 'Important', color: '#ec4899', userId: 'default' },
];

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
    const labels = labelsDb.findByUserId(req.userId);
    
    const hasDefaults = labels.some(l => l.userId === 'default');
    if (!hasDefaults) {
      DEFAULT_LABELS.forEach(label => {
        labelsDb.create(label);
      });
    }

    const allLabels = labelsDb.findByUserId(req.userId);
    res.json({ labels: allLabels });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    if (!color || !color.startsWith('#')) {
      return res.status(400).json({ error: 'Valid color hex code is required' });
    }

    const label = {
      id: uuidv4(),
      name: name.trim(),
      color,
      userId: req.userId,
    };

    labelsDb.create(label);
    res.status(201).json({ label });
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const { name, color } = req.body;

    const label = {
      name: name?.trim(),
      color,
    };

    const updated = labelsDb.update(req.params.id, label);
    
    if (!updated) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ label: updated });
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const labels = labelsDb.getAll();
    const label = labels.find(l => l.id === req.params.id);

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    if (label.userId !== 'default' && label.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    labelsDb.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

export default router;
