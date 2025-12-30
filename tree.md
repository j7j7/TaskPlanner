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
│       ├── boards.js      # /api/boards endpoints
│       └── labels.js      # /api/labels endpoints
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
│   │   │   ├── Board.tsx        # Main board container
│   │   │   ├── Card.tsx         # Draggable card component
│   │   │   ├── CardModal.tsx    # Card edit modal
│   │   │   └── Column.tsx       # Column with cards
│   │   ├── layout/       # Layout components
│   │   │   ├── Layout.tsx       # Main layout wrapper
│   │   │   └── Sidebar.tsx      # Sidebar with board list
│   │   └── ui/           # Reusable UI components
│   │       ├── Button.tsx       # Button component
│   │       ├── Input.tsx        # Input component
│   │       └── Modal.tsx        # Modal dialog
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.ts    # Authentication hook
│   ├── pages/            # Page components
│   │   ├── BoardPage.tsx     # Individual board view
│   │   ├── HomePage.tsx      # Dashboard with boards
│   │   ├── LoginPage.tsx     # Login form
│   │   └── RegisterPage.tsx  # Registration form
│   ├── store/            # State management
│   │   └── useBoardStore.ts  # Zustand store
│   ├── styles/           # Additional styles
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Type definitions
│   └── utils/            # Utility functions
│       └── api.ts        # API client
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
| `server/store.js` | Read/write JSON files for data persistence |
| `server/routes/auth.js` | Register, login, logout, me endpoints |
| `server/routes/boards.js` | CRUD operations for boards |
| `server/routes/labels.js` | CRUD operations for labels |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app with routing |
| `src/main.tsx` | React DOM render entry |
| `src/index.css` | Global styles, Tailwind imports |
| `src/components/board/Board.tsx` | Drag & drop context, column rendering |
| `src/components/board/Column.tsx` | Column with cards, double-click to add |
| `src/components/board/Card.tsx` | Draggable card with labels, priority |
| `src/components/board/CardModal.tsx` | Edit card modal |
| `src/components/layout/Sidebar.tsx` | Board navigation, export/import |
| `src/store/useBoardStore.ts` | Zustand store for boards & labels |
| `src/hooks/useAuth.ts` | Authentication state & actions |

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

### Board
```typescript
{
  id: string;
  userId: string;
  title: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
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
