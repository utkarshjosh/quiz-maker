# From Socket.IO to Go WebSockets: A Complete Guide

This document explains how the Go WebSocket service works for developers coming from a Node.js + Socket.IO background.

## Key Differences: Socket.IO vs Raw WebSockets

### Socket.IO (What you're used to)
```javascript
// Server side - Express + Socket.IO
io.on('connection', (socket) => {
  // Named events with callbacks
  socket.on('join-room', (data, callback) => {
    // Handle join room
    callback({ success: true, roomId: '123' });
  });
  
  socket.on('send-message', (data) => {
    // Broadcast to room
    socket.to(data.roomId).emit('new-message', data);
  });
  
  // Built-in rooms, namespaces, acknowledgments
  socket.join('room-123');
  socket.emit('welcome', { message: 'Connected!' });
});
```

### Go WebSockets (This implementation)
```go
// Raw WebSocket connection - no built-in events
func (c *WSConnection) readLoop(ctx context.Context) {
  for {
    // Read raw JSON message
    _, data, err := c.conn.Read(ctx)
    
    // Parse into our message format
    var msg protocol.Message
    json.Unmarshal(data, &msg)
    
    // Route based on message type
    switch msg.Type {
    case "join":
      c.handleJoin(ctx, &msg)
    case "answer":
      c.handleAnswer(ctx, &msg)
    }
  }
}
```

## How the Go Service Maps Concepts

### 1. **Events → Message Types**

**Socket.IO Events:**
```javascript
socket.emit('join-room', { pin: '123456', name: 'John' });
socket.emit('submit-answer', { questionId: 1, answer: 'B' });
socket.emit('start-quiz');
```

**Go WebSocket Messages:**
```json
{
  "v": 1,
  "type": "join",
  "msg_id": "uuid-123",
  "data": { "pin": "123456", "display_name": "John" }
}

{
  "v": 1,
  "type": "answer", 
  "msg_id": "uuid-456",
  "data": { "question_index": 1, "choice": "B" }
}

{
  "v": 1,
  "type": "start",
  "msg_id": "uuid-789",
  "data": {}
}
```

### 2. **Rooms → Room Management**

**Socket.IO Rooms:**
```javascript
// Automatic room management
socket.join('quiz-room-123');
io.to('quiz-room-123').emit('question', questionData);
```

**Go Room Management:**
```go
// Manual room tracking in Hub
type Hub struct {
  rooms map[string]*room.Room
}

// Broadcasting to room members
func (r *Room) broadcastToAll(msg *protocol.Message) {
  for _, member := range r.Members {
    member.Connection.Send(msg)
  }
}
```

### 3. **Callbacks → Response Messages**

**Socket.IO with Acknowledgments:**
```javascript
socket.emit('join-room', data, (response) => {
  if (response.success) {
    console.log('Joined room:', response.roomId);
  }
});
```

**Go WebSocket Responses:**
```go
// Send success response
successMsg := &protocol.Message{
  Type: "state",
  Data: marshalData(protocol.StateMessage{
    Phase: "lobby",
    RoomID: room.ID,
    // ... room state
  }),
}
conn.Send(successMsg)

// Send error response  
errorMsg := protocol.NewErrorMessage("NOT_FOUND", "Room not found")
conn.Send(errorMsg)
```

## Complete Flow Comparison

### Socket.IO Quiz Flow
```javascript
// SERVER: Express + Socket.IO
app.use('/api', apiRoutes); // REST API
io.on('connection', (socket) => {
  
  socket.on('create-room', async (quizId, callback) => {
    const room = await createQuizRoom(quizId);
    socket.join(`room-${room.id}`);
    callback({ roomId: room.id, pin: room.pin });
  });
  
  socket.on('join-room', (pin, callback) => {
    const room = findRoomByPin(pin);
    socket.join(`room-${room.id}`);
    socket.to(`room-${room.id}`).emit('user-joined', socket.user);
    callback({ success: true });
  });
  
  socket.on('start-quiz', (roomId) => {
    io.to(`room-${roomId}`).emit('quiz-started', firstQuestion);
  });
});

// CLIENT
const socket = io();
socket.emit('join-room', '123456', (response) => {
  // Handle response
});
socket.on('quiz-started', (question) => {
  // Show question
});
```

