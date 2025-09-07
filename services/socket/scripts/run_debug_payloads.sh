#!/bin/bash

# Debug Payload Runner Script
# This script helps test various WebSocket payloads

set -e

echo "🔧 Quiz Maker WebSocket Debug Payload Runner"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo "❌ Please run this script from the services/socket directory"
    exit 1
fi

# Check if debug_payloads.json exists
if [ ! -f "scripts/debug_payloads.json" ]; then
    echo "❌ debug_payloads.json not found. Please ensure it exists in scripts/ directory"
    exit 1
fi

# Default server URL
SERVER_URL="ws://localhost:5000/ws"

# Parse command line arguments
if [ $# -gt 0 ]; then
    SERVER_URL="$1"
fi

echo "🎯 Server URL: $SERVER_URL"
echo ""

# Function to run a specific payload
run_payload() {
    local payload_name="$1"
    echo "🧪 Testing payload: $payload_name"
    echo "----------------------------------------"
    
    go run scripts/debug_payload_loader.go "$SERVER_URL" "$payload_name"
    echo ""
}

# Function to run all basic payloads
run_basic_tests() {
    echo "🚀 Running Basic Tests"
    echo "====================="
    
    run_payload "ping"
    run_payload "create_room"
    run_payload "join_room"
    run_payload "leave_room"
}

# Function to run error handling tests
run_error_tests() {
    echo "🚨 Running Error Handling Tests"
    echo "==============================="
    
    run_payload "invalid_message_format"
    run_payload "malformed_json"
    run_payload "missing_required_fields"
    run_payload "wrong_data_types"
}

# Function to run edge case tests
run_edge_case_tests() {
    echo "🔍 Running Edge Case Tests"
    echo "=========================="
    
    run_payload "empty_data"
    run_payload "null_data"
    run_payload "very_large_message"
    run_payload "unicode_characters"
    run_payload "special_characters"
    run_payload "edge_case_pin"
}

# Function to run concurrent tests
run_concurrent_tests() {
    echo "⚡ Running Concurrent Tests"
    echo "=========================="
    
    run_payload "concurrent_messages"
}

# Function to run all tests
run_all_tests() {
    run_basic_tests
    run_error_tests
    run_edge_case_tests
    run_concurrent_tests
}

# Function to show interactive menu
show_interactive_menu() {
    echo "🔧 Interactive Debug Payload Runner"
    echo "==================================="
    echo "1. Run Basic Tests"
    echo "2. Run Error Handling Tests"
    echo "3. Run Edge Case Tests"
    echo "4. Run Concurrent Tests"
    echo "5. Run All Tests"
    echo "6. Interactive Mode"
    echo "7. Exit"
    echo ""
    read -p "Choose an option (1-7): " choice
    
    case $choice in
        1) run_basic_tests ;;
        2) run_error_tests ;;
        3) run_edge_case_tests ;;
        4) run_concurrent_tests ;;
        5) run_all_tests ;;
        6) 
            echo "Starting interactive mode..."
            go run scripts/debug_payload_loader.go "$SERVER_URL"
            ;;
        7) 
            echo "👋 Goodbye!"
            exit 0
            ;;
        *) 
            echo "❌ Invalid choice"
            show_interactive_menu
            ;;
    esac
}

# Main execution
if [ $# -eq 0 ]; then
    show_interactive_menu
else
    case "$2" in
        "basic")
            run_basic_tests
            ;;
        "error")
            run_error_tests
            ;;
        "edge")
            run_edge_case_tests
            ;;
        "concurrent")
            run_concurrent_tests
            ;;
        "all")
            run_all_tests
            ;;
        "interactive")
            go run scripts/debug_payload_loader.go "$SERVER_URL"
            ;;
        *)
            echo "Usage: $0 [server_url] [test_type]"
            echo ""
            echo "Test types:"
            echo "  basic      - Run basic functionality tests"
            echo "  error      - Run error handling tests"
            echo "  edge       - Run edge case tests"
            echo "  concurrent - Run concurrent message tests"
            echo "  all        - Run all tests"
            echo "  interactive - Start interactive mode"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive menu"
            echo "  $0 ws://localhost:5000/ws basic       # Run basic tests"
            echo "  $0 ws://localhost:5000/ws all         # Run all tests"
            echo "  $0 ws://localhost:5000/ws interactive # Interactive mode"
            ;;
    esac
fi

echo ""
echo "✅ Debug payload testing completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Check server logs for detailed debugging information"
echo "2. Verify all expected responses were received"
echo "3. Test with your React frontend using the same payloads"
echo "4. Use the interactive mode for manual testing"
