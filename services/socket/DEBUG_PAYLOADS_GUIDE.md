# WebSocket Debug Payloads Guide

This guide provides comprehensive debug payloads for testing the Quiz Maker WebSocket service.

## 📋 Overview

The debug payloads are designed to test all aspects of the WebSocket communication:

- **Basic Functionality**: Ping/pong, room creation, joining
- **Error Handling**: Invalid messages, malformed data
- **Edge Cases**: Unicode, special characters, large messages
- **Concurrent Testing**: Multiple simultaneous messages

## 🎯 Test Data

- **Quiz ID**: `0043a49e-683c-453b-b4ef-5f288f74feeb`
- **User ID**: `1f87b22f-c9f4-4764-92ba-c257e90a585b`

## 🚀 Quick Start

### 1. Run Interactive Mode

```bash
cd services/socket
go run scripts/debug_payload_loader.go ws://localhost:5000/ws
```

### 2. Run Specific Payload

```bash
go run scripts/debug_payload_loader.go ws://localhost:5000/ws ping
```

### 3. Run Test Suites

```bash
./scripts/run_debug_payloads.sh ws://localhost:5000/ws basic
./scripts/run_debug_payloads.sh ws://localhost:5000/ws error
./scripts/run_debug_payloads.sh ws://localhost:5000/ws all
```

## 📊 Payload Categories

### 🔧 Basic Functionality

#### Ping/Pong

```json
{
  "v": 1,
  "type": "ping",
  "msg_id": "debug-ping-001",
  "data": {
    "timestamp": 1703123456789
  }
}
```

#### Create Room

```json
{
  "v": 1,
  "type": "create_room",
  "msg_id": "debug-create-room-001",
  "data": {
    "quiz_id": "0043a49e-683c-453b-b4ef-5f288f74feeb",
    "settings": {
      "question_duration_ms": 30000,
      "show_correctness": true,
      "show_leaderboard": true,
      "allow_reconnect": true,
      "max_players": 50
    }
  }
}
```

#### Join Room

```json
{
  "v": 1,
  "type": "join",
  "msg_id": "debug-join-room-001",
  "data": {
    "pin": "123456",
    "display_name": "Debug User"
  }
}
```

### 🚨 Error Handling

#### Invalid Message Format

```json
{
  "v": 1,
  "type": "invalid_type",
  "msg_id": "debug-invalid-001",
  "data": {
    "invalid_field": "test"
  }
}
```

#### Malformed JSON

```json
{"v":1,"type":"ping","msg_id":"debug-malformed-001","data":{"timestamp":1703123456789
```

#### Missing Required Fields

```json
{
  "v": 1,
  "type": "join",
  "msg_id": "debug-missing-fields-001",
  "data": {
    "pin": "123456"
  }
}
```

### 🔍 Edge Cases

#### Unicode Characters

```json
{
  "v": 1,
  "type": "join",
  "msg_id": "debug-unicode-001",
  "data": {
    "pin": "123456",
    "display_name": "测试用户 🎯 Quiz Master 中文"
  }
}
```

#### Special Characters

```json
{
  "v": 1,
  "type": "join",
  "msg_id": "debug-special-chars-001",
  "data": {
    "pin": "123456",
    "display_name": "User@#$%^&*()_+-=[]{}|;':\",./<>?"
  }
}
```

#### Very Large Message

```json
{
  "v": 1,
  "type": "create_room",
  "msg_id": "debug-large-001",
  "data": {
    "quiz_id": "0043a49e-683c-453b-b4ef-5f288f74feeb",
    "settings": {
      "question_duration_ms": 30000,
      "show_correctness": true,
      "show_leaderboard": true,
      "allow_reconnect": true,
      "max_players": 50,
      "extra_data": "This is a very long string..."
    }
  }
}
```

## 🧪 Testing Scenarios

### Happy Path Testing

1. **Ping** → Should receive pong
2. **Create Room** → Should receive state with room details
3. **Join Room** → Should receive state with room details
4. **Start Quiz** → Should receive quiz start state
5. **Answer Question** → Should receive answer confirmation
6. **Leave Room** → Should receive leave confirmation

### Error Handling Testing

1. **Invalid Message Format** → Should receive validation error
2. **Malformed JSON** → Should receive parse error
3. **Missing Fields** → Should receive validation error
4. **Wrong Data Types** → Should receive validation error

### Edge Case Testing

1. **Empty Data** → Should handle gracefully
2. **Null Data** → Should handle gracefully
3. **Unicode Characters** → Should preserve characters
4. **Special Characters** → Should handle safely
5. **Large Messages** → Should process without issues

### Concurrent Testing

1. **Multiple Pings** → Should handle all pings
2. **Rapid Messages** → Should process in order
3. **Mixed Message Types** → Should handle correctly

## 📈 Expected Responses

### Successful Responses

#### Pong Response

```json
{
  "v": 1,
  "type": "pong",
  "msg_id": "debug-pong-001",
  "data": {
    "timestamp": 1703123456789
  }
}
```

#### Room Created Response

