package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"quiz-realtime-service/internal/auth"
	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/protocol"
	"quiz-realtime-service/internal/repository"
	"quiz-realtime-service/internal/room"

	"go.uber.org/zap"
	"nhooyr.io/websocket"
)

type WebSocketGateway struct {
	auth   auth.AuthServiceInterface
	hub    *Hub
	logger *zap.Logger
	roomRepo *repository.RoomRepository
}

type Hub struct {
	rooms      map[string]*room.Room
	roomsMutex sync.RWMutex
	logger     *zap.Logger
}

type WSConnection struct {
	conn   *websocket.Conn
	userID string
	user   *models.User
	room   *SimpleRoom
	logger *zap.Logger
	roomRepo *repository.RoomRepository
	
	sendChan chan *protocol.Message
	closeChan chan struct{}
	closed   bool
	mu       sync.Mutex
}

// SimpleRoom represents a basic room structure for WebSocket connections
type SimpleRoom struct {
	ID       string
	PIN      string
	HostID   string
	QuizID   string
	Settings models.RoomSettings
	Members  map[string]*SimpleMember
}

// SimpleMember represents a member in a simple room
type SimpleMember struct {
	ID          string
	DisplayName string
	Role        string
	IsOnline    bool
	JoinedAt    time.Time
}

// SendMessage is a placeholder method for SimpleRoom
func (r *SimpleRoom) SendMessage(userID string, msg *protocol.Message) {
	// TODO: Implement message forwarding to room members
}

// RemoveMember is a placeholder method for SimpleRoom
func (r *SimpleRoom) RemoveMember(userID, reason string) {
	// TODO: Implement member removal
	delete(r.Members, userID)
}

func NewWebSocketGateway(authService auth.AuthServiceInterface, roomRepo *repository.RoomRepository, logger *zap.Logger) *WebSocketGateway {
	return &WebSocketGateway{
		auth: authService,
		hub: &Hub{
			rooms:  make(map[string]*room.Room),
			logger: logger.With(zap.String("component", "hub")),
		},
		logger: logger.With(zap.String("component", "ws_gateway")),
		roomRepo: roomRepo,
	}
}

func (g *WebSocketGateway) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	g.logger.Info("WebSocket connection attempt", 
		zap.String("remote_addr", r.RemoteAddr),
		zap.String("user_agent", r.UserAgent()),
		zap.String("origin", r.Header.Get("Origin")))

	// Authenticate user
	user, err := g.auth.AuthenticateWebSocket(r)
	if err != nil {
		g.logger.Warn("WebSocket authentication failed", 
			zap.Error(err),
			zap.String("remote_addr", r.RemoteAddr),
			zap.String("auth_header", r.Header.Get("Authorization")))
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	g.logger.Info("User authenticated successfully", 
		zap.String("user_id", user.ID),
		zap.String("username", user.Username),
		zap.String("email", user.Email))

	// Upgrade connection
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"}, // Configure based on your needs
		Subprotocols:   []string{"quiz-protocol"},
	})
	if err != nil {
		g.logger.Error("Failed to upgrade WebSocket", 
			zap.Error(err),
			zap.String("user_id", user.ID))
		return
	}

	g.logger.Info("WebSocket upgraded successfully", 
		zap.String("user_id", user.ID),
		zap.String("subprotocol", conn.Subprotocol()))

	// Create WebSocket connection wrapper
	wsConn := &WSConnection{
		conn:      conn,
		userID:    user.ID,
		user:      user,
		logger:    g.logger.With(zap.String("user_id", user.ID)),
		roomRepo:  g.roomRepo,
		sendChan:  make(chan *protocol.Message, 100),
		closeChan: make(chan struct{}),
	}

	g.logger.Info("WebSocket connection established", 
		zap.String("user_id", user.ID),
		zap.String("username", user.Username))

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
	c.logger.Info("Starting read loop")
	defer c.logger.Info("Read loop ended")

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Context cancelled, stopping read loop")
			return
		case <-c.closeChan:
			c.logger.Info("Close channel signalled, stopping read loop")
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
				c.logger.Error("WebSocket read error", 
					zap.Error(err),
					zap.String("close_status", websocket.CloseStatus(err).String()))
			}
			return
		}

		c.logger.Debug("Received raw message", 
			zap.String("data", string(data)),
			zap.Int("length", len(data)))

		// Parse message
		var msg protocol.Message
		if err := json.Unmarshal(data, &msg); err != nil {
			c.logger.Warn("Invalid message format", 
				zap.Error(err),
				zap.String("raw_data", string(data)))
			c.sendError(protocol.ErrorCodeValidation, "Invalid message format")
			continue
		}

		c.logger.Info("Received message", 
			zap.String("type", msg.Type),
			zap.String("msg_id", msg.MsgID),
			zap.Int("version", msg.Version))

		// Handle message
		c.handleMessage(ctx, &msg)
	}
}

