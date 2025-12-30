import { create } from 'zustand';
import type { Board, Column, Card, Label } from '../types';
import { api } from '../utils/api';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  labels: Label[];
  isLoading: boolean;
  error: string | null;
  
  fetchBoards: () => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  fetchLabels: () => Promise<void>;
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
  clearError: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  labels: [],
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ isLoading: true, error: null });
    try {
      const { boards } = await api.boards.getAll();
      set({ boards, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchBoard: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { board, labels } = await api.boards.get(id);
      set({ currentBoard: board, labels, isLoading: false });
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

  createBoard: async (title: string) => {
    try {
      const { board } = await api.boards.create(title);
      set((state) => ({ boards: [...state.boards, board] }));
      return board;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateBoard: async (id: string, data: Partial<Board>) => {
    try {
      const { board } = await api.boards.update(id, data);
      set((state) => ({
        boards: state.boards.map((b) => (b.id === id ? board : b)),
        currentBoard: state.currentBoard?.id === id 
          ? { ...board, columns: board.columns ?? state.currentBoard.columns }
          : state.currentBoard,
      }));
    } catch (error) {
      set({ error: (error as Error).message });
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
    }
  },

  createColumn: async (title: string, color: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      title,
      color,
      order: columns.length,
      cards: [],
    };

    const updatedBoard = {
      ...board,
      columns: [...columns, newColumn],
      updatedAt: new Date().toISOString(),
    };

    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedBoard.columns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  updateColumn: async (columnId: string, updates: { title?: string; color?: string }) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const updatedColumns = columns.map((col) =>
      col.id === columnId ? { ...col, ...updates } : col
    );

    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedColumns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  deleteColumn: async (columnId: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const updatedColumns = columns.filter((col) => col.id !== columnId);

    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedColumns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  createCard: async (columnId: string, title: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const newCard: Card = {
      id: `card-${Date.now()}`,
      columnId,
      title,
      labels: [],
      priority: 'medium',
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedColumns = columns.map((col) =>
      col.id === columnId
        ? { ...col, cards: [newCard, ...(col.cards ?? [])] }
        : col
    );

    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedColumns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  updateCard: async (cardId: string, updates: Partial<Card>) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const updatedColumns = columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).map((card) =>
        card.id === cardId ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
      ),
    }));

    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedColumns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  deleteCard: async (cardId: string) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    const updatedColumns = columns.map((col) => ({
      ...col,
      cards: (col.cards ?? []).filter((card) => card.id !== cardId),
    }));

    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });

    try {
      await api.boards.update(board.id, { columns: updatedColumns });
    } catch (error) {
      set({ error: (error as Error).message });
      get().fetchBoard(board.id);
    }
  },

  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = board.columns ?? [];
    let movedCard: Card | null = null;

    const updatedColumns = columns.map((col) => {
      if (col.id === fromColumnId) {
        const cards = col.cards ?? [];
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
        const cards = col.cards ?? [];
        const newCards = [...cards];
        newCards.splice(newIndex, 0, movedCard);
        return { ...col, cards: newCards };
      }
      return col;
    });

    const updatedBoard = { ...board, columns: finalColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });
  },

  moveColumn: (columnId: string, newIndex: number) => {
    const board = get().currentBoard;
    if (!board) return;

    const columns = [...(board.columns ?? [])];
    const oldIndex = columns.findIndex((c) => c.id === columnId);
    if (oldIndex === -1) return;

    const [removed] = columns.splice(oldIndex, 1);
    columns.splice(newIndex, 0, removed);

    const updatedColumns = columns.map((col, index) => ({ ...col, order: index }));
    const updatedBoard = { ...board, columns: updatedColumns, updatedAt: new Date().toISOString() };
    set({ currentBoard: updatedBoard });
  },

  createLabel: async (name: string, color: string) => {
    try {
      const { label } = await api.labels.create(name, color);
      set((state) => ({ labels: [...state.labels, label] }));
    } catch (error) {
      set({ error: (error as Error).message });
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
    }
  },

  clearError: () => set({ error: null }),
}));
