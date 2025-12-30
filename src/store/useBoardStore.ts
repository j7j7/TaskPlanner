import { create } from 'zustand';
import type { Board, Column, Card, Label, User, SharePermission } from '../types';
import { api } from '../utils/api';

function generateShortId() {
  return Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
}

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  labels: Label[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  
  fetchBoards: () => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  fetchLabels: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  createBoard: (title: string) => Promise<Board | null>;
  updateBoard: (id: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  createColumn: (title: string, color: string) => Promise<void>;
  updateColumn: (columnId: string, updates: { title?: string; color?: string }) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  createCard: (columnId: string, title: string) => Promise<void>;
  updateCard: (cardId: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  moveColumn: (columnId: string, newIndex: number) => void;
  createLabel: (name: string, color: string) => Promise<void>;
  updateLabel: (id: string, data: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  shareBoard: (boardId: string, userId: string, permission?: SharePermission) => Promise<void>;
  unshareBoard: (boardId: string, userId: string) => Promise<void>;
  updateBoardPermission: (boardId: string, userId: string, permission: SharePermission) => Promise<void>;
  shareColumn: (boardId: string, columnId: string, userId: string, permission?: SharePermission) => Promise<void>;
  unshareColumn: (boardId: string, columnId: string, userId: string) => Promise<void>;
  updateColumnPermission: (boardId: string, columnId: string, userId: string, permission: SharePermission) => Promise<void>;
  shareCard: (boardId: string, columnId: string, cardId: string, userId: string, permission?: SharePermission) => Promise<void>;
  unshareCard: (boardId: string, columnId: string, cardId: string, userId: string) => Promise<void>;
  updateCardPermission: (boardId: string, columnId: string, cardId: string, userId: string, permission: SharePermission) => Promise<void>;
  clearError: () => void;
  clearCurrentBoard: () => void;
}

function ensureColumns(board: Board): Board {
  return {
    ...board,
    sharedWith: board.sharedWith || [],
    columns: board.columns?.map(col => ({
      ...col,
      userId: col.userId || board.userId,
      sharedWith: col.sharedWith || [],
      cards: (col.cards || []).map(card => ({
        ...card,
        userId: card.userId || col.userId || board.userId,
        sharedWith: card.sharedWith || [],
      })),
    })) || [],
  };
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  labels: [],
  users: [],
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const { boards } = await api.boards.getAll();
      const normalizedBoards = boards.map(ensureColumns);
      set({ boards: normalizedBoards, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchBoard: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { board, labels } = await api.boards.get(id);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => {
        const existingBoardIndex = state.boards.findIndex(b => b.id === id);
        const newBoards = [...state.boards];
        
        if (existingBoardIndex !== -1) {
          newBoards[existingBoardIndex] = normalizedBoard;
        } else {
          newBoards.push(normalizedBoard);
        }
        
        return {
          currentBoard: normalizedBoard,
          labels,
          boards: newBoards,
          isLoading: false,
        };
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchLabels: async () => {
    try {
      const { labels } = await api.labels.getAll();
      set({ labels });
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  },

  fetchUsers: async () => {
    try {
      const { users } = await api.users.getAll();
      set({ users });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  },

  createBoard: async (title: string) => {
    try {
      const { board } = await api.boards.create(title);
      const normalizedBoard = ensureColumns(board);
      set((state) => ({ 
        boards: [...state.boards, normalizedBoard],
        currentBoard: normalizedBoard,
      }));
      return normalizedBoard;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateBoard: async (id: string, data: Partial<Board>) => {
    try {
      const { board } = await api.boards.update(id, data);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === id ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteBoard: async (id: string) => {
    try {
      await api.boards.delete(id);
      set((state) => ({
        boards: state.boards.filter((b) => b.id !== id),
        currentBoard: state.currentBoard?.id === id ? null : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createColumn: async (title: string, color: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const newColumn: Column = {
      id: generateShortId(),
      title,
      color,
      order: columns.length,
      cards: [],
      userId: board.userId,
      sharedWith: [],
    };

    const updatedColumns = [...columns, newColumn];

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateColumn: async (columnId: string, updates: { title?: string; color?: string }) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, ...updates } : col
    );

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteColumn: async (columnId: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const updatedColumns = columns.filter((col) => col.id !== columnId);

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createCard: async (columnId: string, title: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const newCard: Card = {
      id: generateShortId(),
      columnId,
      title,
      labels: [],
      priority: 'medium',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: board.userId,
      sharedWith: [],
    };

    const updatedColumns = columns.map((col) =>
      col.id === columnId
        ? { ...col, cards: [newCard, ...(col.cards || [])] }
        : col
    );

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateCard: async (cardId: string, updates: Partial<Card>) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const updatedColumns = columns.map((col) => ({
      ...col,
      cards: (col.cards || []).map((card) =>
        card.id === cardId ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
      ),
    }));

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteCard: async (cardId: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    const updatedColumns = columns.map((col) => ({
      ...col,
      cards: (col.cards || []).filter((card) => card.id !== cardId),
    }));

    try {
      const { board: updatedBoard } = await api.boards.update(board.id, { columns: updatedColumns });
      const normalizedBoard = ensureColumns(updatedBoard);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
        currentBoard: normalizedBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns || [];
    let movedCard: Card | null = null;

    const updatedColumns = columns.map((col) => {
      if (col.id === fromColumnId) {
        const cards = col.cards || [];
        const cardIndex = cards.findIndex((c) => c.id === cardId);
        if (cardIndex !== -1) {
          movedCard = { ...cards[cardIndex], columnId: toColumnId, order: newIndex };
          return {
            ...col,
            cards: cards.filter((c) => c.id !== cardId),
          };
        }
      }
      return col;
    });

    if (!movedCard) return;

    const finalColumns = updatedColumns.map((col) => {
      if (col.id === toColumnId && movedCard) {
        const cards = col.cards || [];
        const newCards = [...cards];
        newCards.splice(newIndex, 0, movedCard);
        return { ...col, cards: newCards };
      }
      return col;
    });

    const updatedBoard = { ...board, columns: finalColumns, updatedAt: new Date().toISOString() };
    const normalizedBoard = ensureColumns(updatedBoard);

    set((state) => ({
      boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
      currentBoard: normalizedBoard,
    }));

    api.boards.update(board.id, { columns: finalColumns }).catch((error) => {
      console.error('Failed to persist card move:', error);
      get().fetchBoard(board.id);
    });
  },

  moveColumn: (columnId: string, newIndex: number) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = [...(board.columns || [])];
    const oldIndex = columns.findIndex((c) => c.id === columnId);
    if (oldIndex === -1) return;

    const [removed] = columns.splice(oldIndex, 1);
    columns.splice(newIndex, 0, removed);

    const updatedColumns = columns.map((col, index) => ({ ...col, order: index }));
    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    const normalizedBoard = ensureColumns(updatedBoard);

    set((state) => ({
      boards: state.boards.map((b) => (b.id === board.id ? normalizedBoard : b)),
      currentBoard: normalizedBoard,
    }));

    api.boards.update(board.id, { columns: updatedColumns }).catch((error) => {
      console.error('Failed to persist column move:', error);
      get().fetchBoard(board.id);
    });
  },

  shareBoard: async (boardId: string, userId: string, permission?: SharePermission) => {
    try {
      const { board } = await api.boards.share(boardId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unshareBoard: async (boardId: string, userId: string) => {
    try {
      const { board } = await api.boards.unshare(boardId, userId);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateBoardPermission: async (boardId: string, userId: string, permission: SharePermission) => {
    try {
      const { board } = await api.boards.updatePermission(boardId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  shareColumn: async (boardId: string, columnId: string, userId: string, permission?: SharePermission) => {
    try {
      const { board } = await api.boards.shareColumn(boardId, columnId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unshareColumn: async (boardId: string, columnId: string, userId: string) => {
    try {
      const { board } = await api.boards.unshareColumn(boardId, columnId, userId);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateColumnPermission: async (boardId: string, columnId: string, userId: string, permission: SharePermission) => {
    try {
      const { board } = await api.boards.updateColumnPermission(boardId, columnId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  shareCard: async (boardId: string, columnId: string, cardId: string, userId: string, permission?: SharePermission) => {
    try {
      const { board } = await api.boards.shareCard(boardId, columnId, cardId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unshareCard: async (boardId: string, columnId: string, cardId: string, userId: string) => {
    try {
      const { board } = await api.boards.unshareCard(boardId, columnId, cardId, userId);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateCardPermission: async (boardId: string, columnId: string, cardId: string, userId: string, permission: SharePermission) => {
    try {
      const { board } = await api.boards.updateCardPermission(boardId, columnId, cardId, userId, permission);
      const normalizedBoard = ensureColumns(board);
      
      set((state) => ({
        boards: state.boards.map((b) => (b.id === boardId ? normalizedBoard : b)),
        currentBoard: state.currentBoard?.id === boardId ? normalizedBoard : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createLabel: async (name: string, color: string) => {
    try {
      const { label } = await api.labels.create(name, color);
      set((state) => ({ labels: [...state.labels, label] }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateLabel: async (id: string, data: Partial<Label>) => {
    try {
      const { label } = await api.labels.update(id, data);
      set((state) => ({
        labels: state.labels.map((l) => (l.id === id ? label : l)),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteLabel: async (id: string) => {
    try {
      await api.labels.delete(id);
      set((state) => ({
        labels: state.labels.filter((l) => l.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  
  clearCurrentBoard: () => set({ currentBoard: null }),
}));
