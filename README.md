# TaskPlanner

A production-ready Kanban-style task management application with a distinctive neo-brutalist design.

## Features

- **User Authentication** - Email magic code login via InstantDB
- **Multi-Board Support** - Create, rename, and delete multiple boards
- **Drag & Drop** - Intuitive card reordering with @dnd-kit
- **Label System** - Pre-configured and custom labels with colors
- **Priority & Due Dates** - Track task importance and deadlines
- **Export/Import** - Backup and share boards as JSON files
- **Responsive Design** - Works on desktop and mobile devices
- **Double-Click to Add** - Double-click anywhere in a column to quickly add a card
- **Board Sharing** - Share boards, columns, and cards with read/write permissions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| State Management | Zustand |
| Styling | Tailwind CSS v4 |
| Backend/Database | InstantDB (serverless) |
| Authentication | InstantDB Auth (email magic codes) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- InstantDB account (free at instantdb.com)

### Installation

```bash
# Install dependencies
npm install
```

### Configuration

Create a `.env` file with your InstantDB App ID:

```bash
cp .env.example .env
# Edit .env and add your VITE_INSTANT_APP_ID
```

### Running the Application

```bash
# Start development server
npm run dev
```

The application will be available at: http://localhost:5173

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` folder.

## Project Structure

```
taskplanner/
├── src/                  # React frontend
│   ├── components/      # React components
│   │   ├── board/      # Board, Column, Card components
│   │   ├── layout/     # Layout, Sidebar components
│   │   └── ui/         # Reusable UI components
│   ├── context/        # React context providers (Auth, Theme)
│   ├── lib/            # Library utilities (db.ts)
│   ├── pages/          # Page components
│   ├── store/          # Zustand state store
│   └── types/          # TypeScript types
├── dist/                # Production build output
├── public/             # Static assets
├── .env.example        # Environment variables template
├── .gitignore         # Git ignore rules
├── eslint.config.js   # ESLint configuration
├── package.json       # Project dependencies
├── postcss.config.js  # PostCSS configuration
├── tailwind.config.js # Tailwind CSS configuration
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite configuration
├── start.sh          # Startup script
├── nginx.conf        # Nginx configuration
└── README.md         # This file
```

## Database Schema

The app uses InstantDB with the following entities:

- **$users** - System authentication users
- **users** - User profiles (username, email)
- **boards** - Kanban boards with sharing
- **columns** - Board columns with ordering
- **cards** - Task cards with labels, priority, due dates
- **labels** - User-scoped labels

See `SCHEMA_STRUCTURE.md` for detailed schema documentation.

## Sharing Permissions

### Permission Levels

- **Read**: View-only access - cannot edit details or move cards
- **Write**: Can edit details, move cards between columns, add new cards

### Sharing Hierarchy

- **Board Owner**: Full control (share, delete, manage permissions)
- **Board Shared User**: Access to entire board based on permission level
- **Column Shared User**: Access to specific column and its cards
- **Card Shared User**: Access to specific card only

### Only Owners Can

- Delete boards, columns, or cards
- Share/unshare items
- Change permission levels

## Environment Variables

```env
# InstantDB App ID (required)
VITE_INSTANT_APP_ID=your_app_id_here
```

Get your App ID from: https://instantdb.com/dash

## License

MIT