### Go WebSocket Quiz Flow
```go
// SERVER: Chi Router + WebSocket Gateway
func (s *Server) setupRoutes(r chi.Router) {
  r.Get("/ws", s.wsGateway.HandleWebSocket) // WebSocket endpoint
  r.Get("/health", s.handleHealth)         // REST endpoints
}

// WebSocket message handling
func (c *WSConnection) handleMessage(ctx context.Context, msg *protocol.Message) {
  switch msg.Type {
  case "create_room":
    var createMsg protocol.CreateRoomMessage
    msg.UnmarshalData(&createMsg)
    
    // Create room logic
    room := createQuizRoom(createMsg.QuizID)
    hub.AddRoom(room)
    room.AddMember(c.userID, "host", c)
    
    // Send response
    c.Send(stateMessage)
    
  case "join":
    var joinMsg protocol.JoinMessage  
    msg.UnmarshalData(&joinMsg)
    
    room := hub.GetRoomByPIN(joinMsg.PIN)
    room.AddMember(c.userID, joinMsg.DisplayName, c)
    
    // Broadcast to all room members
    room.broadcastToAll(joinedMessage)
  }
}

// CLIENT
const ws = new WebSocket('ws://localhost:8080/ws?token=jwt');
ws.send(JSON.stringify({
  type: 'join',
  data: { pin: '123456', display_name: 'John' }
}));
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'state') {
    // Handle room state
  }
};
```

## Request Binding: Express vs Chi Router

### Express.js (What you know)
```javascript
app.get('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const room = getRoomById(roomId);
  res.json(room);
});

app.post('/api/rooms', (req, res) => {
  const { quizId } = req.body;
  const room = createRoom(quizId);
  res.json(room);
});
```

### Chi Router (Go equivalent)
```go
func (s *Server) setupRoutes(r chi.Router) {
  r.Get("/rooms/{roomID}", s.handleGetRoom)
  r.Post("/rooms", s.handleCreateRoom)
}

func (s *Server) handleGetRoom(w http.ResponseWriter, r *http.Request) {
  roomID := chi.URLParam(r, "roomID")        // Like req.params.id
  room := s.getRoomById(roomID)
  
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(room)            // Like res.json(room)
}

func (s *Server) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
  var body struct {
    QuizID string `json:"quizId"`
  }
  json.NewDecoder(r.Body).Decode(&body)      // Like req.body
  
  room := s.createRoom(body.QuizID)
  json.NewEncoder(w).Encode(room)
}
```

## WebSocket Connection Lifecycle

### Socket.IO Lifecycle
```javascript
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', reason);
    // Cleanup happens automatically
  });
});
```

### Go WebSocket Lifecycle
```go
func (g *WebSocketGateway) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
  // 1. Authenticate (like Socket.IO middleware)
  user, err := g.auth.AuthenticateWebSocket(r)
  
  // 2. Upgrade HTTP to WebSocket
  conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{})
  
  // 3. Create connection wrapper
  wsConn := &WSConnection{
    conn:   conn,
    userID: user.ID,
    // ...
  }
  
  // 4. Handle connection (like socket.on('connection'))
  wsConn.handle(r.Context())
}

func (c *WSConnection) handle(ctx context.Context) {
  defer c.Close() // Cleanup on disconnect
  
  go c.sendLoop(ctx) // Background sender
  c.readLoop(ctx)    // Main message receiver
}
```

## Message Routing: The Key Difference

### Socket.IO: Event-Based
```javascript
// Each event has its own handler
socket.on('join-room', handleJoinRoom);
socket.on('leave-room', handleLeaveRoom);  
socket.on('send-message', handleMessage);
socket.on('start-quiz', handleStartQuiz);

// Automatic serialization/deserialization
socket.emit('room-update', { users: [...], status: 'active' });
```

### Go WebSocket: Type-Based Routing
```go
// Single message handler routes by type
func (c *WSConnection) handleMessage(ctx context.Context, msg *protocol.Message) {
  switch msg.Type {
  case protocol.TypeJoin:
    c.handleJoin(ctx, msg)
  case protocol.TypeLeave:
    c.handleLeave(ctx, msg)
  case protocol.TypeAnswer:
    c.handleAnswer(ctx, msg)
  case protocol.TypeStart:
    c.handleStart(ctx, msg)
  }
}

// Manual serialization with type safety
stateMsg := &protocol.Message{
  Type: protocol.TypeState,
  Data: marshalData(protocol.StateMessage{
    Phase: "active",
    Members: roomMembers,
  }),
}
```

