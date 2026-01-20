#!/bin/bash

# Session Tracker - Start Script

echo "🚀 Starting Session Tracker..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Start backend in background
echo "🔧 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend..."
cd client
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
