# Database Schema Structure

## Overview

The database uses a **normalized structure** with separate entities for boards, columns, cards, and labels. This prevents data conflicts when multiple users edit simultaneously.

## Entity Structure

### 1. **$users** Entity (System)
- **Primary Key**: `id` (InstantDB auto-generated)
- **Fields**: `username`, `passwordHash`, `createdAt`

### 2. **users** Entity (User Profiles)
- **Primary Key**: `id`
- **Indexed Fields**: `email`
- **Fields**: `username`, `createdAt`, `updatedAt`

### 3. **boards** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: None (top-level entity)
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `createdAt`, `updatedAt`

### 4. **columns** Entity  
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: 
  - `boardId` (indexed) → links to `boards.id`
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `color`, `order`, `createdAt`, `updatedAt`

### 5. **cards** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**:
  - `columnId` (indexed) → links to `columns.id`
  - `boardId` (indexed) → links to `boards.id` (denormalized for efficient queries)
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `description` (optional), `labels`, `priority`, `dueDate` (optional), `assignee` (optional), `icon` (optional), `order`, `createdAt`, `updatedAt`

### 6. **labels** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: None (user-scoped)
- **Fields**: `name`, `color`, `createdAt`

### 7. **userPreferences** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: None (user-scoped)
- **Fields**: `dormantDays` (number of days before cards become dormant, default: 30), `createdAt`, `updatedAt`

## Relationship Diagram

```
$users (id, username, passwordHash)
  └── users (id, email, username, createdAt, updatedAt)
        └── boards (id, userId, title, sharedWith)
              └── columns (id, boardId, userId, title, color, order, sharedWith)
                    └── cards (id, columnId, boardId, userId, title, description, labels, priority, dueDate, assignee, icon, order, sharedWith)
labels (id, userId, name, color)
userPreferences (id, userId, dormantDays, createdAt, updatedAt)
```

## Key Benefits

1. **No Data Conflicts**: When User A edits Card 1 and User B edits Card 2 simultaneously, they update different entities - no overwrites
2. **Efficient Queries**: Indexed foreign keys (`boardId`, `columnId`, `email`) enable fast lookups
3. **Granular Updates**: Only changed entities are updated, not entire boards
4. **Real-time Sync**: InstantDB syncs individual entity changes efficiently
5. **User-Scoped Labels**: Labels are owned by users, not boards, allowing reuse across boards

## Ownership & Sharing

### Ownership Hierarchy
- **System User** (`$users.id`): Authenticated user account
- **User Profile** (`users.id`): Profile data linked to system user
- **Board Owner** (`boards.userId`): Has full access to all columns and cards in the board
- **Column Owner** (`columns.userId`): Has full access to all cards in the column
- **Card Owner** (`cards.userId`): Has full access to the specific card
- **Label Owner** (`labels.userId`): Owns the label for personal use

### Sharing Rules
- Each entity (board/column/card) has its own `sharedWith` array
- Sharing is independent at each level
- Users can be shared with `read` or `write` permissions
- Board owners automatically see all columns/cards (even if not explicitly shared)
- Labels are user-scoped and not shared (only visible to the owner)

## Query Pattern

The query hooks (`useBoards()`, `useBoard()`, `useLabels()`, `useUsers()`) follow this pattern:

1. **Query all entities separately**:
   ```typescript
   const boardsQuery = db.useQuery({ boards: {} });
   const columnsQuery = db.useQuery({ columns: {} });
   const cardsQuery = db.useQuery({ cards: {} });
   const labelsQuery = db.useQuery({ labels: {} });
   const usersQuery = db.useQuery({ users: {} });
   ```

2. **Join in memory**:
   - Filter columns by `boardId`
   - Filter cards by `columnId`
   - Sort by `order` fields
   - Reconstruct nested Board structure

3. **Filter by user access**:
   - Check board ownership/sharing
   - Filter columns by access
   - Filter cards by access
   - Filter labels by userId (labels are user-scoped)

## Data Consistency

- **Cascading Deletes**: Deleting a board deletes all its columns and cards
- **Foreign Key Integrity**: `columnId` and `boardId` are always kept in sync
- **Denormalization**: Cards store `boardId` for efficient board-level queries (even though it can be derived from `columnId`)
- **Labels**: Standalone entity owned by users, not affected by board/column/card operations

## Migration Notes

When migrating from nested structure:
1. Extract all columns from `boards.columns` array → create `columns` entities
2. Extract all cards from `columns.cards` arrays → create `cards` entities
3. Ensure `boardId` and `columnId` are set correctly
4. Preserve `userId` and `sharedWith` arrays
5. Labels are created separately per user and stored in the `labels` entity

