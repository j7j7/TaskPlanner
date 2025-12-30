import { create } from 'zustand';
import { id } from '@instantdb/react';
import db from '../lib/db';
import type { Board, Label, User } from '../types';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  labels: Label[];
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;

  setCurrentUser: (user: User | null) => void;

  // Board actions
  createBoard: (title: string) => Promise<Board | null>;
  updateBoard: (boardId: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

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
}

function now() {
  return Date.now();
}

function toISOTimestamp(value: number | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return new Date(value).toISOString();
}

function convertTimestamp<T extends Record<string, unknown>>(obj: T): T {
  return {
    ...obj,
    createdAt: toISOTimestamp(obj.createdAt as number | string | undefined),
    updatedAt: toISOTimestamp(obj.updatedAt as number | string | undefined),
  };
}

function convertBoardTimestamps(board: Board): Board {
  // Ensure columns is always an array
  const columns = Array.isArray(board.columns) ? board.columns : [];
  
  return {
    ...convertTimestamp(board),
    columns: columns.map((col) => ({
      ...convertTimestamp(col),
      cards: (col.cards || []).map((card) => convertTimestamp(card)),
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

  setCurrentUser: (user: User | null) => {
    console.log('setCurrentUser called with:', user?.id);
    set({ currentUser: user });
  },

  createBoard: async (title: string) => {
    const { currentUser } = get();
    console.log('createBoard - currentUser:', currentUser);
    if (!currentUser) {
      console.error('No current user when creating board');
      return null;
    }

    try {
      const newBoardId = id();
      const boardData = {
        id: newBoardId,
        title,
        userId: currentUser.id,
        createdAt: now(),
        updatedAt: now(),
        sharedWith: [],
        columns: [],
      };
      console.log('Creating board with data:', boardData);

      await db.transact([
        db.tx.boards[newBoardId].update(boardData),
      ]);

      console.log('Board created successfully');
      return convertBoardTimestamps(boardData as unknown as Board);
    } catch (error) {
      console.error('Failed to create board:', error);
      set({ error: 'Failed to create board' });
      return null;
    }
  },

  updateBoard: async (boardId: string, data: Partial<Board>) => {
    try {
      await db.transact([
        db.tx.boards[boardId].update({
          ...data,
          updatedAt: now(),
        }),
      ]);
    } catch (error) {
      set({ error: 'Failed to update board' });
    }
  },

  deleteBoard: async (boardId: string) => {
    try {
      await db.transact([db.tx.boards[boardId].delete()]);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== boardId),
        currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
      }));
    } catch (error) {
      set({ error: 'Failed to delete board' });
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
      const existingColumns = currentBoard.columns || [];
      const newColumn = {
        id: columnId,
        title,
        color,
        order: existingColumns.length,
        cards: [],
        userId: currentUser.id,
        sharedWith: [],
        createdAt: now(),
        updatedAt: now(),
      };

      const updatedColumns = [...existingColumns, newColumn];

      await db.transact([
        db.tx.boards[currentBoard.id].update({
          columns: updatedColumns,
          updatedAt: now(),
        }),
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
      const existingColumns = currentBoard.columns || [];
      const columns = existingColumns.map((col) =>
        col.id === columnId ? { ...col, ...updates, updatedAt: now() } : col
      );

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
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
      const existingColumns = currentBoard.columns || [];
      const columns = existingColumns.filter((col) => col.id !== columnId);

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
      ]);
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
      const existingColumns = currentBoard.columns || [];
      const column = existingColumns.find((c) => c.id === columnId);
      if (!column) {
        console.error('createCard: Column not found', columnId);
        return;
      }

      const cardId = id();
      const existingCards = column.cards || [];
      const newCard = {
        id: cardId,
        columnId,
        title,
        labels: [],
        priority: 'medium' as const,
        order: existingCards.length,
        userId: currentUser.id,
        sharedWith: [],
        createdAt: now(),
        updatedAt: now(),
      };

      const columns = existingColumns.map((col) =>
        col.id === columnId
          ? { ...col, cards: [...existingCards, newCard], updatedAt: now() }
          : col
      );

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
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
      const columns = currentBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.map((card) =>
          card.id === cardId ? { ...card, ...updates, updatedAt: now() } : card
        ),
      }));

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to update card' });
    }
  },

  deleteCard: async (cardId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const columns = currentBoard.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => card.id !== cardId),
      }));

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
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

      // Work with copies to avoid mutation issues
      const fromCards = [...fromColumn.cards];
      const cardIndex = fromCards.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        console.error('moveCard: Card not found in source column', cardId);
        return;
      }

      const movedCard = { ...fromCards[cardIndex] };
      movedCard.columnId = toColumnId;

      let destCards: typeof fromCards;
      
      if (fromColumnId === toColumnId) {
        // Moving within the same column
        destCards = [...fromCards];
        // Remove the card from its current position
        destCards.splice(cardIndex, 1);
        // Adjust the target index if we removed a card before the target position
        const adjustedIndex = cardIndex < newIndex ? newIndex - 1 : newIndex;
        // Insert at the new position
        destCards.splice(adjustedIndex, 0, movedCard);
      } else {
        // Moving to a different column
        destCards = [...toColumn.cards];
        destCards.splice(newIndex, 0, movedCard);
      }

      // Update order property for all cards
      const destCardsWithOrder = destCards.map((card, index) => ({
        ...card,
        order: index,
        updatedAt: now(),
      }));

      const columns = currentBoard.columns.map((col) => {
        if (col.id === fromColumnId && fromColumnId !== toColumnId) {
          // Update source column (removed card)
          const updatedFromCards = fromCards
            .filter((c) => c.id !== cardId)
            .map((card, index) => ({
              ...card,
              order: index,
              updatedAt: now(),
            }));
          return { ...col, cards: updatedFromCards, updatedAt: now() };
        }
        if (col.id === toColumnId) {
          // Update destination column (added card)
          return { ...col, cards: destCardsWithOrder, updatedAt: now() };
        }
        return col;
      });

      await db.transact([
        db.tx.boards[currentBoard.id].update({ columns, updatedAt: now() }),
      ]);
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

      // Update order property for all columns to match their new positions
      const columnsWithUpdatedOrder = columns.map((col, index) => ({
        ...col,
        order: index,
        updatedAt: now(),
      }));

      await db.transact([
        db.tx.boards[currentBoard.id].update({ 
          columns: columnsWithUpdatedOrder, 
          updatedAt: now() 
        }),
      ]);
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
      await db.transact([db.tx.labels[labelId].update(data)]);
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
      const columns = currentBoard.columns.map((col) => {
        if (col.id === columnId) {
          const sharedWith = [...(col.sharedWith || [])];
          const existingIndex = sharedWith.findIndex((s) => s.userId === userId);

          if (existingIndex !== -1) {
            sharedWith[existingIndex].permission = permission;
          } else {
            sharedWith.push({ userId, permission });
          }

          return { ...col, sharedWith, updatedAt: now() };
        }
        return col;
      });

      await db.transact([
        db.tx.boards[boardId].update({ columns, updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to share column' });
    }
  },

  unshareColumn: async (boardId: string, columnId: string, userId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const columns = currentBoard.columns.map((col) => {
        if (col.id === columnId) {
          const sharedWith = (col.sharedWith || []).filter((s) => s.userId !== userId);
          return { ...col, sharedWith, updatedAt: now() };
        }
        return col;
      });

      await db.transact([
        db.tx.boards[boardId].update({ columns, updatedAt: now() }),
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
      const columns = currentBoard.columns.map((col) => {
        if (col.id === columnId) {
          const cards = col.cards.map((card) => {
            if (card.id === cardId) {
              const sharedWith = [...(card.sharedWith || [])];
              const existingIndex = sharedWith.findIndex((s) => s.userId === userId);

              if (existingIndex !== -1) {
                sharedWith[existingIndex].permission = permission;
              } else {
                sharedWith.push({ userId, permission });
              }

              return { ...card, sharedWith, updatedAt: now() };
            }
            return card;
          });
          return { ...col, cards, updatedAt: now() };
        }
        return col;
      });

      await db.transact([
        db.tx.boards[boardId].update({ columns, updatedAt: now() }),
      ]);
    } catch (error) {
      set({ error: 'Failed to share card' });
    }
  },

  unshareCard: async (boardId: string, columnId: string, cardId: string, userId: string) => {
    const { currentBoard } = get();
    if (!currentBoard) return;

    try {
      const columns = currentBoard.columns.map((col) => {
        if (col.id === columnId) {
          const cards = col.cards.map((card) => {
            if (card.id === cardId) {
              const sharedWith = (card.sharedWith || []).filter((s) => s.userId !== userId);
              return { ...card, sharedWith, updatedAt: now() };
            }
            return card;
          });
          return { ...col, cards, updatedAt: now() };
        }
        return col;
      });

      await db.transact([
        db.tx.boards[boardId].update({ columns, updatedAt: now() }),
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
}));

// Helper hooks for querying data
export function useBoards() {
  const queryResult = db.useQuery({ boards: {} }) || {};
  
  // Check different possible structures
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const rawBoards = (result as { boards?: unknown[] })?.boards || [];
  const boards = rawBoards.map((b: unknown) => convertBoardTimestamps(b as Board));

  return { boards, isLoading, error };
}

export function useBoard(boardId: string) {
  const queryResult = db.useQuery({ boards: {} }) || {};
  
  // Check different possible structures (matching useBoards logic)
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const allBoards = (result as { boards?: Board[] })?.boards || [];
  const board = allBoards
    .filter((b): b is Board => b.id === boardId)
    .map(convertBoardTimestamps)[0] || null;

  return { board, isLoading, error };
}

export function useLabels() {
  const queryResult = db.useQuery({ labels: {} }) || {};
  
  // Check different possible structures (matching useBoards logic)
  const result = (queryResult as { data?: unknown })?.data || (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const rawLabels = (result as { labels?: Label[] })?.labels || [];
  const labels = rawLabels.map((l) => ({
    ...l,
    createdAt: toISOTimestamp(l.createdAt),
  }));
    
  return { labels, isLoading, error };
}

export function useUsers() {
  const queryResult = db.useQuery({ $users: {} }) || {};
  const result = (queryResult as { result?: unknown })?.result;
  const isLoading = (queryResult as { isLoading?: boolean })?.isLoading ?? true;
  const error = (queryResult as { error?: Error })?.error;

  const users = (result as { $users?: User[] })?.$users
    ? ((result as { $users: User[] }).$users as User[]).map((u) => ({
        ...u,
        createdAt: toISOTimestamp(u.createdAt),
      }))
    : [];

  return { users, isLoading, error };
}
