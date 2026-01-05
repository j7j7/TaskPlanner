import { create } from 'zustand';
import { id } from '@instantdb/react';
import db from '../lib/db';
import type { Board, Label, User, Column, Card } from '../types';

interface UserPreferences {
  id: string;
  userId: string;
  dormantDays: number;
  createdAt: string;
  updatedAt: string;
}

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  labels: Label[];
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  columnsShowingDormant: Set<string>; // Track which columns are showing dormant cards

  setCurrentUser: (user: User | null) => void;
  toggleDormantCards: (columnId: string) => void;
  
  // User preferences actions
  updateDormantDays: (userId: string, dormantDays: number, existingPreferenceId?: string) => Promise<void>;
  
  // Card dormancy management
  updateCardDormancy: (cardId: string, isDormant: boolean) => Promise<void>;
  updateAllCardsDormancy: (userId: string, dormantDays: number) => Promise<void>;

  // Board actions
  createBoard: (title: string, description?: string) => Promise<Board | null>;
  importBoard: (boardData: Partial<Board>, columns?: Column[]) => Promise<Board | null>;
  updateBoard: (boardId: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  moveBoard: (boardId: string, newIndex: number, userBoards: Board[]) => Promise<void>;

  // Column actions
  createColumn: (title: string, color: string) => Promise<void>;
  updateColumn: (columnId: string, updates: { title?: string; color?: string }) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;

  // Card actions
  createCard: (columnId: string, title: string) => Promise<void>;
  updateCard: (cardId: string, updates: Partial<Board['columns'][0]['cards'][0]>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => Promise<void>;
  moveColumn: (columnId: string, newIndex: number) => Promise<void>;

  // Label actions
  createLabel: (name: string, color: string) => Promise<void>;
  updateLabel: (labelId: string, data: Partial<Label>) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;

  // Sharing actions
  shareBoard: (boardId: string, userId: string, permission: 'read' | 'write') => Promise<void>;
  unshareBoard: (boardId: string, userId: string) => Promise<void>;
  updateBoardPermission: (boardId: string, userId: string, permission: 'read' | 'write') => Promise<void>;
  shareColumn: (boardId: string, columnId: string, userId: string, permission: 'read' | 'write') => Promise<void>;
  unshareColumn: (boardId: string, columnId: string, userId: string) => Promise<void>;
  updateColumnPermission: (boardId: string, columnId: string, userId: string, permission: 'read' | 'write') => Promise<void>;
  shareCard: (boardId: string, columnId: string, cardId: string, userId: string, permission: 'read' | 'write') => Promise<void>;
  unshareCard: (boardId: string, columnId: string, cardId: string, userId: string) => Promise<void>;
  updateCardPermission: (boardId: string, columnId: string, cardId: string, userId: string, permission: 'read' | 'write') => Promise<void>;

  // Utility
  setCurrentBoard: (board: Board | null) => void;
  clearCurrentBoard: () => void;
  setError: (error: string | null) => void;
  fetchUsers: () => Promise<void>;
  setUsers: (users: User[]) => void;
}

function now() {
  return Date.now();
}

function toISOTimestamp(value: number | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return new Date(value).toISOString();
}

function convertTimestamp<T extends object>(obj: T): T & { createdAt: string; updatedAt: string } {
  const typed = obj as Record<string, unknown>;
  const result = {
    ...obj,
    createdAt: toISOTimestamp(typed.createdAt as number | string | undefined),
    updatedAt: toISOTimestamp(typed.updatedAt as number | string | undefined),
  } as T & { createdAt: string; updatedAt: string };
  
  // Ensure isDormant is set (default to false if not present)
  if ('isDormant' in typed && typed.isDormant === undefined) {
    (result as Record<string, unknown>).isDormant = false;
  }
  
  // Ensure isDone is set (default to false if not present)
  if ('isDone' in typed && typed.isDone === undefined) {
    (result as Record<string, unknown>).isDone = false;
  }
  
  return result;
}

function convertBoardTimestamps(board: Board): Board {
  const columns = Array.isArray(board.columns) ? board.columns : [];
  
  return {
    ...board,
    createdAt: toISOTimestamp(board.createdAt),
    updatedAt: toISOTimestamp(board.updatedAt),
    columns: columns.map((col) => ({
      ...col,
      createdAt: toISOTimestamp(col.createdAt),
      updatedAt: toISOTimestamp(col.updatedAt),
      cards: (col.cards || []).map((card) => ({
        ...card,
        createdAt: toISOTimestamp(card.createdAt),
        updatedAt: toISOTimestamp(card.updatedAt),
      })),
    })),
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  labels: [],
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
  columnsShowingDormant: new Set<string>(),

  setCurrentUser: (user: User | null) => {
    set({ currentUser: user });
  },

  toggleDormantCards: (columnId: string) => {
    const { columnsShowingDormant } = get();
    const newSet = new Set(columnsShowingDormant);
    if (newSet.has(columnId)) {
      newSet.delete(columnId);
    } else {
      newSet.add(columnId);
    }
    set({ columnsShowingDormant: newSet });
  },

  createBoard: async (title: string, description?: string) => {
    const { currentUser } = get();
    if (!currentUser) {
      console.error('No current user when creating board');
      return null;
    }

    try {
      // Get existing boards for this user to calculate order
      const { boards } = get();
      const userBoards = boards.filter(b => b.userId === currentUser.id);
      const maxOrder = userBoards.length > 0 
        ? Math.max(...userBoards.map(b => b.order ?? 0)) + 1 
        : 0;

      const newBoardId = id();
      const boardData = {
        id: newBoardId,
        title,
        description: description?.trim() || undefined,
        userId: currentUser.id,
        order: maxOrder,
        createdAt: now(),
        updatedAt: now(),
        sharedWith: [],
      };

      await db.transact([
        db.tx.boards[newBoardId].update(boardData),
      ]);

      return convertBoardTimestamps({ ...boardData, columns: [] } as unknown as Board);
    } catch (error) {
      console.error('Failed to create board:', error);
      set({ error: 'Failed to create board' });
      return null;
    }
  },

  updateBoard: async (boardId: string, data: Partial<Board>) => {
    try {
      const { createdAt, ...updateData } = data;
      await db.transact([
        db.tx.boards[boardId].update({
          ...updateData,
          updatedAt: now(),
        } as Record<string, unknown>),
      ]);
    } catch (error) {
      set({ error: 'Failed to update board' });
    }
  },

  deleteBoard: async (boardId: string) => {
    try {
      // Get all columns and cards for this board to delete them
      const { currentBoard } = get();
      const columnsToDelete = currentBoard?.columns?.map(c => c.id) || [];
      const cardsToDelete = currentBoard?.columns?.flatMap(c => c.cards?.map(card => card.id) || []) || [];
      
      // Delete cards, then columns, then board
      const transactions = [
        ...cardsToDelete.map(cardId => db.tx.cards[cardId].delete()),
        ...columnsToDelete.map(columnId => db.tx.columns[columnId].delete()),
        db.tx.boards[boardId].delete(),
      ];
      
      await db.transact(transactions);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== boardId),
        currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
      }));
    } catch (error) {
      set({ error: 'Failed to delete board' });
    }
  },

  moveBoard: async (boardId: string, newIndex: number, userBoards: Board[]) => {
    const { currentUser } = get();
    if (!currentUser) {
      console.error('moveBoard: Missing currentUser');
      return;
    }

    try {
      // Ensure boards are sorted by order
      const sortedBoards = [...userBoards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      const boardIndex = sortedBoards.findIndex((b) => b.id === boardId);
      if (boardIndex === -1) return;

      // Reorder boards
      const reorderedBoards = [...sortedBoards];
      const [movedBoard] = reorderedBoards.splice(boardIndex, 1);
      reorderedBoards.splice(newIndex, 0, movedBoard);

      // Update order for all affected boards
      const transactions: Parameters<typeof db.transact>[0] = reorderedBoards.map((board, index) =>
        db.tx.boards[board.id].update({ order: index, updatedAt: now() } as Record<string, unknown>)
      );

      await db.transact(transactions);
    } catch (error) {
      console.error('moveBoard: Error moving board', error);
      set({ error: `Failed to move board: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  importBoard: async (boardData: Partial<Board>, columns?: Column[]) => {
    const { currentUser } = get();
    if (!currentUser) {
      console.error('No current user when importing board');
      return null;
    }

    try {
      const newBoardId = boardData.id || id();
      const timestamp = now();

      // Get existing boards for this user to calculate order
      const { boards } = get();
      const userBoards = boards.filter(b => b.userId === currentUser.id);
      const maxOrder = userBoards.length > 0 
        ? Math.max(...userBoards.map(b => b.order ?? 0)) + 1 
        : 0;

      const transactions: Parameters<typeof db.transact>[0] = [
        db.tx.boards[newBoardId].update({
          id: newBoardId,
          title: boardData.title || 'Imported Board',
          userId: currentUser.id,
          order: boardData.order ?? maxOrder,
          createdAt: timestamp,
          updatedAt: timestamp,
          sharedWith: [],
        } as Record<string, unknown>),
      ];

      if (columns && columns.length > 0) {
        columns.forEach((column) => {
          const newColumnId = column.id || id();
          transactions.push(
            db.tx.columns[newColumnId].update({
              id: newColumnId,
              boardId: newBoardId,
              title: column.title,
              color: column.color || '#3b82f6',
              order: column.order || 0,
              userId: currentUser.id,
              sharedWith: [],
              createdAt: timestamp,
              updatedAt: timestamp,
            } as Record<string, unknown>)
          );

          if (column.cards && column.cards.length > 0) {
            column.cards.forEach((card) => {
              const newCardId = card.id || id();
              transactions.push(
                db.tx.cards[newCardId].update({
                  id: newCardId,
                  columnId: newColumnId,
                  boardId: newBoardId,
                  title: card.title,
                  description: card.description || '',
                  labels: card.labels || [],
                  priority: card.priority || 'medium',
                  dueDate: card.dueDate,
                  assignee: card.assignee,
                  icon: card.icon,
                  order: card.order || 0,
                  userId: currentUser.id,
                  isDormant: card.isDormant || false, // Preserve isDormant if present, default to false
                  isDone: card.isDone || false, // Preserve isDone if present, default to false
                  sharedWith: [],
                  createdAt: timestamp,
                  updatedAt: timestamp,
                } as Record<string, unknown>)
              );
            });
          }
        });
      }

      await db.transact(transactions);

      return {
        id: newBoardId,
        title: boardData.title || 'Imported Board',
        userId: currentUser.id,
        order: boardData.order ?? maxOrder,
        createdAt: toISOTimestamp(timestamp),
        updatedAt: toISOTimestamp(timestamp),
        sharedWith: [],
        columns: (columns || []).map((col) => ({
          ...col,
          id: col.id || id(),
          boardId: newBoardId,
          userId: currentUser.id,
          sharedWith: [],
          createdAt: toISOTimestamp(timestamp),
          updatedAt: toISOTimestamp(timestamp),
          cards: (col.cards || []).map((card) => ({
            ...card,
            id: card.id || id(),
            columnId: col.id || id(),
            boardId: newBoardId,
            userId: currentUser.id,
            sharedWith: [],
            createdAt: toISOTimestamp(timestamp),
            updatedAt: toISOTimestamp(timestamp),
          })),
        })),
      } as Board;
    } catch (error) {
      console.error('Failed to import board:', error);
      set({ error: 'Failed to import board' });
      return null;
    }
  },

  createColumn: async (title: string, color: string) => {
    const { currentBoard, currentUser } = get();
    if (!currentBoard || !currentUser) {
      console.error('createColumn: Missing currentBoard or currentUser', { currentBoard: !!currentBoard, currentUser: !!currentUser });
      return;
    }

    try {
      const columnId = id();
      // Get max order from existing columns
      const existingColumns = currentBoard.columns || [];
      const maxOrder = existingColumns.length > 0 
        ? Math.max(...existingColumns.map(c => c.order)) + 1 
        : 0;

      await db.transact([
        db.tx.columns[columnId].update({
          boardId: currentBoard.id,
          title,
          color,
          order: maxOrder,
          userId: currentUser.id,
          sharedWith: [],
          createdAt: now(),
          updatedAt: now(),
        } as Record<string, unknown>),
        db.tx.boards[currentBoard.id].update({
          updatedAt: now(),
        } as Record<string, unknown>),
      ]);
    } catch (error) {
      console.error('createColumn: Error creating column', error);
      set({ error: `Failed to create column: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  updateColumn: async (columnId: string, updates: { title?: string; color?: string }) => {
    const { currentBoard } = get();
    if (!currentBoard) {
      console.error('updateColumn: Missing currentBoard');
      return;
    }

    try {
      await db.transact([
        db.tx.columns[columnId].update({
          ...updates,
          updatedAt: now(),
        }),
        db.tx.boards[currentBoard.id].update({
          updatedAt: now(),
        }),
      ]);
    } catch (error) {
      console.error('updateColumn: Error updating column', error);
      set({ error: `Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  deleteColumn: async (columnId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) {
      console.error('deleteColumn: Missing currentBoard');
      return;
    }

    try {
      // Get all cards in this column to delete them
      const column = currentBoard.columns?.find(c => c.id === columnId);
      const cardIds = column?.cards?.map(c => c.id) || [];

      // Delete all cards in the column, then delete the column
      const transactions = [
        ...cardIds.map(cardId => db.tx.cards[cardId].delete()),
        db.tx.columns[columnId].delete(),
        db.tx.boards[currentBoard.id].update({ updatedAt: now() }),
      ];

      await db.transact(transactions);
    } catch (error) {
      console.error('deleteColumn: Error deleting column', error);
      set({ error: `Failed to delete column: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  createCard: async (columnId: string, title: string) => {
    const { currentBoard, currentUser } = get();
    if (!currentBoard || !currentUser) {
      console.error('createCard: Missing currentBoard or currentUser', { currentBoard: !!currentBoard, currentUser: !!currentUser });
      return;
    }

    try {
      const column = currentBoard.columns?.find((c) => c.id === columnId);
      if (!column) {
        console.error('createCard: Column not found', columnId);
        return;
      }

      const cardId = id();
      const existingCards = column.cards || [];
      const maxOrder = existingCards.length > 0 
        ? Math.max(...existingCards.map(c => c.order)) + 1 
        : 0;

      await db.transact([
        db.tx.cards[cardId].update({
          columnId,
          boardId: currentBoard.id,
          title,
          labels: [],
          priority: 'medium',
          order: maxOrder,
          userId: currentUser.id,
          isDormant: false, // New cards are never dormant
          isDone: false, // New cards are not done
          sharedWith: [],
          createdAt: now(),
          updatedAt: now(),
        } as Record<string, unknown>),
        db.tx.boards[currentBoard.id].update({ updatedAt: now() } as Record<string, unknown>),
      ]);
    } catch (error) {
      console.error('createCard: Error creating card', error);
      set({ error: `Failed to create card: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  updateCard: async (cardId: string, updates: Partial<Board['columns'][0]['cards'][0]>) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      // Remove fields that shouldn't be updated directly (they're managed by the system)
      const { id: _, columnId, boardId, createdAt, isDone, ...updateFields } = updates;
      
      // Build the update object without isDone first
      const cardUpdate: Record<string, unknown> = {
        ...updateFields,
        isDormant: false, // Card is updated, so it's no longer dormant
        updatedAt: now(),
      };
      
      // Update card without isDone first
      await db.transact([
        db.tx.cards[cardId].update(cardUpdate),
        db.tx.boards[currentBoard.id].update({ updatedAt: now() }),
      ]);
      
      // If isDone is provided, update it separately
      // This allows other fields to update even if isDone schema hasn't synced yet
      if (isDone !== undefined) {
        try {
          await db.transact([
            db.tx.cards[cardId].update({ 
              isDone, 
              updatedAt: now() 
            }),
            // Update board's updatedAt to trigger reactive refresh
            db.tx.boards[currentBoard.id].update({ updatedAt: now() }),
          ]);
        } catch (isDoneError) {
          // If isDone update fails, log but don't fail the entire operation
          // This allows the card to be updated even if schema hasn't synced
          console.warn('Failed to update isDone field - schema may not be synced yet:', isDoneError);
          // Don't throw - other fields were updated successfully
        }
      }
    } catch (error) {
      console.error('updateCard error:', error);
      set({ error: 'Failed to update card' });
    }
  },

  deleteCard: async (cardId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      await db.transact([
        db.tx.cards[cardId].delete(),
        db.tx.boards[currentBoard.id].update({ updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to delete card' });
    }
  },

  moveCard: async (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    const { currentBoard } = get();
    if (!currentBoard) {
      console.error('moveCard: Missing currentBoard');
      return;
    }

    try {
      const fromColumn = currentBoard.columns.find((c) => c.id === fromColumnId);
      const toColumn = currentBoard.columns.find((c) => c.id === toColumnId);
      if (!fromColumn || !toColumn) {
        console.error('moveCard: Column not found', { fromColumnId, toColumnId });
        return;
      }

      const fromCards = [...(fromColumn.cards || [])];
      const cardIndex = fromCards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        console.error('moveCard: Card not found in source column', cardId);
        return;
      }

      const transactions: Parameters<typeof db.transact>[0] = [];
      
      if (fromColumnId === toColumnId) {
        // Moving within the same column - reorder cards
        const cards = [...fromCards];
        cards.splice(cardIndex, 1);
        const adjustedIndex = cardIndex < newIndex ? newIndex - 1 : newIndex;
        cards.splice(adjustedIndex, 0, fromCards[cardIndex]);
        
        // Update order for all cards in the column
        // Only update updatedAt for the card being moved, others just get order updated
        cards.forEach((card, index) => {
          if (card.id === cardId) {
            // This is the moved card - update both order and updatedAt
            transactions.push(
              db.tx.cards[card.id].update({ 
                order: index, 
                isDormant: false, // Card is moved, so it's no longer dormant
                updatedAt: now() 
              } as Record<string, unknown>)
            );
          } else {
            // Other cards - only update order, don't touch updatedAt (preserves dormancy)
            transactions.push(
              db.tx.cards[card.id].update({ order: index } as Record<string, unknown>)
            );
          }
        });
      } else {
        // Moving to a different column
        const toCards = [...(toColumn.cards || [])];
        toCards.splice(newIndex, 0, fromCards[cardIndex]);
        
        // Both columns are in the same board (currentBoard), so boardId stays the same
        // But we ensure it's set correctly for data consistency
        const toColumnBoardId = currentBoard.id;
        
        // Update the moved card's columnId, boardId, and order
        transactions.push(
          db.tx.cards[cardId].update({ 
            columnId: toColumnId,
            boardId: toColumnBoardId, // Ensure boardId matches the board
            order: newIndex,
            isDormant: false, // Card is moved, so it's no longer dormant
            updatedAt: now() 
          } as Record<string, unknown>)
        );
        
        // Update orders for remaining cards in source column
        // Only update order, don't touch updatedAt (preserves dormancy)
        const remainingFromCards = fromCards.filter((c) => c.id !== cardId);
        remainingFromCards.forEach((card, index) => {
          transactions.push(
            db.tx.cards[card.id].update({ order: index } as Record<string, unknown>)
          );
        });
        
        // Update orders for cards in destination column (excluding the moved card)
        // Only update order, don't touch updatedAt (preserves dormancy)
        toCards.forEach((card, index) => {
          if (card.id !== cardId) {
            transactions.push(
              db.tx.cards[card.id].update({ order: index } as Record<string, unknown>)
            );
          }
        });
      }

      transactions.push(
        db.tx.boards[currentBoard.id].update({ updatedAt: now() } as Record<string, unknown>)
      );

      await db.transact(transactions);
    } catch (error) {
      console.error('moveCard: Error moving card', error);
      set({ error: `Failed to move card: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  moveColumn: async (columnId: string, newIndex: number) => {
    const { currentBoard } = get();
    if (!currentBoard) {
      console.error('moveColumn: Missing currentBoard');
      return;
    }

    try {
      const existingColumns = currentBoard.columns || [];
      const columns = [...existingColumns];
      const oldIndex = columns.findIndex((c) => c.id === columnId);
      if (oldIndex === -1) return;

      const [movedColumn] = columns.splice(oldIndex, 1);
      columns.splice(newIndex, 0, movedColumn);

      // Update order for all columns
      const transactions: Parameters<typeof db.transact>[0] = columns.map((col, index) =>
        db.tx.columns[col.id].update({ order: index, updatedAt: now() } as Record<string, unknown>)
      );

      transactions.push(
        db.tx.boards[currentBoard.id].update({ updatedAt: now() } as Record<string, unknown>)
      );

      await db.transact(transactions);
    } catch (error) {
      console.error('moveColumn: Error moving column', error);
      set({ error: `Failed to move column: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  createLabel: async (name: string, color: string) => {
    const { currentUser } = get();
    if (!currentUser) {
      console.error('createLabel: Missing currentUser');
      return;
    }

    try {
      await db.transact([
        db.tx.labels[id()].update({
          name,
          color,
          userId: currentUser.id,
          createdAt: now(),
        }),
      ]);
    } catch (error) {
      console.error('createLabel: Error creating label', error);
      set({ error: `Failed to create label: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  updateLabel: async (labelId: string, data: Partial<Label>) => {
    try {
      await db.transact([db.tx.labels[labelId].update(data as Record<string, unknown>)]);
    } catch (error) {
      console.error('updateLabel: Error updating label', error);
      set({ error: `Failed to update label: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  deleteLabel: async (labelId: string) => {
    try {
      await db.transact([db.tx.labels[labelId].delete()]);
    } catch (error) {
      console.error('deleteLabel: Error deleting label', error);
      set({ error: `Failed to delete label: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  shareBoard: async (boardId: string, userId: string, permission: 'read' | 'write') => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const sharedWith = [...(currentBoard.sharedWith || [])];
      const existingIndex = sharedWith.findIndex((s) => s.userId === userId);

      if (existingIndex !== -1) {
        sharedWith[existingIndex].permission = permission;
      } else {
        sharedWith.push({ userId, permission });
      }

      await db.transact([
        db.tx.boards[boardId].update({ sharedWith, updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to share board' });
    }
  },

  unshareBoard: async (boardId: string, userId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const sharedWith = (currentBoard.sharedWith || []).filter((s) => s.userId !== userId);

      await db.transact([
        db.tx.boards[boardId].update({ sharedWith, updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to unshare board' });
    }
  },

  updateBoardPermission: async (boardId: string, userId: string, permission: 'read' | 'write') => {
    await get().shareBoard(boardId, userId, permission);
  },

  shareColumn: async (boardId: string, columnId: string, userId: string, permission: 'read' | 'write') => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const column = currentBoard.columns?.find((col) => col.id === columnId);
      if (!column) {
        console.error('shareColumn: Column not found', columnId);
        return;
      }

      const sharedWith = [...(column.sharedWith || [])];
      const existingIndex = sharedWith.findIndex((s) => s.userId === userId);

      if (existingIndex !== -1) {
        sharedWith[existingIndex].permission = permission;
      } else {
        sharedWith.push({ userId, permission });
      }

      await db.transact([
        db.tx.columns[columnId].update({ sharedWith, updatedAt: now() }),
        db.tx.boards[boardId].update({ updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to share column' });
    }
  },

  unshareColumn: async (boardId: string, columnId: string, userId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const column = currentBoard.columns?.find((col) => col.id === columnId);
      if (!column) {
        console.error('unshareColumn: Column not found', columnId);
        return;
      }

      const sharedWith = (column.sharedWith || []).filter((s) => s.userId !== userId);

      await db.transact([
        db.tx.columns[columnId].update({ sharedWith, updatedAt: now() }),
        db.tx.boards[boardId].update({ updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to unshare column' });
    }
  },

  updateColumnPermission: async (boardId: string, columnId: string, userId: string, permission: 'read' | 'write') => {
    await get().shareColumn(boardId, columnId, userId, permission);
  },

  shareCard: async (boardId: string, columnId: string, cardId: string, userId: string, permission: 'read' | 'write') => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const column = currentBoard.columns?.find((col) => col.id === columnId);
      const card = column?.cards?.find((c) => c.id === cardId);
      if (!card) {
        console.error('shareCard: Card not found', cardId);
        return;
      }

      const sharedWith = [...(card.sharedWith || [])];
      const existingIndex = sharedWith.findIndex((s) => s.userId === userId);

      if (existingIndex !== -1) {
        sharedWith[existingIndex].permission = permission;
      } else {
        sharedWith.push({ userId, permission });
      }

      await db.transact([
        db.tx.cards[cardId].update({ sharedWith, updatedAt: now() }),
        db.tx.boards[boardId].update({ updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to share card' });
    }
  },

  unshareCard: async (boardId: string, columnId: string, cardId: string, userId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const column = currentBoard.columns?.find((col) => col.id === columnId);
      const card = column?.cards?.find((c) => c.id === cardId);
      if (!card) {
        console.error('unshareCard: Card not found', cardId);
        return;
      }

      const sharedWith = (card.sharedWith || []).filter((s) => s.userId !== userId);

      await db.transact([
        db.tx.cards[cardId].update({ sharedWith, updatedAt: now() }),
        db.tx.boards[boardId].update({ updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to unshare card' });
    }
  },

  updateCardPermission: async (boardId: string, columnId: string, cardId: string, userId: string, permission: 'read' | 'write') => {
    await get().shareCard(boardId, columnId, cardId, userId, permission);
  },

  setCurrentBoard: (board: Board | null) => {
    set({ currentBoard: board });
  },

  clearCurrentBoard: () => {
    set({ currentBoard: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  fetchUsers: async () => {
    // InstantDB queries are reactive, so users are automatically synced
    // This function exists for API compatibility with components
    // The actual syncing happens via UsersSync component
    return Promise.resolve();
  },
  
  setUsers: (users: User[]) => {
    set({ users });
  },

  updateDormantDays: async (userId: string, dormantDays: number, existingPreferenceId?: string) => {
    try {
      if (existingPreferenceId) {
        // Update existing preferences
        await db.transact([
          db.tx.userPreferences[existingPreferenceId].update({
            dormantDays,
            updatedAt: now(),
          }),
        ]);
      } else {
        // Try to find existing preference by querying (this will be done via hook in component)
        // For now, create new preferences - if one exists, InstantDB will handle conflicts
        const prefId = id();
        await db.transact([
          db.tx.userPreferences[prefId].update({
            userId,
            dormantDays,
            createdAt: now(),
            updatedAt: now(),
          }),
        ]);
      }
      // Update all cards' dormancy status when preference changes
      await get().updateAllCardsDormancy(userId, dormantDays);
    } catch (error) {
      console.error('updateDormantDays: Error updating preferences', error);
      set({ error: 'Failed to update preferences' });
    }
  },

  updateCardDormancy: async (cardId: string, isDormant: boolean) => {
    const { currentUser } = get();
    if (!currentUser) {
      console.error('updateCardDormancy: No current user');
      return;
    }

    try {
      // NOTE: Ownership verification is done in useBoard hook before calling this function
      // Database-level permissions (instant.perms.ts) also prevent unauthorized updates
      // Safe to update directly - InstantDB will enforce permissions
      await db.transact([
        db.tx.cards[cardId].update({ isDormant }),
      ]);
    } catch (error) {
      // Ignore permission errors - they're expected if card doesn't belong to user
      // This can happen if the card was deleted or permissions changed
      if (error instanceof Error && error.message.includes('permission')) {
        return; // Silently ignore permission errors
      }
      console.error('updateCardDormancy: Error updating card dormancy', error);
      set({ error: 'Failed to update card dormancy' });
    }
  },

  updateAllCardsDormancy: async (userId: string, dormantDays: number) => {
    try {
      // This will be called when preferences change
      // We'll update cards lazily when they're queried instead
      // This function can be called by a background process if needed
      // For now, cards are updated lazily in useBoard hook
      const cutoffTimestamp = Date.now() - (dormantDays * 24 * 60 * 60 * 1000);
      
      // Note: To update all cards, we'd need to query them first
      // Instead, we update cards lazily when they're accessed in useBoard
      // This ensures we only update cards the user has access to
    } catch (error) {
      console.error('updateAllCardsDormancy: Error updating cards dormancy', error);
    }
  },
}));

// Helper functions for user access checking
function hasBoardAccess(board: Board, userId: string | null): boolean {
  if (!userId) return false;
  // User owns the board
  if (board.userId === userId) return true;
  // User is in sharedWith array
  const sharedWith = board.sharedWith || [];
  return sharedWith.some((s) => s.userId === userId);
}

function hasColumnAccess(column: Column, userId: string | null, boardOwnerId: string): boolean {
  if (!userId) return false;
  // User owns the column
  if (column.userId === userId) return true;
  // User owns the board (has access to all columns)
  if (boardOwnerId === userId) return true;
  // User is in column's sharedWith array
  const sharedWith = column.sharedWith || [];
  return sharedWith.some((s) => s.userId === userId);
}

function hasCardAccess(card: Card, userId: string | null, boardOwnerId: string, columnOwnerId: string): boolean {
  if (!userId) return false;
  // User owns the card
  if (card.userId === userId) return true;
  // User owns the board or column (has access to all cards)
  if (boardOwnerId === userId || columnOwnerId === userId) return true;
  // User is in card's sharedWith array
  const sharedWith = card.sharedWith || [];
  return sharedWith.some((s) => s.userId === userId);
}

function filterBoardForUser(board: Board, userId: string | null): Board | null {
  if (!hasBoardAccess(board, userId)) return null;
  
  const userOwnsBoard = board.userId === userId;
  
  // Filter columns and cards within the board
  const filteredColumns = (board.columns || [])
    .filter((col) => {
      // If user owns the board, they see all columns
      if (userOwnsBoard) return true;
      // Otherwise, check if user has access to this column
      return hasColumnAccess(col, userId, board.userId);
    })
    .map((col) => {
      const userOwnsColumn = col.userId === userId;
      return {
        ...col,
        cards: (col.cards || []).filter((card) => {
          // If user owns the board or column, they see all cards
          if (userOwnsBoard || userOwnsColumn) return true;
          // Otherwise, check if user has access to this card
          return hasCardAccess(card, userId, board.userId, col.userId);
        }),
      };
    });
  
  return {
    ...board,
    columns: filteredColumns,
  };
}

// Helper hooks for querying data
export function useBoards() {
  const currentUser = useBoardStore((state) => state.currentUser);
  
  // Query boards, columns, and cards separately
  // SECURITY: Database-level rules handle filtering (see instant.perms.ts)
  // Application-level filtering (filterBoardForUser) handles sharedWith logic
  // Note: InstantDB doesn't support $or/$and operators, so we query all and filter in app
  const boardsQuery = db.useQuery({ boards: {} }) || {};
    
  const columnsQuery = db.useQuery({ columns: {} }) || {};
  const cardsQuery = db.useQuery({ cards: {} }) || {};
  
  // Check different possible structures
  const boardsResult = (boardsQuery as { data?: unknown })?.data || (boardsQuery as { result?: unknown })?.result;
  const columnsResult = (columnsQuery as { data?: unknown })?.data || (columnsQuery as { result?: unknown })?.result;
  const cardsResult = (cardsQuery as { data?: unknown })?.data || (cardsQuery as { result?: unknown })?.result;
  
  const isLoading = ((boardsQuery as { isLoading?: boolean })?.isLoading ?? true) ||
                    ((columnsQuery as { isLoading?: boolean })?.isLoading ?? true) ||
                    ((cardsQuery as { isLoading?: boolean })?.isLoading ?? true);
  const error = (boardsQuery as { error?: Error })?.error || 
                (columnsQuery as { error?: Error })?.error ||
                (cardsQuery as { error?: Error })?.error;

  const rawBoards = (boardsResult as { boards?: unknown[] })?.boards || [];
  const rawColumns = (columnsResult as { columns?: unknown[] })?.columns || [];
  const rawCards = (cardsResult as { cards?: unknown[] })?.cards || [];
  
  const allBoards = rawBoards.map((b) => convertTimestamp(b as Board));
  const allColumns = rawColumns.map((c) => convertTimestamp(c as Column));
  const allCards = rawCards.map((c) => convertTimestamp(c as Card));
  
  const boardsWithData = allBoards.map((board) => {
    const boardColumns = allColumns
      .filter((col) => col.boardId === board.id)
      .sort((a, b) => (a as Column).order - (b as Column).order)
      .map((col) => ({
        ...col,
        cards: allCards
          .filter((card) => card.columnId === col.id)
          .sort((a, b) => (a as Card).order - (b as Card).order)
          .map((card) => card),
      }));
    
    return {
      ...board,
      columns: boardColumns,
    } as Board;
  });
  
  // Filter boards by current user (owned or shared)
  const filteredBoards = boardsWithData
    .map((board) => filterBoardForUser(board, currentUser?.id || null))
    .filter((board): board is Board => board !== null);

  // Sort boards by order (user's boards first, then shared boards)
  // For user's own boards, sort by order field
  // For shared boards, maintain their relative order
  const userBoards = filteredBoards
    .filter(b => b.userId === currentUser?.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  const sharedBoards = filteredBoards
    .filter(b => b.userId !== currentUser?.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  const boards = [...userBoards, ...sharedBoards];

  return { boards, isLoading, error };
}

export function useBoard(boardId: string) {
  const currentUser = useBoardStore((state) => state.currentUser);
  const columnsShowingDormant = useBoardStore((state) => state.columnsShowingDormant);
  const updateCardDormancy = useBoardStore((state) => state.updateCardDormancy);
  const { dormantDays } = useUserPreferences(currentUser?.id || null);
  
  // SECURITY: Database-level rules handle filtering (see instant.perms.ts)
  // Application-level filtering (filterBoardForUser) handles sharedWith logic
  // Note: Query all columns and cards, then filter by boardId in memory
  // This ensures InstantDB always has the data and we filter client-side for reliability
  const boardsQuery = db.useQuery({ boards: {} }) || {};
  const columnsQuery = db.useQuery({ columns: {} }) || {};
  const allCardsQuery = db.useQuery({ cards: {} }) || {};
  
  // Check different possible structures
  const boardsResult = (boardsQuery as { data?: unknown })?.data || (boardsQuery as { result?: unknown })?.result;
  const columnsResult = (columnsQuery as { data?: unknown })?.data || (columnsQuery as { result?: unknown })?.result;
  const allCardsResult = (allCardsQuery as { data?: unknown })?.data || (allCardsQuery as { result?: unknown })?.result;
  
  const isLoading = ((boardsQuery as { isLoading?: boolean })?.isLoading ?? true) ||
                    ((columnsQuery as { isLoading?: boolean })?.isLoading ?? true) ||
                    ((allCardsQuery as { isLoading?: boolean })?.isLoading ?? true);
  const error = (boardsQuery as { error?: Error })?.error || 
                (columnsQuery as { error?: Error })?.error ||
                (allCardsQuery as { error?: Error })?.error;

  const allBoards = (boardsResult as { boards?: Board[] })?.boards || [];
  const allColumns = (columnsResult as { columns?: Column[] })?.columns || [];
  const allCardsFromQuery = (allCardsResult as { cards?: Card[] })?.cards || [];
  
  // IMPORTANT: Defensively filter columns and cards by boardId to ensure correct data when navigating
  // This prevents showing data from previous board if query hasn't updated yet
  const columnsForThisBoard = allColumns.filter((col) => col.boardId === boardId);
  const cardsForThisBoard = allCardsFromQuery.filter((card) => card.boardId === boardId);
  
  // Split cards into active and dormant based on isDormant flag
  // Handle undefined/null as active (non-dormant)
  // IMPORTANT: We need to check both the flag AND calculate dormancy based on updatedAt
  // This ensures we catch cards that should be dormant but haven't been updated yet
  const cutoffTimestamp = Date.now() - (dormantDays * 24 * 60 * 60 * 1000);
  
  let activeCards = cardsForThisBoard.filter((card) => {
    // Exclude done cards from active cards (same as dormant)
    if (card.isDone === true) {
      return false;
    }
    // Card is active if isDormant is false or undefined/null
    if (card.isDormant === false || card.isDormant == null) {
      // Also check if it should be dormant based on updatedAt (for current user's cards only)
      if (currentUser && card.userId === currentUser.id) {
        const cardUpdatedAt = typeof card.updatedAt === 'string' 
          ? new Date(card.updatedAt).getTime() 
          : (card.updatedAt as number);
        // If card is old enough, it should be dormant (but we'll update the flag lazily)
        return cardUpdatedAt >= cutoffTimestamp;
      }
      return true;
    }
    return false;
  });
  
  let dormantCards = cardsForThisBoard.filter((card) => {
    // Include done cards in dormant cards (same behavior as dormant)
    if (card.isDone === true) {
      return true;
    }
    // Card is dormant if isDormant is explicitly true
    if (card.isDormant === true) {
      return true;
    }
    // Also check if it should be dormant based on updatedAt
    // For current user's cards, calculate dormancy even if flag isn't set yet
    // For other users' cards, only show if flag is explicitly set (we can't calculate their dormancy)
    if (currentUser && card.userId === currentUser.id) {
      const cardUpdatedAt = typeof card.updatedAt === 'string' 
        ? new Date(card.updatedAt).getTime() 
        : (card.updatedAt as number);
      // If card is old enough, treat it as dormant even if flag isn't set yet
      return cardUpdatedAt < cutoffTimestamp;
    }
    // For other users' cards, only show if isDormant is explicitly true
    // (we can't calculate dormancy for cards we don't own)
    return false;
  });
  
  // Update isDormant flags based on updatedAt timestamp (lazy update)
  // IMPORTANT: Only update cards that belong to the current user
  // This ensures cards are marked as dormant if they haven't been updated recently
  // NOTE: cutoffTimestamp is already defined above
  const updatePromises: Promise<void>[] = [];
  
  // Only update dormancy flags if user is logged in
  if (currentUser) {
    // Check active cards and mark as dormant if needed
    // Only update cards that belong to the current user
    activeCards.forEach((card) => {
      // Only update cards owned by the current user
      if (card.userId !== currentUser.id) {
        return;
      }
      
      const cardUpdatedAt = typeof card.updatedAt === 'string' 
        ? new Date(card.updatedAt).getTime() 
        : (card.updatedAt as number);
      if (cardUpdatedAt < cutoffTimestamp && !card.isDormant) {
        // Card should be dormant but isn't marked - update it
        updatePromises.push(
          updateCardDormancy(card.id, true).catch(() => {
            // Ignore errors in background updates
          })
        );
      }
    });
    
    // Check dormant cards and mark as active if needed
    // Only update cards that belong to the current user
    dormantCards.forEach((card) => {
      // Only update cards owned by the current user
      if (card.userId !== currentUser.id) {
        return;
      }
      
      const cardUpdatedAt = typeof card.updatedAt === 'string' 
        ? new Date(card.updatedAt).getTime() 
        : (card.updatedAt as number);
      if (cardUpdatedAt >= cutoffTimestamp && card.isDormant) {
        // Card should be active but is marked dormant - update it
        updatePromises.push(
          updateCardDormancy(card.id, false).catch(() => {
            // Ignore errors in background updates
          })
        );
      }
    });
  }
  
  // Update cards in background (don't wait)
  if (updatePromises.length > 0) {
    Promise.all(updatePromises).catch(() => {
      // Ignore errors
    });
  }
  
  // NOTE: activeCards and dormantCards are already filtered above based on isDormant flag
  // and calculated dormancy (for current user's cards). No need to filter again here.
  
  // Find the board
  const rawBoard = allBoards
    .filter((b): b is Board => b.id === boardId)
    .map(convertTimestamp)[0] || null;
  
  if (!rawBoard) {
    return { board: null, isLoading, error };
  }
  
  // Join columns and cards into the board
  // Always query dormant cards for counting, but only include in display when showing dormant
  // Use pre-filtered columns and cards to ensure correct data when navigating
  const boardColumns = columnsForThisBoard
    .sort((a, b) => a.order - b.order)
    .map((col) => {
      // Get all cards for this column (active + dormant for counting)
      // Filter by boardId defensively to ensure cards belong to this board when navigating
      const columnActiveCards = activeCards
        .filter((card) => card.columnId === col.id && card.boardId === boardId)
        .sort((a, b) => a.order - b.order);
      
      const columnDormantCards = dormantCards
        .filter((card) => card.columnId === col.id && card.boardId === boardId)
        .sort((a, b) => a.order - b.order);
      
      // Cards to display: active always, dormant only if THIS column is showing dormant cards
      const isColumnShowingDormant = columnsShowingDormant.has(col.id);
      const columnDisplayCards = isColumnShowingDormant
        ? [...columnActiveCards, ...columnDormantCards].sort((a, b) => a.order - b.order)
        : columnActiveCards;
      
      return {
        ...col,
        cards: columnDisplayCards,
        // Store dormant count for easy access
        _dormantCount: columnDormantCards.length,
      } as Column & { _dormantCount: number };
    });
  
  const boardWithData = {
    ...rawBoard,
    columns: boardColumns,
  } as Board;
  
  // Filter board by current user and filter nested columns/cards
  const board = filterBoardForUser(boardWithData, currentUser?.id || null);

  return { board, isLoading, error };
}

export function useLabels() {
  const currentUser = useBoardStore((state) => state.currentUser);
  // SECURITY: Filter labels by userId - users can only access their own labels
  const queryResult = currentUser
    ? db.useQuery({ 
        labels: {
          $: {
            where: {
              userId: currentUser.id
            }
          }
        }
      }) || {}
    : db.useQuery({ labels: {} }) || {};
  
  // Check different possible structures (matching useBoards logic)
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const rawLabels = (result as { labels?: unknown[] })?.labels || [];
  const allLabels: Label[] = rawLabels.map((l) => {
    const label = l as Label;
    return {
      ...label,
      createdAt: toISOTimestamp(label.createdAt),
    };
  });
  
  // Filter labels by current user (only show labels owned by current user)
  const labels = currentUser
    ? allLabels.filter((l) => l.userId === currentUser.id)
    : [];
    
  return { labels, isLoading, error };
}

export function useUsers() {
  // Query the regular 'users' entity, not '$users' (which only shows current user)
  const queryResult = db.useQuery({ users: {} }) || {};
  
  // Check different possible structures (matching useBoards logic)
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const rawUsers = (result as { users?: User[] })?.users || [];
  const users = rawUsers.map((u) => ({
    id: u.id,
    username: u.username || u.email || u.id,
    email: u.email || u.username || u.id,
    createdAt: toISOTimestamp(u.createdAt),
  }));

  return { users, isLoading, error };
}

// Helper function to check if a card is dormant
// Uses isDormant flag if available, otherwise calculates from updatedAt
export function isCardDormant(card: Card, dormantDays: number): boolean {
  // Use isDormant flag if present (preferred method)
  if (card.isDormant !== undefined) {
    return card.isDormant;
  }
  
  // Fallback: calculate from updatedAt if flag not set
  if (!card.updatedAt) return false;
  
  const updatedDate = new Date(card.updatedAt);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceUpdate >= dormantDays;
}

// Hook to get user preferences
export function useUserPreferences(userId: string | null) {
  // SECURITY: Filter preferences by userId - users can only access their own preferences
  const queryResult = userId
    ? db.useQuery({ 
        userPreferences: {
          $: {
            where: {
              userId: userId
            }
          }
        }
      }) || {}
    : db.useQuery({ userPreferences: {} }) || {};
  
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const rawPreferences = (result as { userPreferences?: unknown[] })?.userPreferences || [];
  
  const userPrefs = userId
    ? rawPreferences.find((p: unknown) => {
        const pref = p as UserPreferences;
        return pref.userId === userId;
      }) as UserPreferences | undefined
    : undefined;

  const preferences: UserPreferences | null = userPrefs
    ? {
        ...userPrefs,
        createdAt: toISOTimestamp(userPrefs.createdAt),
        updatedAt: toISOTimestamp(userPrefs.updatedAt),
      }
    : null;

  // Default to 30 days if no preferences exist
  const dormantDays = preferences?.dormantDays ?? 30;

  return { preferences, dormantDays, isLoading, error };
}

