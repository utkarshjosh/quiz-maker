package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"quiz-realtime-service/internal/auth"
	"quiz-realtime-service/internal/protocol"
	"quiz-realtime-service/internal/room"

	"nhooyr.io/websocket"
	"go.uber.org/zap"
)

type WebSocketGateway struct {
	auth   *auth.AuthService
	hub    *Hub
	logger *zap.Logger
}

type Hub struct {
	rooms      map[string]*room.Room
	roomsMutex sync.RWMutex
	logger     *zap.Logger
}

type WSConnection struct {
	conn   *websocket.Conn
	userID string
	user   *auth.User
	room   *room.Room
	logger *zap.Logger
	
	sendChan chan *protocol.Message
	closeChan chan struct{}
	closed   bool
	mu       sync.Mutex
}

func NewWebSocketGateway(authService *auth.AuthService, logger *zap.Logger) *WebSocketGateway {
	return &WebSocketGateway{
		auth: authService,
		hub: &Hub{
			rooms:  make(map[string]*room.Room),
			logger: logger.With(zap.String("component", "hub")),
		},
		logger: logger.With(zap.String("component", "ws_gateway")),
	}
}

func (g *WebSocketGateway) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Authenticate user
	user, err := g.auth.AuthenticateWebSocket(r)
	if err != nil {
		g.logger.Warn("WebSocket authentication failed", zap.Error(err))
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Upgrade connection
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"}, // Configure based on your needs
		Subprotocols:   []string{"quiz-protocol"},
	})
	if err != nil {
		g.logger.Error("Failed to upgrade WebSocket", zap.Error(err))
		return
	}

	// Create WebSocket connection wrapper
	wsConn := &WSConnection{
		conn:      conn,
		userID:    user.ID,
		user:      user,
		logger:    g.logger.With(zap.String("user_id", user.ID)),
		sendChan:  make(chan *protocol.Message, 100),
		closeChan: make(chan struct{}),
	}

	g.logger.Info("WebSocket connection established", zap.String("user_id", user.ID))

	// Handle connection
	wsConn.handle(r.Context())
}

func (c *WSConnection) handle(ctx context.Context) {
	defer c.Close()

	// Start send goroutine
	go c.sendLoop(ctx)

	// Start read loop
	c.readLoop(ctx)
}

func (c *WSConnection) readLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-c.closeChan:
			return
		default:
		}

		// Set read deadline
		ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
		_, data, err := c.conn.Read(ctx)
		cancel()

		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure {
				c.logger.Info("WebSocket closed normally")
			} else {
				c.logger.Error("WebSocket read error", zap.Error(err))
			}
			return
		}

		// Parse message
		var msg protocol.Message
		if err := json.Unmarshal(data, &msg); err != nil {
			c.logger.Warn("Invalid message format", zap.Error(err))
			c.sendError(protocol.ErrorCodeValidation, "Invalid message format")
			continue
		}

		// Handle message
		c.handleMessage(ctx, &msg)
	}
}

func (c *WSConnection) sendLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.closeChan:
			return
		case msg := <-c.sendChan:
			if err := c.sendMessage(ctx, msg); err != nil {
				c.logger.Error("Failed to send message", zap.Error(err))
				return
			}
		case <-ticker.C:
			// Send ping
			ping := &protocol.Message{
				Version: 1,
				Type:    protocol.TypePing,
				Data:    c.marshalData(protocol.PingMessage{Timestamp: time.Now().UnixMilli()}),
			}
			if err := c.sendMessage(ctx, ping); err != nil {
				c.logger.Error("Failed to send ping", zap.Error(err))
				return
			}
		}
	}
}

func (c *WSConnection) handleMessage(ctx context.Context, msg *protocol.Message) {
	switch msg.Type {
	case protocol.TypeJoin:
		c.handleJoin(ctx, msg)
	case protocol.TypeCreateRoom:
		c.handleCreateRoom(ctx, msg)
	case protocol.TypePong:
		// Handle pong - just log for now
		c.logger.Debug("Received pong")
	default:
		// Forward to room if connected
		if c.room != nil {
			c.room.SendMessage(c.userID, msg)
		} else {
			c.sendError(protocol.ErrorCodeState, "Not in a room")
		}
	}
}

func (c *WSConnection) handleJoin(ctx context.Context, msg *protocol.Message) {
	var joinMsg protocol.JoinMessage
	if err := msg.UnmarshalData(&joinMsg); err != nil {
		c.sendError(protocol.ErrorCodeValidation, "Invalid join message")
		return
	}

	// TODO: Implement room lookup by PIN and join logic
	// This would integrate with the Hub to find the room by PIN
	c.sendError(protocol.ErrorCodeNotFound, "Room not found")
}

func (c *WSConnection) handleCreateRoom(ctx context.Context, msg *protocol.Message) {
	var createMsg protocol.CreateRoomMessage
	if err := msg.UnmarshalData(&createMsg); err != nil {
		c.sendError(protocol.ErrorCodeValidation, "Invalid create room message")
		return
	}

	// TODO: Implement room creation logic
	// This would:
	// 1. Fetch quiz data from database
	// 2. Create new room
	// 3. Add to hub
	// 4. Join user as host
	c.sendError(protocol.ErrorCodeUnknown, "Room creation not implemented")
}

func (c *WSConnection) sendMessage(ctx context.Context, msg *protocol.Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	return c.conn.Write(ctx, websocket.MessageText, data)
}

func (c *WSConnection) sendError(code, message string) {
	errorMsg := protocol.NewErrorMessage(code, message)
	select {
	case c.sendChan <- errorMsg:
	default:
		c.logger.Warn("Send channel full, dropping error message")
	}
}

func (c *WSConnection) marshalData(data interface{}) json.RawMessage {
	bytes, _ := json.Marshal(data)
	return bytes
}

// Implement room.Connection interface
func (c *WSConnection) Send(message *protocol.Message) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.closed {
		return fmt.Errorf("connection closed")
	}
	
	select {
	case c.sendChan <- message:
		return nil
	default:
		return fmt.Errorf("send channel full")
	}
}

func (c *WSConnection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	if c.closed {
		return nil
	}
	
	c.closed = true
	close(c.closeChan)
	
	// Remove from room if connected
	if c.room != nil {
		c.room.RemoveMember(c.userID, "disconnected")
	}
	
	return c.conn.Close(websocket.StatusNormalClosure, "connection closed")
}

func (c *WSConnection) UserID() string {
	return c.userID
}

// Hub methods
func (h *Hub) AddRoom(room *room.Room) {
	h.roomsMutex.Lock()
	defer h.roomsMutex.Unlock()
	
	h.rooms[room.ID] = room
	h.logger.Info("Room added to hub", zap.String("room_id", room.ID))
}

func (h *Hub) RemoveRoom(roomID string) {
	h.roomsMutex.Lock()
	defer h.roomsMutex.Unlock()
	
	delete(h.rooms, roomID)
	h.logger.Info("Room removed from hub", zap.String("room_id", roomID))
}

func (h *Hub) GetRoom(roomID string) (*room.Room, bool) {
	h.roomsMutex.RLock()
	defer h.roomsMutex.RUnlock()
	
	room, exists := h.rooms[roomID]
	return room, exists
}

func (h *Hub) GetRoomByPIN(pin string) (*room.Room, bool) {
	h.roomsMutex.RLock()
	defer h.roomsMutex.RUnlock()
	
	for _, room := range h.rooms {
		if room.PIN == pin {
			return room, true
		}
	}
	return nil, false
}

func (g *WebSocketGateway) GetHub() *Hub {
	return g.hub
}
