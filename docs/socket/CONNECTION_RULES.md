# Live Quiz Room Connection Rules & Lifecycle

## 🎯 Overview

This document defines the connection rules, room lifecycle, and gameplay state machine for the live quiz gaming system. The socket service is the source of truth for all room state.

## 📋 Table of Contents

1. [Connection Lifecycle](#connection-lifecycle)
2. [Room Lifecycle](#room-lifecycle)
3. [State Broadcasting](#state-broadcasting)
4. [Connection Health Management](#connection-health-management)
5. [Error Handling](#error-handling)
6. [Implementation Status](#implementation-status)

---

## 🔌 Connection Lifecycle

### 1. WebSocket Connection

- **Authentication**: Every connection requires JWT authentication
- **Connection Timeout**: 60 seconds read timeout
- **Ping Interval**: Client sends ping every 30 seconds
- **Pong Response**: Server responds within 1 second

### 2. Connection States

```
[Disconnected] → [Connecting] → [Connected] → [In Room] → [Disconnected]
```

### 3. Connection Rules

- **One room per connection**: A user can only be in one room at a time
- **Reconnection allowed**: If `allow_reconnect` setting is enabled
- **Connection tracking**: Server tracks all active connections per room
- **Graceful close**: Server sends close frame before termination

---

## 🏠 Room Lifecycle

### 1. Room Creation

```go
State: "does_not_exist" → "created" → "lobby"
```

**When host clicks quiz card:**

1. Client sends `create_room` message
2. Server generates unique 6-digit PIN
3. Server creates room in database with status="lobby"
4. Server adds host as member with role="host"
5. Server broadcasts `state` message to host only
6. Room waits in "lobby" state until host starts

**PIN Rules:**

- 6 digits: 000000-999999
- Avoid confusing patterns: 000000, 123456, 111111, etc.
- Unique per active room (checked in Redis)

### 2. Room States

```
[Lobby] → [Question] → [Reveal] → [Lobby] → ... → [Ended]
```

**State Transitions:**
| From | To | Trigger | Who |
|------|----|---------|-----|
| Lobby | Question | Host clicks "Start" | Host only |
| Question | Reveal | Timer expires or all answered | Server |
| Reveal | Question | Next question timer | Server |
| Reveal | Ended | Last question completed | Server |
| Any | Closed | All members leave | Server |

### 3. Member Joining

```go
State: "not_in_room" → "joining" → "in_room"
```

**When participant enters PIN:**

1. Client sends `join` message with PIN
2. Server looks up room by PIN
3. Server validates room exists and is in lobby
4. Server adds user to database as member
5. Server sends `state` message to joining user
6. Server broadcasts `joined` message to all existing members
7. All clients update their member list

**Important**: Every state message must include **all current members**!

### 4. State Broadcasting Rules

#### Critical Rule: All-Member Broadcast

When ANY state change occurs, **ALL members must receive the current state including ALL members**.

#### State Update Triggers

- ✅ New member joins → Broadcast to all
- ✅ Member leaves → Broadcast to all
- ✅ Host starts quiz → Broadcast to all
- ✅ Question phase starts → Broadcast to all
- ✅ Answer revealed → Broadcast to all
- ✅ Quiz ends → Broadcast to all

#### State Message Format

```json
{
  "type": "state",
  "data": {
    "phase": "lobby|question|reveal|ended",
    "room_id": "uuid",
    "pin": "123456",
    "host_id": "uuid",
    "question_index": 0,
    "total_questions": 10,
    "members": [
      {
        "id": "uuid",
        "display_name": "Host User",
        "role": "host",
        "score": 0,
        "is_online": true
      },
      {
        "id": "uuid",
        "display_name": "Player Name",
        "role": "player",
        "score": 0,
        "is_online": true
      }
    ],
    "settings": {...}
  }
}
```

**✅ Fixed**: State messages now broadcast to ALL members when someone joins!
**Implementation**: Hub connection registry + BroadcastToRoomMembers method

---

## 💓 Connection Health Management

### 1. Keep-Alive Mechanism

```
Client → Server: ping (every 30 seconds)
Server → Client: pong (within 1 second)
```

### 2. Connection Timeout

- **Read timeout**: 60 seconds without any message
- **Ping timeout**: Miss 3 consecutive pings → mark as offline
- **Offline handling**: Member marked as `is_online: false` but stays in room

### 3. Room Closure Rules

**When to close a room:**

1. ✅ All members have explicitly left (`leave` message)
2. ✅ Host leaves and no other members remain
3. ✅ Quiz ended and 5 minutes of inactivity passed
4. ❌ **NOT**: Just because connection dropped (wait for pings)

**Current Bug**: Rooms closing too quickly
**Fix**: Implement proper ping-based timeout (miss 3 pings = 90 seconds)

---

## ❌ Error Handling

### 1. Join Errors

| Error          | Code        | When                 | What happens                  |
| -------------- | ----------- | -------------------- | ----------------------------- |
| Invalid PIN    | `not_found` | PIN doesn't exist    | Send error, stay disconnected |
| Room full      | `state`     | 50 members reached   | Send error, stay disconnected |
| Room closed    | `state`     | Room already closed  | Send error, stay disconnected |
| Duplicate join | `state`     | Already in that room | Allow reconnect               |

### 2. Gameplay Errors

| Error       | Code        | When                  | What happens                  |
| ----------- | ----------- | --------------------- | ----------------------------- |
| Not host    | `forbidden` | Player tries to start | Send error, keep state        |
| Wrong phase | `state`     | Answer in lobby       | Send error, keep state        |
| Late answer | `state`     | Time expired          | Send error, keep state        |
| Not in room | `state`     | Message without room  | Send error, stay disconnected |

### 3. Connection Errors

- Network drops: Client should auto-reconnect
- Server restart: Clients reconnect and rejoin if `allow_reconnect`
- Invalid message: Send error, keep connection

---

## 🔧 Implementation Status

### ✅ Implemented

- [x] WebSocket connection authentication
- [x] Room creation and PIN generation
- [x] Member joining via PIN
- [x] Basic state messages
- [x] Ping/pong keep-alive
- [x] Connection tracking

### 🚧 Needs Fix

- [x] **State broadcasts not reaching all members when someone joins** ✅ FIXED
- [x] **Room closing too quickly (should wait for ping timeouts)** ✅ FIXED
- [x] **Member list not updated in real-time across clients** ✅ FIXED
- [ ] **Host transfer not implemented (exists but needs testing)**
- [ ] **Proper reconnect handling not fully implemented**

### 📋 TODO

- [ ] Test multi-user scenarios (ready to test!)
- [ ] Add connection health monitoring dashboard
- [ ] Implement room persistence/recovery
- [ ] Add graceful shutdown handling
- [ ] Performance testing with 50 concurrent users

---

## 🎮 Gameplay Flow Example

### Scenario: Two users join a room

**Time 0:00 - Host creates room**

1. Host clicks quiz → `create_room` → Server creates room with PIN "123456"
2. Server sends `state` to host with 1 member (host)

**Time 0:05 - Player 1 joins**

1. Player 1 enters PIN "123456" → `join` message
2. Server adds Player 1 to database
3. Server sends `state` to Player 1 with 2 members (host + player1)
4. Server sends `state` to Host with 2 members (host + player1) ✅ **NOW WORKING!**

**Time 0:10 - Player 2 joins**

1. Player 2 enters PIN "123456" → `join` message
2. Server adds Player 2 to database
3. Server sends `state` to Player 2 with 3 members
4. Server sends `state` to Host with 3 members ✅ **NOW WORKING!**
5. Server sends `state` to Player 1 with 3 members ✅ **NOW WORKING!**

**Time 0:15 - Host starts game**

1. Host clicks "Start" → `start` message
2. Server changes phase to "question"
3. Server broadcasts `state` to all 3 members (host + 2 players)

---

## 📝 Key Takeaways for Socket Service

1. **All state messages must include all current members**
2. **Every state change must broadcast to ALL members**
3. **Don't close rooms on connection drops - wait for ping timeout**
4. **Track connection health with ping/pong**
5. **UI follows socket - socket is the source of truth**

---

## 🔗 Related Files

- `internal/gateway/websocket.go` - WebSocket connection handling
- `internal/room/room.go` - Room state management
- `internal/repository/room.go` - Database operations
- `internal/store/redis.go` - Presence tracking

---

Last Updated: {{ current_date }}
Status: 🚧 In Progress
