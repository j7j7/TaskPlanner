export interface User {
  id: string;
  username: string;
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
  title: string;
  description?: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  order: number;
  cards: Card[];
}

export interface Board {
  id: string;
  userId: string;
  title: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
}

export interface LoginResponse {
  user: User;
}

export interface RegisterResponse {
  user: User;
}

export interface BoardsResponse {
  boards: Board[];
}

export interface BoardResponse {
  board: Board;
  labels: Label[];
}

export interface LabelResponse {
  label: Label;
}

export interface LabelsResponse {
  labels: Label[];
}

export interface SuccessResponse {
  success: boolean;
}
