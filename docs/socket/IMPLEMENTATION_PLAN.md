# Socket Service Implementation Plan

## 🎯 Critical Issues Identified

### Issue 1: No Connection Registry
**Problem**: The gateway doesn't track active WebSocket connections per room.  
**Impact**: Can't broadcast to all members when someone joins.  
**Current State**: Each connection is independent, no cross-connection communication.

### Issue 2: SimpleRoom is a Placeholder  
**Problem**: `SimpleRoom` has TODO methods that don't actually broadcast.  
**Impact**: No real-time updates when members join/leave.

### Issue 3: Two Room Systems  
**Problem**: 
- `room.Room` (from `internal/room/room.go`) - Full implementation with channels, tickers, etc.
- `SimpleRoom` (from `internal/gateway/websocket.go`) - Placeholder with TODOs

**Impact**: Connection handling uses SimpleRoom, but the actual room logic is in `room.Room`. They're disconnected!

---

## 🏗️ Architecture Refactoring Required

### Current Architecture (Broken)
```
WSConnection → SimpleRoom (TODO methods) → Database
                       ↓
                   No broadcasting!
```

### Proposed Architecture (Working)
```
WSConnection → Hub → room.Room → All Members
```

### Required Changes

#### 1. Implement Connection Registry in Hub
```go
type Hub struct {
    rooms      map[string]*room.Room
    
    // NEW: Track connections per user
    connections map[string]*WSConnection  // userID -> connection
    connectionsMutex sync.RWMutex
    
    logger     *zap.Logger
}

func (h *Hub) RegisterConnection(conn *WSConnection) {
    h.connectionsMutex.Lock()
    defer h.connectionsMutex.Unlock()
    
    h.connections[conn.userID] = conn
}

func (h *Hub) UnregisterConnection(userID string) {
    h.connectionsMutex.Lock()
    defer h.connectionsMutex.Unlock()
    
    delete(h.connections, userID)
}

func (h *Hub) GetConnection(userID string) (*WSConnection, bool) {
    h.connectionsMutex.RLock()
    defer h.connectionsMutex.RUnlock()
    
    conn, exists := h.connections[userID]
    return conn, exists
}

func (h *Hub) BroadcastToRoomMembers(roomID string, msg *protocol.Message) {
    // Get all members from database
    members, err := roomRepo.GetRoomMembers(roomID)
    if err != nil {
        return
    }
    
    // Send to each member's connection
    h.connectionsMutex.RLock()
    defer h.connectionsMutex.RUnlock()
    
    for _, member := range members {
        if conn, exists := h.connections[member.UserID]; exists {
            conn.Send(msg)
        }
    }
}
```

#### 2. Use Real Room Implementation
Replace `SimpleRoom` usage with actual `room.Room`:

```go
func (c *WSConnection) handleJoin(ctx context.Context, msg *protocol.Message) {
    // ... existing lookup logic ...
    
    // Get or create real Room
    r, exists := c.gateway.hub.GetRoom(room.ID)
    if !exists {
        // Load quiz data and create room
        quiz, err := loadQuiz(ctx, room.QuizID)
        // ... create room.Room instance ...
        r, err = room.NewRoom(...)
        c.gateway.hub.AddRoom(r)
    }
    
    // Add member to real room
    err = r.AddMember(c.userID, joinMsg.DisplayName, c)
    
    // Register connection with hub
    c.gateway.hub.RegisterConnection(c)
    
    // Send state to joining user
    stateMsg, _ := c.gateway.buildStateMessage(room, c.userID)
    c.sendMessage(ctx, stateMsg)
    
    // BROADCAST TO ALL EXISTING MEMBERS
    c.gateway.hub.BroadcastToRoomMembers(room.ID, stateMsg)
}
```

#### 3. Track Connections in WSConnection
```go
type WSConnection struct {
    conn   *websocket.Conn
    userID string
    user   *models.User
    room   *SimpleRoom  // Keep for compatibility, but use hub for real operations
    hub    *Hub         // NEW: Reference to hub
    // ... rest ...
}

func (c *WSConnection) handle(ctx context.Context) {
    // NEW: Register with hub
    c.gateway.hub.RegisterConnection(c)
    
    // Start send goroutine
    go c.sendLoop(connCtx)
    
    // Start read loop
    c.readLoop(connCtx)
    
    // Close connection when read loop ends
    c.Close()
}

func (c *WSConnection) Close() error {
    // NEW: Unregister from hub
    c.gateway.hub.UnregisterConnection(c.userID)
    
    // ... rest of cleanup ...
}
```

---

## 📅 Implementation Order

### Phase 1: Foundation (1-2 hours)
1. ✅ Create CONNECTION_RULES.md (Done)
2. ✅ Create IMPLEMENTATION_PLAN.md (Done)
3. Add connection registry to Hub
4. Register/unregister connections

### Phase 2: Broadcasting (2-3 hours)
5. Implement BroadcastToRoomMembers in Hub
6. Update handleJoin to broadcast to all
7. Update handleCreateRoom to broadcast when host joins
8. Test with 2-3 users

### Phase 3: Connection Health (1-2 hours)
9. Implement ping/pong tracking
10. Mark offline after 3 missed pings
11. Don't close rooms on connection drops
12. Implement proper room cleanup (after quiz ends + 5 min inactivity)

### Phase 4: Integration (1-2 hours)
13. Use real room.Room instead of SimpleRoom
14. Connect room lifecycle with connection registry
15. Full end-to-end testing

---

## 🧪 Testing Plan

### Test Case 1: Two Users Join Same Room
```
1. Host creates room → Server sends state to host (1 member)
2. Player joins → Server sends state to player (2 members)
3. EXPECTED: Server ALSO sends state to host (2 members) ← Currently failing
4. Both UIs show 2 members
```

### Test Case 2: Three Users Join
```
1. Host creates room (1 member)
2. Player1 joins (2 members)
3. Player2 joins (3 members)
4. EXPECTED: All 3 users see state with 3 members
5. Current state: Only joining user sees updated count
```

### Test Case 3: Ping Timeout
```
1. Two users in room
2. Host network drops
3. Expect: Host marked offline after 3 missed pings (90s)
4. NOT: Room closes immediately
```

---

## 📝 Next Steps

### Immediate Actions
1. **Read existing room.Room implementation** - Understand how it works
2. **Decide: Use room.Room or implement broadcasting separately?**
3. **Start with Phase 1** - Add connection registry
4. **Test incrementally** - After each phase

### Questions to Answer
- Should we use the full `room.Room` implementation or build on top of `SimpleRoom`?
- How to handle room.Room's goroutines with the gateway?
- Should rooms live in the Hub or separately managed?

---

## 🔗 Files to Modify

### Must Modify
- `internal/gateway/websocket.go` - Add hub connection registry, broadcasting
- `internal/gateway/hub.go` - New file or add to websocket.go

### May Modify  
- `internal/room/room.go` - If integrating with real room
- `internal/protocol/messages.go` - If need new message types

### Documentation
- ✅ `CONNECTION_RULES.md` - Spec document
- ✅ `IMPLEMENTATION_PLAN.md` - This file

---

## 💡 Key Insight

The socket service needs a **connection registry** to track which WebSocket connection belongs to which user, so when someone joins, we can broadcast to all other members' connections.

Currently, each connection is independent and doesn't know about other connections. The Hub has rooms but no connections!

---

Last Updated: {{ current_date }}
Status: 📋 Ready to implement