```json
{
  "v": 1,
  "type": "state",
  "msg_id": "debug-create-room-001",
  "data": {
    "phase": "lobby",
    "room_id": "room-123456",
    "pin": "123456",
    "host_id": "1f87b22f-c9f4-4764-92ba-c257e90a585b",
    "question_index": 0,
    "total_questions": 10,
    "members": [
      {
        "id": "1f87b22f-c9f4-4764-92ba-c257e90a585b",
        "display_name": "Debug User",
        "role": "host",
        "score": 0,
        "is_online": true,
        "joined_at": 1703123456789
      }
    ],
    "settings": {
      "question_duration": 30000,
      "show_correctness": true,
      "show_leaderboard": true,
      "allow_reconnect": true
    }
  }
}
```

### Error Responses

#### Validation Error

```json
{
  "v": 1,
  "type": "error",
  "msg_id": "debug-invalid-001",
  "data": {
    "code": "VALIDATION",
    "message": "Invalid message format"
  }
}
```

#### Not Found Error

```json
{
  "v": 1,
  "type": "error",
  "msg_id": "debug-join-room-001",
  "data": {
    "code": "NOT_FOUND",
    "message": "Room not found"
  }
}
```

## 🔧 Usage Examples

### Test Basic Connection

```bash
# Test ping/pong
go run scripts/debug_payload_loader.go ws://localhost:5000/ws ping

# Test room creation
go run scripts/debug_payload_loader.go ws://localhost:5000/ws create_room

# Test room joining
go run scripts/debug_payload_loader.go ws://localhost:5000/ws join_room
```

### Test Error Handling

```bash
# Test invalid message
go run scripts/debug_payload_loader.go ws://localhost:5000/ws invalid_message_format

# Test malformed JSON
go run scripts/debug_payload_loader.go ws://localhost:5000/ws malformed_json

# Test missing fields
go run scripts/debug_payload_loader.go ws://localhost:5000/ws missing_required_fields
```

### Test Edge Cases

```bash
# Test Unicode
go run scripts/debug_payload_loader.go ws://localhost:5000/ws unicode_characters

# Test special characters
go run scripts/debug_payload_loader.go ws://localhost:5000/ws special_characters

# Test large message
go run scripts/debug_payload_loader.go ws://localhost:5000/ws very_large_message
```

### Run Test Suites

```bash
# Run all basic tests
./scripts/run_debug_payloads.sh ws://localhost:5000/ws basic

# Run all error tests
./scripts/run_debug_payloads.sh ws://localhost:5000/ws error

# Run all edge case tests
./scripts/run_debug_payloads.sh ws://localhost:5000/ws edge

# Run all tests
./scripts/run_debug_payloads.sh ws://localhost:5000/ws all
```

## 📊 Monitoring and Debugging

### Server Logs

Watch the server logs for detailed information:

```bash
# Start server with debug logging
LOG_LEVEL=debug go run cmd/main.go

# Filter WebSocket logs
grep "websocket" service.log

# Filter error logs
grep "ERROR" service.log
```

### Client Logs

The debug payload loader provides detailed output:

- ✅ Successful operations
- ❌ Error conditions
- 📤 Outgoing messages
- 📨 Incoming responses

### Expected Log Patterns

#### Successful Connection

```
INFO    WebSocket connection attempt
INFO    User authenticated successfully
INFO    WebSocket upgraded successfully
INFO    WebSocket connection established
```

#### Message Processing

```
INFO    Received message
INFO    Handling message
INFO    Processing create room request
INFO    Room created in database
```

#### Error Handling

```
WARN    Invalid message format
ERROR   Failed to create room
WARN    Room not found by PIN
```

## 🚀 Integration with React

Use these same payloads in your React frontend:

```javascript
// Create room
const createRoomMessage = {
  v: 1,
  type: "create_room",
  msg_id: "react-create-room-001",
  data: {
    quiz_id: "0043a49e-683c-453b-b4ef-5f288f74feeb",
    settings: {
      question_duration_ms: 30000,
      show_correctness: true,
      show_leaderboard: true,
      allow_reconnect: true,
      max_players: 50,
    },
  },
};

// Join room
const joinRoomMessage = {
  v: 1,
  type: "join",
  msg_id: "react-join-room-001",
  data: {
    pin: "123456",
    display_name: "React User",
  },
};
```

## 📝 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server is running
   - Verify server URL and port
   - Check firewall settings

2. **Authentication Failed**
   - Verify Auth0 configuration
   - Check JWT token validity
   - Review authentication logs

3. **Room Not Found**
   - Ensure room exists in database
   - Check PIN format (6 digits)
   - Verify room status

4. **Invalid Message Format**
   - Check JSON structure
   - Verify required fields
   - Review message validation

### Debug Steps

1. **Start with Basic Tests**

   ```bash
   ./scripts/run_debug_payloads.sh ws://localhost:5000/ws basic
   ```

2. **Check Server Logs**

   ```bash
   tail -f service.log | grep -E "(websocket|ERROR|WARN)"
   ```

3. **Test Individual Payloads**

   ```bash
   go run scripts/debug_payload_loader.go ws://localhost:5000/ws ping
   ```

4. **Verify Database**
   ```bash
   go run scripts/test_db_connection.go
   ```

## 📚 Additional Resources

- **Debugging Guide**: `DEBUGGING_GUIDE.md`
- **WebSocket Protocol**: `internal/protocol/`
- **Server Configuration**: `internal/config/`
- **Database Models**: `internal/models/`

Remember: The debug payloads are designed to test all aspects of your WebSocket service. Use them systematically to identify and fix any issues with your React-Go socket integration.
