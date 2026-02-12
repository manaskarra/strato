#!/bin/bash

# Strato Backend Startup Script

echo "🚀 Starting Strato Backend..."

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Start server
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📚 API docs at http://localhost:8000/docs"
echo ""
python main.py