func (c *WSConnection) sendLoop(ctx context.Context) {
	c.logger.Info("Starting send loop")
	defer c.logger.Info("Send loop ended")

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Context cancelled, stopping send loop")
			return
		case <-c.closeChan:
			c.logger.Info("Close channel signalled, stopping send loop")
			return
		case msg := <-c.sendChan:
			c.logger.Debug("Sending message from channel", 
				zap.String("type", msg.Type),
				zap.String("msg_id", msg.MsgID))
			if err := c.sendMessage(ctx, msg); err != nil {
				c.logger.Error("Failed to send message", 
					zap.Error(err),
					zap.String("type", msg.Type),
					zap.String("msg_id", msg.MsgID))
				return
			}
		case <-ticker.C:
			// Send ping
			c.logger.Debug("Sending ping message")
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
	c.logger.Info("Handling message", 
		zap.String("type", msg.Type),
		zap.String("msg_id", msg.MsgID))

	switch msg.Type {
	case protocol.TypeJoin:
		c.logger.Info("Processing join message")
		c.handleJoin(ctx, msg)
	case protocol.TypeCreateRoom:
		c.logger.Info("Processing create room message")
		c.handleCreateRoom(ctx, msg)
	case protocol.TypePong:
		// Handle pong - just log for now
		c.logger.Debug("Received pong message")
	case protocol.TypePing:
		c.logger.Debug("Received ping message, sending pong")
		pong := &protocol.Message{
			Version: 1,
			Type:    protocol.TypePong,
			Data:    c.marshalData(protocol.PongMessage{Timestamp: time.Now().UnixMilli()}),
		}
		c.sendMessage(ctx, pong)
	default:
		c.logger.Warn("Unknown message type", zap.String("type", msg.Type))
		// Forward to room if connected
		if c.room != nil {
			c.logger.Debug("Forwarding message to room", zap.String("room_id", c.room.ID))
			c.room.SendMessage(c.userID, msg)
		} else {
			c.logger.Warn("Not in a room, cannot forward message")
			c.sendError(protocol.ErrorCodeState, "Not in a room")
		}
	}
}

func (c *WSConnection) handleJoin(ctx context.Context, msg *protocol.Message) {
	c.logger.Info("Processing join request")
	
	var joinMsg protocol.JoinMessage
	if err := msg.UnmarshalData(&joinMsg); err != nil {
		c.logger.Warn("Invalid join message format", 
			zap.Error(err),
			zap.String("msg_id", msg.MsgID))
		c.sendError(protocol.ErrorCodeValidation, "Invalid join message")
		return
	}

	c.logger.Info("Join message parsed successfully", 
		zap.String("pin", joinMsg.PIN),
		zap.String("display_name", joinMsg.DisplayName))

	// Look up room by PIN
	room, err := c.roomRepo.GetRoomByPIN(joinMsg.PIN)
	if err != nil {
		c.logger.Warn("Room not found by PIN", 
			zap.String("pin", joinMsg.PIN),
			zap.Error(err))
		c.sendError(protocol.ErrorCodeNotFound, "Room not found")
		return
	}

	c.logger.Info("Room found", 
		zap.String("room_id", room.ID),
		zap.String("pin", room.PIN),
		zap.String("host_id", room.HostID))

	// TODO: Implement full room joining logic
	// For now, just send a success response
	response := protocol.StateMessage{
		Phase:          protocol.StateLobby,
		RoomID:         room.ID,
		PIN:            room.PIN,
		HostID:         room.HostID,
		QuestionIndex:  0,
		TotalQuestions: 0,
		Members:        []protocol.Member{},
		Settings: protocol.QuizSettings{
			QuestionDuration: 30000,
			ShowCorrectness:  true,
			ShowLeaderboard:  true,
			AllowReconnect:   true,
		},
	}

	responseMsg, _ := protocol.NewMessage(protocol.TypeState, response)
	c.sendMessage(ctx, responseMsg)

	c.logger.Info("Join request processed successfully", 
		zap.String("room_id", room.ID),
		zap.String("user_id", c.userID))
}

