#!/bin/bash

echo "🛑 Stopping existing services..."

# Kill any existing Vite processes on port 5173
lsof -ti :5173 | xargs -r kill -9 2>/dev/null

# Kill any vite processes
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

echo "✅ Services stopped"

echo ""
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite 2>/dev/null
echo "✅ Cache cleared"

echo ""
echo "🚀 Starting frontend..."
cd "$(dirname "$0")"
npm run dev

echo ""
echo "✅ Frontend started at http://localhost:5173"
