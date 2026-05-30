#!/bin/bash
# Startup script for ML Service on Linux/Mac

echo "========================================"
echo "  Starting ML Sales Prediction Service"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

echo "Checking Python dependencies..."
if ! python3 -c "import flask" &> /dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
fi

echo ""
echo "Starting Flask ML Service on port 5001..."
echo ""

python3 app.py
