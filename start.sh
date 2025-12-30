#!/bin/bash

echo "🛑 Stopping existing services..."

# Kill any existing Node.js processes on ports 3001 and 5173
lsof -ti :3001 | xargs -r kill -9 2>/dev/null
lsof -ti :5173 | xargs -r kill -9 2>/dev/null

# Kill any npm/node processes related to kanban
pkill -f "node server/index.js" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

echo "✅ Services stopped"

echo ""
echo "🧹 Clearing Vite cache..."
rm -rf node_modules/.vite 2>/dev/null
echo "✅ Cache cleared"

echo ""
echo "🚀 Starting backend server..."
cd "$(dirname "$0")"
node server/index.js &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 2

echo "🚀 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services are starting..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
