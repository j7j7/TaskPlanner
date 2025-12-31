export type SharePermission = 'read' | 'write';

export interface SharedUser {
  userId: string;
  permission: SharePermission;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface Card {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description?: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  sharedWith: SharedUser[];
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  color: string;
  order: number;
  cards: Card[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  sharedWith: SharedUser[];
}

export interface Board {
  id: string;
  userId: string;
  title: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
  sharedWith: SharedUser[];
}

export interface ApiError {
  error: string;
}
