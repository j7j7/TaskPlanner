import { init } from '@instantdb/react';
import { i } from '@instantdb/core';

const schema = i.schema({
  entities: {
    // System users (InstantDB auth)
    $users: i.entity({
      username: i.string(),
      passwordHash: i.string().optional(),
      createdAt: i.number(),
    }),
    
    // User profiles (for sharing)
    users: i.entity({
      email: i.string().indexed(),
      username: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    
    // Boards namespace - top level entity
    boards: i.entity({
      title: i.string(),
      description: i.string().optional(),
      userId: i.string().indexed(), // Owner - indexed for efficient queries
      order: i.number(), // For sorting boards for each user
      createdAt: i.number(),
      updatedAt: i.number(),
      sharedWith: i.any(), // Array of { userId, permission }
    }),
    
    // Columns namespace - linked to boards via boardId
    columns: i.entity({
      boardId: i.string().indexed(), // Foreign key to boards - indexed for efficient queries
      title: i.string(),
      color: i.string(),
      order: i.number(), // For sorting within board
      userId: i.string().indexed(), // Owner - indexed for efficient queries
      createdAt: i.number(),
      updatedAt: i.number(),
      sharedWith: i.any(), // Array of { userId, permission }
    }),
    
    // Cards namespace - linked to columns via columnId, also denormalized boardId for queries
    cards: i.entity({
      columnId: i.string().indexed(), // Foreign key to columns - indexed for efficient queries
      boardId: i.string().indexed(), // Denormalized foreign key to boards for efficient board-level queries
      title: i.string(),
      description: i.string().optional(),
      labels: i.any(), // Array of label IDs
      priority: i.string(), // 'low' | 'medium' | 'high' | 'urgent'
      dueDate: i.string().optional(),
      assignee: i.string().optional(),
      icon: i.string().optional(),
      order: i.number(), // For sorting within column
      userId: i.string().indexed(), // Owner - indexed for efficient queries
      createdAt: i.number(),
      updatedAt: i.number(),
      sharedWith: i.any(), // Array of { userId, permission }
    }),
    
    // Labels namespace - user-specific
    labels: i.entity({
      name: i.string(),
      color: i.string(),
      userId: i.string().indexed(), // Owner - indexed for efficient queries
      createdAt: i.number(),
    }),
  },
});

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID;

if (!APP_ID || APP_ID === 'your_app_id_here') {
  console.warn('VITE_INSTANT_APP_ID must be set in .env for InstantDB to work');
}

export const db = init({
  appId: APP_ID,
  schema,
  devtool: true,
});

export default db;
