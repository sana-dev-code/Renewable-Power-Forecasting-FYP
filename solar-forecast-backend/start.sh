#!/bin/bash

echo "🌞 Starting Solar Forecast Pro..."
echo "================================="

# Check if Python virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
echo "📥 Installing backend dependencies..."
pip install -r requirements.txt

# Start backend server in background
echo "🚀 Starting backend server..."
uvicorn app:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Navigate to frontend and start it
echo "🎨 Starting frontend..."
cd frontend

# Install frontend dependencies
echo "📥 Installing frontend dependencies..."
npm install

# Start frontend server
echo "🌐 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ Both servers are starting..."
echo "📊 Backend API: http://localhost:8000"
echo "🌐 Frontend App: http://localhost:3000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup INT TERM

# Wait for processes
wait
