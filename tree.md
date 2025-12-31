# Project Tree Structure

```
todo/
├── .git/                     # Git version control
├── .gitattributes           # Git attributes
├── .gitignore               # Git ignore rules
├── public/                  # Static public assets
│   └── vite.svg            # Favicon
├── src/                    # Frontend (React + TypeScript)
│   ├── App.css            # App styles
│   ├── App.tsx            # Main App component
│   ├── index.css          # Global styles & Tailwind
│   ├── main.tsx           # React entry point
│   ├── assets/            # Static assets
│   │   └── react.svg     # React logo
│   ├── components/        # React components
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
│   │       ├── IconPicker.tsx   # Icon picker component
│   │       ├── Input.tsx        # Input component
│   │       ├── Modal.tsx        # Modal dialog
│   │       └── UserSelector.tsx # Share modal with permission dropdown
│   ├── context/           # React context providers
│   │   ├── AuthContext.tsx      # Authentication context
│   │   └── ThemeContext.tsx     # Theme context
│   ├── lib/              # Library utilities
│   │   └── db.ts         # Database operations
│   ├── pages/            # Page components
│   │   ├── BoardPage.tsx     # Individual board view with owner indicator
│   │   ├── HomePage.tsx      # Dashboard with boards
│   │   ├── LoginPage.tsx     # Login form
│   │   └── RegisterPage.tsx  # Registration form
│   ├── store/            # State management
│   │   └── useBoardStore.ts  # Zustand store (share actions, permissions)
│   └── types/            # TypeScript types
│       └── index.ts      # Type definitions (SharedUser, SharePermission)
├── .env.example          # Environment variables template
├── DEPLOY_COMMANDS.md    # Deployment commands documentation
├── deploy-to-server.sh   # Server deployment script
├── deploy.sh             # Deployment script
├── docs.md               # Additional documentation
├── eslint.config.js      # ESLint configuration
├── index.html            # Main HTML entry point
├── INSTALL.md            # Installation instructions
├── nginx.conf            # Nginx configuration
├── package.json          # Project dependencies & scripts
├── package-lock.json     # Locked dependency versions
├── postcss.config.js     # PostCSS configuration
├── PRODUCTION_DEPLOYMENT.md  # Production deployment guide
├── README.md             # Project documentation
├── SCHEMA_STRUCTURE.md   # Database schema documentation
├── start.sh              # Startup script
├── tailwind.config.js    # Tailwind CSS configuration
├── tree.md               # This file
├── tsconfig.app.json     # TypeScript config for app
├── tsconfig.json         # Root TypeScript config
├── tsconfig.node.json    # TypeScript config for Node
└── vite.config.ts        # Vite configuration
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
| `nginx.conf` | Nginx server configuration |

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
| `src/components/layout/Layout.tsx` | Main layout wrapper |
| `src/components/layout/Sidebar.tsx` | Board navigation, export/import, sharing |
| `src/components/ui/Button.tsx` | Button component |
| `src/components/ui/IconPicker.tsx` | Icon picker component |
| `src/components/ui/Input.tsx` | Input component |
| `src/components/ui/Modal.tsx` | Modal dialog |
| `src/components/ui/UserSelector.tsx` | Share modal with permission dropdown |
| `src/context/AuthContext.tsx` | Authentication context provider |
| `src/context/ThemeContext.tsx` | Theme context provider |
| `src/lib/db.ts` | Database operations |
| `src/store/useBoardStore.ts` | Zustand store for boards, labels, sharing |
| `src/pages/BoardPage.tsx` | Board view with owner indicator for shared boards |
| `src/pages/HomePage.tsx` | Dashboard with boards list |
| `src/pages/LoginPage.tsx` | Login form |
| `src/pages/RegisterPage.tsx` | Registration form |
| `src/types/index.ts` | TypeScript type definitions |

### Deployment Files

| File | Purpose |
|------|---------|
| `start.sh` | Startup script |
| `deploy.sh` | Deployment script |
| `deploy-to-server.sh` | Server deployment script |
| `DEPLOY_COMMANDS.md` | Deployment commands |
| `INSTALL.md` | Installation instructions |
| `PRODUCTION_DEPLOYMENT.md` | Production deployment guide |
| `nginx.conf` | Nginx configuration |
| `docs.md` | Additional documentation |
| `SCHEMA_STRUCTURE.md` | Database schema |

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