## State Management Comparison

### Socket.IO: Implicit State
```javascript
// State is often implicit in Socket.IO
const rooms = new Map(); // Global state
const userRooms = new Map(); // Track user-room relationships

socket.on('join-room', (roomId) => {
  socket.join(roomId);
  userRooms.set(socket.id, roomId);
  // Socket.IO handles the rest
});
```

### Go: Explicit State Management
```go
// Explicit state structures
type Room struct {
  ID      string
  Members map[string]*Member
  State   *RoomState
  // All state is explicit
}

type Hub struct {
  rooms      map[string]*Room
  roomsMutex sync.RWMutex // Thread safety
}

// Manual state updates
func (r *Room) AddMember(userID string, conn Connection) {
  r.mu.Lock()
  defer r.mu.Unlock()
  
  r.Members[userID] = &Member{
    ID: userID,
    Connection: conn,
  }
  
  // Broadcast state change
  r.broadcastState()
}
```

## Error Handling Patterns

### Socket.IO: Callbacks & Events
```javascript
socket.emit('join-room', roomData, (error, result) => {
  if (error) {
    socket.emit('error', { message: error.message });
  } else {
    socket.emit('joined', result);
  }
});
```

### Go: Structured Error Messages
```go
func (c *WSConnection) handleJoin(ctx context.Context, msg *protocol.Message) {
  var joinMsg protocol.JoinMessage
  if err := msg.UnmarshalData(&joinMsg); err != nil {
    c.sendError(protocol.ErrorCodeValidation, "Invalid join message")
    return
  }
  
  room, exists := c.hub.GetRoomByPIN(joinMsg.PIN)
  if !exists {
    c.sendError(protocol.ErrorCodeNotFound, "Room not found")
    return
  }
  
  // Success - send state
  c.sendState(room)
}

func (c *WSConnection) sendError(code, message string) {
  errorMsg := &protocol.Message{
    Type: protocol.TypeError,
    Data: marshalData(protocol.ErrorMessage{
      Code: code,
      Message: message,
    }),
  }
  c.Send(errorMsg)
}
```

## Client-Side Integration

### Socket.IO Client
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected');
});

socket.emit('join-room', { pin: '123456' });

socket.on('question', (data) => {
  displayQuestion(data);
});
```

### WebSocket Client (for Go service)
```javascript
class QuizWebSocket {
  constructor(token) {
    this.ws = new WebSocket(`ws://localhost:8080/ws?token=${token}`);
    this.messageHandlers = new Map();
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.data);
      }
    };
  }
  
  // Mimic Socket.IO's emit
  emit(type, data) {
    const message = {
      v: 1,
      type: type,
      msg_id: this.generateUUID(),
      data: data
    };
    this.ws.send(JSON.stringify(message));
  }
  
  // Mimic Socket.IO's on
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }
}

// Usage (similar to Socket.IO)
const quiz = new QuizWebSocket(jwtToken);
quiz.on('question', (data) => displayQuestion(data));
quiz.on('state', (data) => updateRoomState(data));
quiz.emit('join', { pin: '123456', display_name: 'John' });
```

## Summary: Mental Model Shift

| Socket.IO Concept | Go WebSocket Equivalent |
|------------------|------------------------|
| `socket.emit('event', data)` | `Send(Message{Type: "event", Data: data})` |
| `socket.on('event', handler)` | `switch msg.Type { case "event": handler() }` |
| `socket.join('room')` | `room.AddMember(userID, conn)` |
| `io.to('room').emit()` | `room.broadcastToAll(message)` |
| Automatic serialization | Manual JSON marshal/unmarshal |
| Built-in acknowledgments | Custom response messages |
| Middleware | HTTP middleware + auth checks |
| Namespaces | URL paths + routing |

The key insight: **Socket.IO abstracts away the WebSocket complexity with events and rooms, while Go WebSockets give you raw control over the connection and message flow.**
