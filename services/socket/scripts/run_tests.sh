#!/bin/bash

# WebSocket and Database Testing Script
# This script helps debug the React-Go socket integration

set -e

echo "🔧 Quiz Maker WebSocket Debugging Tools"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "❌ Please run this script from the services/socket directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "📝 Please edit .env file with your database credentials"
        echo "   Required: DATABASE_URL, AUTH0_* variables"
        read -p "Press Enter after updating .env file..."
    else
        echo "❌ No env.example file found. Please create .env manually"
        exit 1
    fi
fi

echo ""
echo "🧪 Running Database Connection Test..."
echo "-------------------------------------"
go run scripts/test_db_connection.go

echo ""
echo "🔌 WebSocket Debug Client"
echo "-------------------------"
echo "The WebSocket debug client will help you test the socket connection."
echo "Make sure the WebSocket server is running on the correct port."
echo ""
echo "To start the WebSocket server:"
echo "  go run cmd/main.go"
echo ""
echo "Then run the debug client:"
echo "  go run scripts/websocket_debug_client.go ws://localhost:5000/ws"
echo ""

# Ask if user wants to start the debug client
read -p "Do you want to start the WebSocket debug client now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting WebSocket debug client..."
    go run scripts/websocket_debug_client.go ws://localhost:5000/ws
fi

echo ""
echo "✅ Debug tools completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Check the database connection test results above"
echo "2. Start the WebSocket server: go run cmd/main.go"
echo "3. Use the debug client to test WebSocket messages"
echo "4. Check server logs for detailed debugging information"
echo "5. Test with your React frontend"
