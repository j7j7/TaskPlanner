# Project Tree Structure

```
taskplanner/
├── .git/                     # Git version control
│   ├── branches/            # Git branches
│   ├── hooks/               # Git hooks
│   ├── logs/                # Git logs
│   └── objects/             # Git objects
├── .gitattributes           # Git attributes
├── .gitignore               # Git ignore rules
├── data/                    # Application data storage (JSON files)
│   ├── boards.json         # Board data (columns, cards)
│   ├── labels.json         # Label definitions
│   ├── sessions.json       # User sessions
│   └── users.json          # User accounts
├── dist/                    # Production build output
│   ├── index.html          # Compiled HTML
│   ├── vite.svg            # Favicon
│   └── assets/             # Compiled assets
│       ├── index-*.css     # Compiled CSS
│       └── index-*.js      # Compiled JavaScript
├── eslint.config.js         # ESLint configuration
├── index.html               # Main HTML entry point
├── package.json             # Project dependencies & scripts
├── package-lock.json        # Locked dependency versions
├── postcss.config.js        # PostCSS configuration
├── public/                  # Static public assets
│   └── vite.svg            # Default favicon
├── README.md               # Project documentation
├── server/                 # Backend (Express.js)
│   ├── auth.js            # Authentication logic
│   ├── index.js           # Server entry point
│   ├── store.js           # JSON file read/write operations
│   └── routes/            # API route handlers
│       ├── auth.js        # /api/auth endpoints
│       ├── boards.js      # /api/boards endpoints (sharing, permissions)
│       ├── labels.js      # /api/labels endpoints
│       └── users.js       # /api/users endpoint
├── src/                    # Frontend (React + TypeScript)
│   ├── App.css            # App styles
│   ├── App.tsx            # Main App component
│   ├── index.css          # Global styles & Tailwind
│   ├── main.tsx           # React entry point
│   ├── assets/            # Static assets
│   │   └── react.svg     # React logo
│   ├── components/        # React components
│   │   ├── auth/         # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── board/        # Board components
│   │   │   ├── Board.tsx        # Main board container with DndContext
│   │   │   ├── Card.tsx         # Draggable card with sharing UI
│   │   │   ├── CardModal.tsx    # Card edit modal (readOnly mode)
│   │   │   └── Column.tsx       # Column with cards and sharing UI
│   │   ├── layout/       # Layout components
│   │   │   ├── Layout.tsx       # Main layout wrapper
│   │   │   └── Sidebar.tsx      # Sidebar with board list and sharing
│   │   └── ui/           # Reusable UI components
│   │       ├── Button.tsx       # Button component
│   │       ├── Input.tsx        # Input component
│   │       ├── Modal.tsx        # Modal dialog
│   │       └── UserSelector.tsx # Share modal with permission dropdown
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.ts    # Authentication hook
│   ├── pages/            # Page components
│   │   ├── BoardPage.tsx     # Individual board view with owner indicator
│   │   ├── HomePage.tsx      # Dashboard with boards
│   │   ├── LoginPage.tsx     # Login form
│   │   └── RegisterPage.tsx  # Registration form
│   ├── store/            # State management
│   │   └── useBoardStore.ts  # Zustand store (share actions, permissions)
│   ├── styles/           # Additional styles
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Type definitions (SharedUser, SharePermission)
│   └── utils/            # Utility functions
│       └── api.ts        # API client (share with permission support)
├── start.sh               # Startup script (runs both servers)
├── tailwind.config.js     # Tailwind CSS configuration
├── tree.md               # This file
├── tsconfig.app.json     # TypeScript config for app
├── tsconfig.json        # Root TypeScript config
├── tsconfig.node.json   # TypeScript config for Node
└── vite.config.ts       # Vite configuration
```

## File Descriptions

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project metadata, dependencies, npm scripts |
| `tsconfig.json` | TypeScript compiler options |
| `vite.config.ts` | Vite bundler configuration |
| `tailwind.config.js` | Tailwind CSS theme customization |
| `postcss.config.js` | PostCSS plugins configuration |
| `eslint.config.js` | ESLint rules configuration |

### Backend Files

| File | Purpose |
|------|---------|
| `server/index.js` | Express server entry point, CORS, middleware |
| `server/auth.js` | Password hashing, session management |
| `server/store.js` | Read/write JSON files, migration, sharing methods |
| `server/routes/auth.js` | Register, login, logout, me endpoints |
| `server/routes/boards.js` | CRUD + sharing/permissions for boards |
| `server/routes/labels.js` | CRUD operations for labels |
| `server/routes/users.js` | List all users endpoint |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app with routing |
| `src/main.tsx` | React DOM render entry |
| `src/index.css` | Global styles, Tailwind imports |
| `src/components/board/Board.tsx` | Drag & drop context, column rendering |
| `src/components/board/Column.tsx` | Column with cards, sharing UI |
| `src/components/board/Card.tsx` | Draggable card with sharing UI |
| `src/components/board/CardModal.tsx` | Edit card modal |
| `src/components/layout/Sidebar.tsx` | Board navigation, export/import, sharing |
| `src/components/ui/UserSelector.tsx` | Share modal with permission dropdown |
| `src/store/useBoardStore.ts` | Zustand store for boards, labels, sharing |
| `src/hooks/useAuth.ts` | Authentication state & actions |
| `src/pages/BoardPage.tsx` | Board view with owner indicator for shared boards |

### Data Files

| File | Format | Contents |
|------|--------|-----------|
| `data/users.json` | Array of user objects | User accounts with password hashes |
| `data/sessions.json` | Array of session objects | Active sessions with expiry |
| `data/boards.json` | Array of board objects | Boards with columns and cards |
| `data/labels.json` | Array of label objects | Label definitions |

## Key Data Structures

### User
```typescript
{
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}
```

### SharedUser
```typescript
{
  userId: string;
  permission: 'read' | 'write';
}
```

### Board
```typescript
{
  id: string;
  userId: string;
  title: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
  sharedWith: SharedUser[];
}
```

### Column
```typescript
{
  id: string;
  title: string;
  color: string;
  order: number;
  cards: Card[];
  userId: string;
  sharedWith: SharedUser[];
}
```

### Card
```typescript
{
  id: string;
  columnId: string;
  title: string;
  description?: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  sharedWith: SharedUser[];
}
```

### Label
```typescript
{
  id: string;
  name: string;
  color: string;
  userId: string;  // 'default' for system labels
}
```

## Recent Updates

### Permissions System (Latest)
- Added granular sharing with read/write permissions
- Only owners can delete and manage permissions
- Read-only users see disabled edit controls
- Write users can edit and move cards
- Owner indicator avatar in board header for shared boards

### Bug Fixes
- Fixed owner display showing "unknown" in sharing UI
- Removed duplicate code in boards.js routes
- Fixed owner avatar showing for non-owners
- Removed ring indicator from column avatars
- Switched to system fonts to prevent font loading flicker

### UI Changes
- Owner avatar in board header (right side) for shared boards only
- Hover tooltips show "Username (Owner)" for owners
- Permission icons (👁️ Read, ✏️ Write) in share modal
- No "Owner" label text - only tooltip indication
