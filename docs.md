# TaskPlanner App Documentation

## Overview

TaskPlanner is a Kanban-style task management application with board sharing capabilities. Built with React, TypeScript, Express, and JSON file storage.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Zustand (state management), @dnd-kit (drag and drop), TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: JSON files (no external DB)
- **Authentication**: Session-based with bcrypt password hashing

## Data Structure

### User
```typescript
interface User {
  id: string;           // UUID
  username: string;
  createdAt: string;    // ISO timestamp
}
```

### SharedUser
```typescript
interface SharedUser {
  userId: string;       // User ID
  permission: 'read' | 'write';
}
```

### Board
```typescript
interface Board {
  id: string;           // 22-char random string
  userId: string;       // Owner user ID
  title: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
  sharedWith: SharedUser[];  // Array of { userId, permission }
}
```

### Column
```typescript
interface Column {
  id: string;
  title: string;
  color: string;        // Hex color (e.g., "#8b5cf6")
  order: number;        // Display order
  cards: Card[];
  userId: string;       // Inherited from board if null
  sharedWith: SharedUser[];  // Array of { userId, permission }
}
```

### Card
```typescript
interface Card {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  labels: string[];     // Array of label IDs
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  userId: string;       // Inherited from column/board if null
  sharedWith: SharedUser[];  // Array of { userId, permission }
}
```

### Label
```typescript
interface Label {
  id: string;
  name: string;
  color: string;    // Hex color
  userId: string;   // 'default' for global labels
}
```

## Tree Structure

```
todo/
├── data/                          # JSON data storage
│   ├── boards.json               # Boards, columns, cards
│   ├── users.json               # Users (no password hash in frontend)
│   ├── sessions.json            # Active sessions
│   └── labels.json              # User labels
├── server/                       # Backend
│   ├── index.js                 # Express app setup
│   ├── auth.js                  # Auth logic (register, login, sessions)
│   ├── store.js                 # Data access layer
│   └── routes/
│       ├── auth.js              # /api/auth/* endpoints
│       ├── boards.js            # /api/boards/* endpoints
│       ├── users.js             # /api/users endpoint
│       └── labels.js            # /api/labels/* endpoints
├── src/                         # Frontend
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   ├── types/index.ts           # TypeScript interfaces
│   ├── utils/api.ts             # API client
│   ├── store/
│   │   └── useBoardStore.ts     # Zustand state store
│   ├── components/
│   │   ├── auth/               # Auth components
│   │   ├── board/              # Board, Column, Card
│   │   ├── layout/             # Layout, Sidebar
│   │   └── ui/                 # Reusable UI (Button, Input, Modal, UserSelector)
│   ├── hooks/
│   │   └── useAuth.ts          # Auth hook
│   └── pages/                   # Page components
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── start.sh                     # Dev server launcher
```

## Authentication Flow

### Registration
1. User submits username/password
2. Server hashes password with bcrypt (10 rounds)
3. Creates user record and session
4. Returns user object (no password hash) + sets session cookie

### Login
1. User submits username/password
2. Server finds user by username
3. Verifies password with bcrypt.compare
4. Creates new session, returns user + sets cookie

### Session Management
- Sessions stored in `data/sessions.json`
- Token: UUID v4
- Expiry: 7 days from creation
- Cookie: `kanban_session` (httpOnly, secure in production)

### Protected Routes
All API routes (except auth) require valid session cookie.
Middleware validates token, retrieves session, attaches `userId` to request.

## Key Backend Functions

### boardsDb (server/store.js)

| Function | Description |
|----------|-------------|
| `getAll()` | Returns boards with migration applied |
| `findById(id)` | Returns single board by ID |
| `findByUserId(userId)` | Returns boards owned or shared with user |
| `create(board)` | Creates new board with structure validation |
| `update(id, data)` | Updates board title/columns |
| `delete(id)` | Deletes board |
| `shareBoard(boardId, userId, permission)` | Shares board with permission |
| `updateBoardPermission(boardId, userId, permission)` | Updates share permission |
| `unshareBoard(boardId, userId)` | Removes user from sharedWith |
| `shareColumn(boardId, columnId, userId, permission)` | Shares column |
| `updateColumnPermission(boardId, columnId, userId, permission)` | Updates column permission |
| `unshareColumn(boardId, columnId, userId)` | Unshares column |
| `shareCard(boardId, columnId, cardId, userId, permission)` | Shares card |
| `updateCardPermission(boardId, columnId, cardId, userId, permission)` | Updates card permission |
| `unshareCard(boardId, columnId, cardId, userId)` | Unshares card |

### Data Migration (server/store.js:85-103)

`migrateBoards()` ensures backward compatibility:
- Adds `userId` (inherits from parent if null)
- Adds `sharedWith` (empty array if null, or migrates string[] to SharedUser[])
- Recursively processes columns and cards

### Permission Checking (server/routes/boards.js)

