# Database Schema Structure

## Overview

The database uses a **normalized structure** with separate entities for boards, columns, and cards. This prevents data conflicts when multiple users edit simultaneously.

## Entity Structure

### 1. **boards** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: None (top-level entity)
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `createdAt`, `updatedAt`

### 2. **columns** Entity  
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**: 
  - `boardId` (indexed) → links to `boards.id`
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `color`, `order`, `createdAt`, `updatedAt`

### 3. **cards** Entity
- **Primary Key**: `id`
- **Owner**: `userId` (indexed)
- **Relationships**:
  - `columnId` (indexed) → links to `columns.id`
  - `boardId` (indexed) → links to `boards.id` (denormalized for efficient queries)
- **Sharing**: `sharedWith` array
- **Fields**: `title`, `description`, `labels`, `priority`, `dueDate`, `assignee`, `icon`, `order`, `createdAt`, `updatedAt`

## Relationship Diagram

```
boards (id, userId, sharedWith)
  └── columns (id, boardId, userId, sharedWith)
        └── cards (id, columnId, boardId, userId, sharedWith)
```

## Key Benefits

1. **No Data Conflicts**: When User A edits Card 1 and User B edits Card 2 simultaneously, they update different entities - no overwrites
2. **Efficient Queries**: Indexed foreign keys (`boardId`, `columnId`) enable fast lookups
3. **Granular Updates**: Only changed entities are updated, not entire boards
4. **Real-time Sync**: InstantDB syncs individual entity changes efficiently

## Ownership & Sharing

### Ownership Hierarchy
- **Board Owner** (`boards.userId`): Has full access to all columns and cards in the board
- **Column Owner** (`columns.userId`): Has full access to all cards in the column
- **Card Owner** (`cards.userId`): Has full access to the specific card

### Sharing Rules
- Each entity (board/column/card) has its own `sharedWith` array
- Sharing is independent at each level
- Users can be shared with `read` or `write` permissions
- Board owners automatically see all columns/cards (even if not explicitly shared)

## Query Pattern

The query hooks (`useBoards()`, `useBoard()`) follow this pattern:

1. **Query all entities separately**:
   ```typescript
   const boardsQuery = db.useQuery({ boards: {} });
   const columnsQuery = db.useQuery({ columns: {} });
   const cardsQuery = db.useQuery({ cards: {} });
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

## Data Consistency

- **Cascading Deletes**: Deleting a board deletes all its columns and cards
- **Foreign Key Integrity**: `columnId` and `boardId` are always kept in sync
- **Denormalization**: Cards store `boardId` for efficient board-level queries (even though it can be derived from `columnId`)

## Migration Notes

When migrating from nested structure:
1. Extract all columns from `boards.columns` array → create `columns` entities
2. Extract all cards from `columns.cards` arrays → create `cards` entities
3. Ensure `boardId` and `columnId` are set correctly
4. Preserve `userId` and `sharedWith` arrays

