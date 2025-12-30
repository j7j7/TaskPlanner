import { init } from '@instantdb/react';
import { i } from '@instantdb/core';

const schema = i.schema({
  entities: {
    $users: i.entity({
      username: i.string(),
      passwordHash: i.string().optional(),
      createdAt: i.number(),
    }),
    boards: i.entity({
      title: i.string(),
      userId: i.string().indexed(),
      createdAt: i.number(),
      updatedAt: i.number(),
      sharedWith: i.any(),
      columns: i.any(),
    }),
    labels: i.entity({
      name: i.string(),
      color: i.string(),
      userId: i.string().indexed(),
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