func (c *WSConnection) handleCreateRoom(ctx context.Context, msg *protocol.Message) {
	c.logger.Info("Processing create room request")
	
	var createMsg protocol.CreateRoomMessage
	if err := msg.UnmarshalData(&createMsg); err != nil {
		c.logger.Warn("Invalid create room message format", 
			zap.Error(err),
			zap.String("msg_id", msg.MsgID))
		c.sendError(protocol.ErrorCodeValidation, "Invalid create room message")
		return
	}

	c.logger.Info("Create room message parsed successfully", 
		zap.String("quiz_id", createMsg.QuizID),
		zap.Any("settings", createMsg.Settings))

	// Validate quiz exists
	quiz, err := c.roomRepo.GetQuiz(createMsg.QuizID)
	if err != nil {
		c.logger.Warn("Quiz not found", 
			zap.String("quiz_id", createMsg.QuizID), 
			zap.Error(err))
		c.sendError(protocol.ErrorCodeNotFound, "Quiz not found")
		return
	}

	c.logger.Info("Quiz found", 
		zap.String("quiz_id", quiz.ID),
		zap.String("title", quiz.Title),
		zap.Int("total_questions", quiz.TotalQuestions))

	// Parse settings with defaults
	settings := parseRoomSettings(createMsg.Settings)
	c.logger.Info("Room settings parsed", 
		zap.Int("question_duration_ms", settings.QuestionDurationMs),
		zap.Bool("show_correctness", settings.ShowCorrectness),
		zap.Bool("show_leaderboard", settings.ShowLeaderboard),
		zap.Bool("allow_reconnect", settings.AllowReconnect),
		zap.Int("max_players", settings.MaxPlayers))

	// Create room in database
	dbRoom, err := c.roomRepo.CreateRoom(c.userID, createMsg.QuizID, settings)
	if err != nil {
		c.logger.Error("Failed to create room", 
			zap.Error(err),
			zap.String("quiz_id", createMsg.QuizID),
			zap.String("user_id", c.userID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to create room")
		return
	}

	c.logger.Info("Room created in database", 
		zap.String("room_id", dbRoom.ID),
		zap.String("pin", dbRoom.PIN),
		zap.String("host_id", dbRoom.HostID))

	// For now, we'll create a simple room structure without the complex room package
	// TODO: Integrate with the full room package when Redis is properly configured
	
	// Set the room in the connection so it can be used for future messages
	c.room = &SimpleRoom{
		ID:       dbRoom.ID,
		PIN:      dbRoom.PIN,
		HostID:   c.userID,
		QuizID:   createMsg.QuizID,
		Settings: settings,
		Members:  make(map[string]*SimpleMember),
	}
	
	// Add host as member
	c.room.Members[c.userID] = &SimpleMember{
		ID:          c.userID,
		DisplayName: c.user.Username,
		Role:        "host",
		IsOnline:    true,
		JoinedAt:    time.Now(),
	}

	// Send success response
	response := protocol.StateMessage{
		Phase:          protocol.StateLobby,
		RoomID:         dbRoom.ID,
		PIN:            dbRoom.PIN,
		HostID:         c.userID,
		QuestionIndex:  0,
		TotalQuestions: 0, // Will be set when quiz starts
		Members:        []protocol.Member{
			{
				ID:          c.userID,
				DisplayName: c.user.Username,
				Role:        "host",
				Score:       0,
				IsOnline:    true,
				JoinedAt:    time.Now().UnixMilli(),
			},
		},
		Settings: protocol.QuizSettings{
			QuestionDuration: settings.QuestionDurationMs,
			ShowCorrectness:  settings.ShowCorrectness,
			ShowLeaderboard:  settings.ShowLeaderboard,
			AllowReconnect:   settings.AllowReconnect,
		},
	}

	responseMsg, _ := protocol.NewMessage(protocol.TypeState, response)
	c.sendMessage(ctx, responseMsg)

	c.logger.Info("Room created successfully", 
		zap.String("room_id", dbRoom.ID),
		zap.String("pin", dbRoom.PIN),
		zap.String("host_id", c.userID))
}

func (c *WSConnection) sendMessage(ctx context.Context, msg *protocol.Message) error {
	c.logger.Debug("Sending message", 
		zap.String("type", msg.Type),
		zap.String("msg_id", msg.MsgID),
		zap.Int("version", msg.Version))

	data, err := json.Marshal(msg)
	if err != nil {
		c.logger.Error("Failed to marshal message", 
			zap.Error(err),
			zap.String("type", msg.Type))
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	c.logger.Debug("Message marshaled", 
		zap.String("data", string(data)),
		zap.Int("length", len(data)))

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	err = c.conn.Write(ctx, websocket.MessageText, data)
	if err != nil {
		c.logger.Error("Failed to write message to WebSocket", 
			zap.Error(err),
			zap.String("type", msg.Type),
			zap.String("msg_id", msg.MsgID))
		return err
	}

	c.logger.Debug("Message sent successfully", 
		zap.String("type", msg.Type),
		zap.String("msg_id", msg.MsgID))

	return nil
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

// parseRoomSettings parses room settings from the request with defaults
func parseRoomSettings(settings map[string]interface{}) models.RoomSettings {
	defaults := models.DefaultRoomSettings()
	
	result := models.RoomSettings{
		QuestionDurationMs: defaults.QuestionDurationMs,
		ShowCorrectness:    defaults.ShowCorrectness,
		ShowLeaderboard:    defaults.ShowLeaderboard,
		AllowReconnect:     defaults.AllowReconnect,
		MaxPlayers:         defaults.MaxPlayers,
	}
	
	if duration, ok := settings["question_duration_ms"].(float64); ok {
		result.QuestionDurationMs = int(duration)
	}
	if showCorrectness, ok := settings["show_correctness"].(bool); ok {
		result.ShowCorrectness = showCorrectness
	}
	if showLeaderboard, ok := settings["show_leaderboard"].(bool); ok {
		result.ShowLeaderboard = showLeaderboard
	}
	if allowReconnect, ok := settings["allow_reconnect"].(bool); ok {
		result.AllowReconnect = allowReconnect
	}
	if maxPlayers, ok := settings["max_players"].(float64); ok {
		result.MaxPlayers = int(maxPlayers)
	}
	
	return result
}
