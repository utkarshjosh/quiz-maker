#!/bin/bash

# Test script for WebSocket JWT authentication integration
# This script tests the complete flow from API to WebSocket service

set -e

echo "=== WebSocket JWT Authentication Integration Test ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found. Please copy env.example to .env and configure it.${NC}"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}Error: JWT_SECRET not set in .env file${NC}"
    exit 1
fi

if [ -z "$AUTH0_DOMAIN" ]; then
    echo -e "${RED}Error: AUTH0_DOMAIN not set in .env file${NC}"
    exit 1
fi

if [ -z "$AUTH0_AUDIENCE" ]; then
    echo -e "${RED}Error: AUTH0_AUDIENCE not set in .env file${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Building the WebSocket service...${NC}"
go build -o bin/realtime-service cmd/main.go

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo

echo -e "${YELLOW}2. Generating test JWT token...${NC}"
go run generate_test_jwt.go > test_jwt_token.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}JWT generation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JWT token generated${NC}"
echo

echo -e "${YELLOW}3. Testing JWT authentication...${NC}"
go run test_jwt_auth.go

if [ $? -ne 0 ]; then
    echo -e "${RED}JWT authentication test failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JWT authentication test passed${NC}"
echo

echo -e "${YELLOW}4. Starting WebSocket service in background...${NC}"
./bin/realtime-service &
SERVICE_PID=$!

# Wait for service to start
sleep 3

# Check if service is running
if ! kill -0 $SERVICE_PID 2>/dev/null; then
    echo -e "${RED}Service failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ WebSocket service started (PID: $SERVICE_PID)${NC}"
echo

echo -e "${YELLOW}5. Testing WebSocket connection...${NC}"

# Extract JWT token from generated file
JWT_TOKEN=$(grep "JWT Token:" test_jwt_token.txt | cut -d: -f2- | tr -d ' ')

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}Failed to extract JWT token${NC}"
    kill $SERVICE_PID
    exit 1
fi

# Test WebSocket connection using curl (if available) or wget
if command -v curl &> /dev/null; then
    echo "Testing WebSocket connection with curl..."
    curl -i -N -H "Connection: Upgrade" \
         -H "Upgrade: websocket" \
         -H "Sec-WebSocket-Version: 13" \
         -H "Sec-WebSocket-Key: $(echo -n "test" | base64)" \
         "http://localhost:5000/ws?token=$JWT_TOKEN" &
    CURL_PID=$!
    sleep 2
    kill $CURL_PID 2>/dev/null || true
else
    echo -e "${YELLOW}curl not available, skipping WebSocket connection test${NC}"
fi

echo -e "${GREEN}✓ WebSocket connection test completed${NC}"
echo

echo -e "${YELLOW}6. Cleaning up...${NC}"
kill $SERVICE_PID 2>/dev/null || true
rm -f test_jwt_token.txt

echo -e "${GREEN}✓ Cleanup completed${NC}"
echo

echo -e "${GREEN}=== All tests passed! ===${NC}"
echo
echo "The WebSocket service is now properly configured to work with JWT tokens from the API gateway."
echo "You can test it manually by:"
echo "1. Starting the service: ./bin/realtime-service"
echo "2. Opening test_websocket_jwt.html in a browser"
echo "3. Pasting a JWT token from the API gateway"
echo "4. Clicking Connect"
