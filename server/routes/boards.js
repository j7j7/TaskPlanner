import express from 'express';
import { boardsDb, labelsDb, usersDb } from '../store.js';
import { getSession } from '../auth.js';

const router = express.Router();

function generateShortId() {
  return Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
}

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

function canAccessBoard(board, userId) {
  return board.userId === userId || (board.sharedWith && board.sharedWith.includes(userId));
}

router.get('/', requireAuth, (req, res) => {
  try {
    const boards = boardsDb.findByUserId(req.userId);
    res.json({ boards });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Board title is required' });
    }

    const board = {
      id: generateShortId(),
      userId: req.userId,
      title: title.trim(),
      columns: [],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    boardsDb.create(board);
    res.status(201).json({ board });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const labels = labelsDb.findByUserId(req.userId);
    res.json({ board, labels });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

router.put('/:id', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, columns } = req.body;
    const updated = boardsDb.update(req.params.id, {
      title: title?.trim(),
      columns,
    });

    res.json({ board: updated });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    boardsDb.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

router.post('/:id/share', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.userId !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can share this board' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareBoard(req.params.id, userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Share board error:', error);
    res.status(500).json({ error: 'Failed to share board' });
  }
});

router.delete('/:id/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.userId !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can unshare this board' });
    }

    const updated = boardsDb.unshareBoard(req.params.id, req.params.userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Unshare board error:', error);
    res.status(500).json({ error: 'Failed to unshare board' });
  }
});

router.post('/:id/columns/:columnId/share', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareColumn(req.params.id, req.params.columnId, userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Share column error:', error);
    res.status(500).json({ error: 'Failed to share column' });
  }
});

router.delete('/:id/columns/:columnId/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = boardsDb.unshareColumn(req.params.id, req.params.columnId, req.params.userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Unshare column error:', error);
    res.status(500).json({ error: 'Failed to unshare column' });
  }
});

router.post('/:id/columns/:columnId/cards/:cardId/share', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareCard(req.params.id, req.params.columnId, req.params.cardId, userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Share card error:', error);
    res.status(500).json({ error: 'Failed to share card' });
  }
});

router.delete('/:id/columns/:columnId/cards/:cardId/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = boardsDb.unshareCard(req.params.id, req.params.columnId, req.params.cardId, req.params.userId);
    res.json({ board: updated });
  } catch (error) {
    console.error('Unshare card error:', error);
    res.status(500).json({ error: 'Failed to unshare card' });
  }
});

export default router;
