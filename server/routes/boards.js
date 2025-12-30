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
  if (board.userId === userId) return true;
  if (!board.sharedWith || !Array.isArray(board.sharedWith)) return false;
  return board.sharedWith.some(s => s.userId === userId);
}

function hasWriteAccess(board, userId) {
  if (board.userId === userId) return true;
  if (!board.sharedWith || !Array.isArray(board.sharedWith)) return false;
  const entry = board.sharedWith.find(s => s.userId === userId);
  return entry && entry.permission === 'write';
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

    const { title, columns } = req.body;

    if (columns) {
      const hasBoardAccess = hasWriteAccess(board, req.userId);
      
      if (!hasBoardAccess) {
        const userHasWriteAccessToSomeCard = columns.some(col => 
          col.cards?.some(card => {
            const isOwner = card.userId === req.userId;
            const hasWritePermission = card.sharedWith?.some(
              s => s.userId === req.userId && s.permission === 'write'
            );
            return isOwner || hasWritePermission;
          })
        );

        if (!userHasWriteAccessToSomeCard) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    } else if (!hasWriteAccess(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

    res.json({ board: updated });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

router.put('/:id/cards/:cardId/move', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const { fromColumnId, toColumnId, newIndex } = req.body;

    const fromColumn = board.columns.find(c => c.id === fromColumnId);
    const toColumn = board.columns.find(c => c.id === toColumnId);
    const card = fromColumn?.cards.find(c => c.id === req.params.cardId);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const isOwner = card.userId === req.userId;
    const hasWritePermission = card.sharedWith?.some(
      s => s.userId === req.userId && s.permission === 'write'
    );

    if (!isOwner && !hasWritePermission && !hasWriteAccess(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cardIndex = fromColumn.cards.findIndex(c => c.id === req.params.cardId);
    if (cardIndex === -1) {
      return res.status(404).json({ error: 'Card not found in source column' });
    }

    const [movedCard] = fromColumn.cards.splice(cardIndex, 1);
    movedCard.columnId = toColumnId;

    const destCards = toColumn.cards || [];
    destCards.splice(newIndex, 0, movedCard);

    const updatedBoard = boardsDb.update(req.params.id, {
      columns: board.columns.map(col => {
        if (col.id === fromColumnId) {
          return { ...col, cards: fromColumn.cards };
        }
        if (col.id === toColumnId) {
          return { ...col, cards: destCards };
        }
        return col;
      }),
    });

    res.json({ board: updatedBoard });
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({ error: 'Failed to move card' });
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

    const { userId, permission = 'read' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareBoard(req.params.id, userId, permission);
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

router.put('/:id/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (board.userId !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can update permissions' });
    }

    const { permission } = req.body;

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const updated = boardsDb.updateBoardPermission(req.params.id, req.params.userId, permission);
    res.json({ board: updated });
  } catch (error) {
    console.error('Update board permission error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
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

    const { userId, permission = 'read' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareColumn(req.params.id, req.params.columnId, userId, permission);
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

router.put('/:id/columns/:columnId/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { permission } = req.body;

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const updated = boardsDb.updateColumnPermission(req.params.id, req.params.columnId, req.params.userId, permission);
    res.json({ board: updated });
  } catch (error) {
    console.error('Update column permission error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
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

    const { userId, permission = 'read' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const user = usersDb.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = boardsDb.shareCard(req.params.id, req.params.columnId, req.params.cardId, userId, permission);
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

router.put('/:id/columns/:columnId/cards/:cardId/share/:userId', requireAuth, (req, res) => {
  try {
    const board = boardsDb.findById(req.params.id);

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!canAccessBoard(board, req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { permission } = req.body;

    if (permission !== 'read' && permission !== 'write') {
      return res.status(400).json({ error: 'Invalid permission. Must be "read" or "write"' });
    }

    const updated = boardsDb.updateCardPermission(req.params.id, req.params.columnId, req.params.cardId, req.params.userId, permission);
    res.json({ board: updated });
  } catch (error) {
    console.error('Update card permission error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

export default router;