| Function | Description |
|----------|-------------|
| `hasReadAccess(item, userId)` | Check if user has read access |
| `hasWriteAccess(item, userId)` | Check if user has write access |

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| POST | /api/auth/logout | Logout | Yes |
| GET | /api/auth/me | Get current user | Yes |
| GET | /api/users | List all users | Yes |
| GET | /api/boards | List user's boards | Yes |
| POST | /api/boards | Create board | Yes |
| GET | /api/boards/:id | Get single board | Yes |
| PUT | /api/boards/:id | Update board | Yes (owner/write) |
| DELETE | /api/boards/:id | Delete board | Yes (owner) |
| PUT | /api/boards/:id/share | Share board | Yes (owner) |
| PUT | /api/boards/:id/share/:userId/permission | Update permission | Yes (owner) |
| DELETE | /api/boards/:id/share/:userId | Unshare board | Yes (owner) |
| PUT | /api/boards/:id/columns/:columnId/share | Share column | Yes |
| PUT | /api/boards/:id/columns/:columnId/share/:userId/permission | Update column permission | Yes |
| DELETE | /api/boards/:id/columns/:columnId/share/:userId | Unshare column | Yes |
| PUT | /api/boards/:id/columns/:columnId/cards/:cardId/share | Share card | Yes |
| PUT | /api/boards/:id/columns/:columnId/cards/:cardId/share/:userId/permission | Update card permission | Yes |
| DELETE | /api/boards/:id/columns/:columnId/cards/:cardId/share/:userId | Unshare card | Yes |
| GET | /api/labels | List labels | Yes |
| POST | /api/labels | Create label | Yes |
| PUT | /api/labels/:id | Update label | Yes |
| DELETE | /api/labels/:id | Delete label | Yes |

## Key Frontend Functions

### useBoardStore (Zustand)

| Function | Description |
|----------|-------------|
| `fetchBoards()` | Loads all accessible boards |
| `fetchBoard(id)` | Loads single board with labels |
| `fetchLabels()` | Loads user labels |
| `fetchUsers()` | Loads all users for sharing |
| `createBoard(title)` | Creates new board |
| `updateBoard(id, data)` | Updates board |
| `deleteBoard(id)` | Deletes board |
| `createColumn(title, color)` | Adds column to current board |
| `updateColumn(id, updates)` | Updates column title/color |
| `deleteColumn(id)` | Removes column |
| `createCard(columnId, title)` | Adds card to column |
| `updateCard(id, updates)` | Updates card |
| `deleteCard(id)` | Removes card |
| `moveCard(id, fromCol, toCol, index)` | Moves card (drag-drop) |
| `moveColumn(id, newIndex)` | Reorders column |
| `shareBoard(boardId, userId, permission?)` | Shares board |
| `updateBoardPermission(boardId, userId, permission)` | Updates permission |
| `unshareBoard(boardId, userId)` | Unshares board |
| `shareColumn(boardId, colId, userId, permission?)` | Shares column |
| `updateColumnPermission(boardId, colId, userId, permission)` | Updates permission |
| `unshareColumn(boardId, colId, userId)` | Unshares column |
| `shareCard(boardId, colId, cardId, userId, permission?)` | Shares card |
| `updateCardPermission(boardId, colId, cardId, userId, permission)` | Updates permission |
| `unshareCard(boardId, colId, cardId, userId)` | Unshares card |
| `createLabel(name, color)` | Creates label |
| `updateLabel(id, data)` | Updates label |
| `deleteLabel(id)` | Deletes label |

### State Structure

```typescript
interface BoardState {
  boards: Board[];           // All accessible boards
  currentBoard: Board | null; // Currently viewed board
  labels: Label[];           // User's labels
  users: User[];             // All users (for sharing)
  isLoading: boolean;
  error: string | null;
}
```

### Component Hierarchy

```
App
├── ProtectedRoute (auth check)
│   └── Layout
│       ├── Sidebar (board list, create board, logout, share board)
│       └── Routes
│           ├── HomePage (board list)
│           ├── BoardPage
│           │   └── Board (DndContext)
│           │       ├── Column (Sortable)
│           │       │   └── Card (Sortable)
│           │       └── DragOverlay
│           ├── LoginPage
│           └── RegisterPage
└── CardModal (overlay for card editing)
```

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `UserSelector` | `src/components/ui/UserSelector.tsx` | Share modal with permission dropdown |
| `CardModal` | `src/components/board/CardModal.tsx` | Card edit modal (readOnly mode) |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Board sharing UI |

## Sharing Model

### Permission Levels

1. **Read**: View-only access
   - Can view board/column/card details
   - Cannot edit, move, or add items
   - See "readOnly" UI state in card modal

2. **Write**: Edit access
   - Can edit details
   - Can move cards between columns
   - Can add new cards
   - Cannot delete or share

### Owner Privileges (Only Owner Can)

- Delete items
- Share/unshare
- Change permission levels

### Sharing UI

- **Share button**: Appears on boards, columns, cards (owner only)
- **UserSelector modal**: Shows all users with avatar initials
- **Permission dropdown**: Read/Write toggle with icons (👁️ / ✏️)
- **Owner indicator**: Avatar in board header for shared boards (hover shows "Username (Owner)")
- **Permission badges**: Small icons next to avatars in column/card headers

## ID Generation

- **Short IDs**: 22 chars (36 charset: `a-z0-9`)
  - Used for: boards, columns, cards
  - Format: `Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11)`

- **UUID v4**: Standard UUID format
  - Used for: users, sessions

## Running the App

```bash
# Start both servers (cleans Vite cache)
./start.sh

# Or manually:
# Terminal 1: Backend
node server/index.js  # Runs on port 3001

# Terminal 2: Frontend
npm run dev           # Runs on port 5173
```

## Troubleshooting

### 500 Error on Load
- Delete Vite cache: `rm -rf node_modules/.vite`
- Restart with `./start.sh`

### Changes Not Reflecting
- Check `server/store.js` migration function is called in read operations
- Verify `data/boards.json` has correct structure

### Auth Issues
- Clear cookies: `document.cookie.split(";").forEach(c => document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"))`

### Shared Board Shows "Unknown" for Owner
- Ensure `fetchUsers()` is called when opening share modal
- Check `getUserDisplay()` fallback logic for current user

### Font Changes During Drag
- Fixed by using system fonts instead of custom web fonts
- Set `-webkit-font-smoothing: subpixel-antialiased` during drag operations
