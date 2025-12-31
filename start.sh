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
echo "📦 Checking dependencies..."
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "🚀 Starting frontend..."
npm run dev

echo ""
echo "✅ Frontend started at http://localhost:5173"
