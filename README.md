# TaskPlanner

A production-ready Kanban-style task management application with a distinctive neo-brutalist design.

## Features

- **User Authentication** - Register and login with secure cookie-based sessions
- **Multi-Board Support** - Create, rename, and delete multiple boards
- **Drag & Drop** - Intuitive card reordering with @dnd-kit
- **Label System** - Pre-configured and custom labels with colors
- **Priority & Due Dates** - Track task importance and deadlines
- **Export/Import** - Backup and share boards as JSON files
- **Responsive Design** - Works on desktop and mobile devices
- **Double-Click to Add** - Double-click anywhere in a column to quickly add a card

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| State Management | Zustand |
| Styling | Tailwind CSS v4 |
| Backend | Express.js (Node.js) |
| Storage | Local JSON files |
| Authentication | Cookie-based sessions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install
```

### Running the Application

**Option 1: Using the start script (recommended)**
```bash
./start.sh
```

**Option 2: Manual start**
```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend dev server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## Project Structure

```
taskplanner/
├── data/                  # JSON data storage
│   ├── boards.json       # Board data
│   ├── users.json        # User accounts
│   ├── sessions.json     # Session data
│   └── labels.json       # Label definitions
├── server/               # Express backend
│   ├── index.js         # Server entry point
│   ├── auth.js          # Authentication logic
│   ├── store.js         # JSON file operations
│   └── routes/          # API routes
│       ├── auth.js      # /api/auth endpoints
│       ├── boards.js    # /api/boards endpoints
│       └── labels.js    # /api/labels endpoints
├── src/                  # React frontend
│   ├── components/      # React components
│   │   ├── auth/       # Authentication components
│   │   ├── board/      # Board components
│   │   ├── layout/     # Layout components
│   │   └── ui/         # UI components
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── store/          # Zustand store
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── dist/                # Production build output
├── public/             # Static assets
├── .gitignore         # Git ignore rules
├── .env               # Environment variables
├── eslint.config.js   # ESLint configuration
├── package.json       # Project dependencies
├── postcss.config.js  # PostCSS configuration
├── tailwind.config.js # Tailwind CSS configuration
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite configuration
└── start.sh          # Startup script
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Login and set session cookie |
| POST | /api/auth/logout | Clear session cookie |
| GET | /api/auth/me | Get current user |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boards | Get all user boards |
| POST | /api/boards | Create new board |
| GET | /api/boards/:id | Get specific board |
| PUT | /api/boards/:id | Update board |
| DELETE | /api/boards/:id | Delete board |

### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/labels | Get all labels |
| POST | /api/labels | Create new label |
| PUT | /api/labels/:id | Update label |
| DELETE | /api/labels/:id | Delete label |

## Default Labels

| Name | Color |
|------|-------|
| Bug | #ef4444 (red) |
| Feature | #22c55e (green) |
| Idea | #3b82f6 (blue) |
| Todo | #f59e0b (amber) |
| Important | #ec4899 (pink) |

## Keyboard Shortcuts

- **Double-click** on empty space in a column to add a card

## Environment Variables

```env
# Server port (default: 3001)
PORT=3001

# JWT secret for session tokens (change in production)
JWT_SECRET=your-secret-key-here

# Node environment
NODE_ENV=development
```

## License

MIT
