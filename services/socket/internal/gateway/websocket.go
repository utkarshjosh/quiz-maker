package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"quiz-realtime-service/internal/api"
	"quiz-realtime-service/internal/auth"
	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/protocol"
	"quiz-realtime-service/internal/repository"
	"quiz-realtime-service/internal/room"
	"quiz-realtime-service/internal/store"

	"go.uber.org/zap"
	"nhooyr.io/websocket"
)

// Helper function to safely convert *string to string
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// buildStateMessage creates a state message with current room members
func (g *WebSocketGateway) buildStateMessage(room *models.QuizRoom, userID string) (*protocol.Message, error) {
	// Get room members from database
	members, err := g.roomRepo.GetRoomMembers(room.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room members: %w", err)
	}

	// Convert database members to protocol members
	protocolMembers := make([]protocol.Member, 0, len(members))
	for _, member := range members {
		protocolMembers = append(protocolMembers, protocol.Member{
			ID:          member.UserID,
			DisplayName: member.DisplayName,
			Role:        member.Role,
			Score:       0,    // TODO: Get actual score from answers
			IsOnline:    true, // TODO: Track online status
			JoinedAt:    member.JoinedAt.UnixMilli(),
			Picture:     getStringValue(member.Picture),
		})
	}

	// Parse room settings
	var settings models.RoomSettings
	if room.Settings != nil {
		if duration, ok := room.Settings["question_duration_ms"].(float64); ok {
			settings.QuestionDurationMs = int(duration)
		}
		if showCorrectness, ok := room.Settings["show_correctness"].(bool); ok {
			settings.ShowCorrectness = showCorrectness
		}
		if showLeaderboard, ok := room.Settings["show_leaderboard"].(bool); ok {
			settings.ShowLeaderboard = showLeaderboard
		}
		if allowReconnect, ok := room.Settings["allow_reconnect"].(bool); ok {
			settings.AllowReconnect = allowReconnect
		}
	}

	// Create state message
	stateMessage := protocol.StateMessage{
		Phase:          protocol.StateLobby,
		RoomID:         room.ID,
		PIN:            room.PIN,
		HostID:         room.HostID,
		QuestionIndex:  0,
		TotalQuestions: 0, // Will be set when quiz starts
		Members:        protocolMembers,
		Settings: protocol.QuizSettings{
			QuestionDuration: settings.QuestionDurationMs,
			ShowCorrectness:  settings.ShowCorrectness,
			ShowLeaderboard:  settings.ShowLeaderboard,
			AllowReconnect:   settings.AllowReconnect,
		},
	}

	return protocol.NewMessage(protocol.TypeState, stateMessage)
}

type WebSocketGateway struct {
	auth      auth.AuthServiceInterface
	hub       *Hub
	logger    *zap.Logger
	roomRepo  *repository.RoomRepository
	store     *store.RedisStore
	apiClient *api.Client
}

type Hub struct {
	rooms      map[string]*room.Room
	roomsMutex sync.RWMutex

	// Connection registry to track active WebSocket connections
	connections      map[string]*WSConnection // userID -> connection
	connectionsMutex sync.RWMutex

	logger *zap.Logger
}

type WSConnection struct {
	conn     *websocket.Conn
	userID   string
	user     *models.User
	room     *room.Room
	logger   *zap.Logger
	roomRepo *repository.RoomRepository
	gateway  *WebSocketGateway

	sendChan  chan *protocol.Message
	closeChan chan struct{}
	closed    bool
	mu        sync.Mutex
}

func NewWebSocketGateway(authService auth.AuthServiceInterface, roomRepo *repository.RoomRepository, store *store.RedisStore, apiClient *api.Client, logger *zap.Logger) *WebSocketGateway {
	return &WebSocketGateway{
		auth: authService,
		hub: &Hub{
			rooms:       make(map[string]*room.Room),
			connections: make(map[string]*WSConnection),
			logger:      logger.With(zap.String("component", "hub")),
		},
		logger:    logger.With(zap.String("component", "ws_gateway")),
		roomRepo:  roomRepo,
		store:     store,
		apiClient: apiClient,
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
		gateway:   g,
		sendChan:  make(chan *protocol.Message, 100),
		closeChan: make(chan struct{}),
	}

	g.logger.Info("WebSocket connection established",
		zap.String("user_id", user.ID),
		zap.String("username", user.Username))

	// Handle connection with background context
	wsConn.handle(context.Background())
}

func (c *WSConnection) handle(ctx context.Context) {
	// Create a new context that won't be cancelled
	connCtx := context.Background()

	// Register connection with hub
	c.gateway.hub.RegisterConnection(c)
	c.logger.Info("Connection registered with hub")

	// Start send goroutine
	go c.sendLoop(connCtx)

	// Start read loop
	c.readLoop(connCtx)

	// Close connection when read loop ends
	c.Close()
}

func (c *WSConnection) readLoop(ctx context.Context) {
	c.logger.Info("Starting read loop")
	defer c.logger.Info("Read loop ended")

	for {
		// Set read deadline
		readCtx, cancel := context.WithTimeout(ctx, 60*time.Second)

		// Use a channel to handle the read operation
		type readResult struct {
			data []byte
			err  error
		}

		resultChan := make(chan readResult, 1)
		go func() {
			_, data, err := c.conn.Read(readCtx)
			resultChan <- readResult{data, err}
		}()

		select {
		case <-ctx.Done():
			cancel()
			c.logger.Info("Context cancelled, stopping read loop")
			return
		case <-c.closeChan:
			cancel()
			c.logger.Info("Close channel signalled, stopping read loop")
			return
		case result := <-resultChan:
			cancel()

			if result.err != nil {
				if websocket.CloseStatus(result.err) == websocket.StatusNormalClosure {
					c.logger.Info("WebSocket closed normally")
				} else {
					c.logger.Error("WebSocket read error",
						zap.Error(result.err),
						zap.String("close_status", websocket.CloseStatus(result.err).String()))
				}
				return
			}

			c.logger.Debug("Received raw message",
				zap.String("data", string(result.data)),
				zap.Int("length", len(result.data)))

			// Parse message
			var msg protocol.Message
			if err := json.Unmarshal(result.data, &msg); err != nil {
				c.logger.Warn("Invalid message format",
					zap.Error(err),
					zap.String("raw_data", string(result.data)))
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
	case protocol.TypeLeave:
		c.logger.Info("Processing leave message")
		c.handleLeave(ctx, msg)
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
	case protocol.TypeStart, protocol.TypeAnswer, protocol.TypeKick:
		if c.room == nil {
			c.logger.Warn("Received gameplay message without active room", zap.String("type", msg.Type))
			c.sendError(protocol.ErrorCodeState, "Not in a room")
			return
		}

		// Update room status when host starts the quiz
		if msg.Type == protocol.TypeStart {
			if err := c.roomRepo.UpdateRoomStatus(c.room.ID, "active"); err != nil {
				c.logger.Error("Failed to update room status to active",
					zap.Error(err),
					zap.String("room_id", c.room.ID))
			}
		}

		c.room.SendMessage(c.userID, msg)
	default:
		c.logger.Warn("Unknown message type", zap.String("type", msg.Type))
		c.sendError(protocol.ErrorCodeValidation, "Unknown message type")
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

	// Add user to room as a member
	err = c.roomRepo.AddMember(room.ID, c.userID, joinMsg.DisplayName, "player")
	if err != nil {
		c.logger.Error("Failed to add member to room",
			zap.Error(err),
			zap.String("room_id", room.ID),
			zap.String("user_id", c.userID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to join room")
		return
	}

	gameRoom, exists := c.gateway.hub.GetRoom(room.ID)
	if !exists {
		c.logger.Error("Runtime room not found in hub", zap.String("room_id", room.ID))
		c.sendError(protocol.ErrorCodeState, "Room is not ready yet")
		// Attempt to keep database consistent
		_ = c.roomRepo.RemoveMember(room.ID, c.userID, "runtime room missing")
		return
	}

	// Attach runtime room to connection
	c.room = gameRoom

	if err := gameRoom.AddMember(c.userID, joinMsg.DisplayName, c); err != nil {
		c.logger.Error("Failed to add member to runtime room",
			zap.Error(err),
			zap.String("room_id", room.ID),
			zap.String("user_id", c.userID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to join room")
		_ = c.roomRepo.RemoveMember(room.ID, c.userID, "failed to join runtime room")
		return
	}

	// Send runtime state snapshot directly to this connection
	if stateMsg, err := gameRoom.BuildStateMessage(); err != nil {
		c.logger.Error("Failed to build runtime state message",
			zap.Error(err),
			zap.String("room_id", room.ID))
	} else {
		if err := c.Send(stateMsg); err != nil {
			c.logger.Error("Failed to send runtime state message",
				zap.Error(err),
				zap.String("room_id", room.ID),
				zap.String("user_id", c.userID))
		}
	}

	// Send success response using the new buildStateMessage function
	responseMsg, err := c.gateway.buildStateMessage(room, c.userID)
	if err != nil {
		c.logger.Error("Failed to build state message",
			zap.Error(err),
			zap.String("room_id", room.ID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to build state message")
		return
	}

	// Send state to the joining user
	c.sendMessage(ctx, responseMsg)

	// CRITICAL: Broadcast updated state to ALL existing members in the room
	c.logger.Info("Broadcasting state update to all room members after join")
	if err := c.gateway.hub.BroadcastToRoomMembers(ctx, room.ID, responseMsg, c.roomRepo); err != nil {
		c.logger.Error("Failed to broadcast state to room members", zap.Error(err))
	}

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

	// Create room in database with host's actual display name
	dbRoom, err := c.roomRepo.CreateRoom(c.userID, createMsg.QuizID, c.user.Username, settings)
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

	// Load quiz questions for real-time room
	questions, err := c.roomRepo.GetQuizQuestions(createMsg.QuizID)
	if err != nil {
		c.logger.Error("Failed to load quiz questions",
			zap.Error(err),
			zap.String("quiz_id", createMsg.QuizID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to load quiz questions")
		return
	}

	roomQuestions := make([]room.Question, 0, len(questions))
	for _, q := range questions {
		roomQuestions = append(roomQuestions, room.Question{
			Index:         q.Index,
			Question:      q.QuestionText,
			Options:       q.Options,
			CorrectAnswer: q.CorrectAnswer,
			CorrectIndex:  q.CorrectIndex,
			Explanation:   q.Explanation,
		})
	}

	roomQuizData := &room.QuizData{
		ID:        quiz.ID,
		Title:     quiz.Title,
		Questions: roomQuestions,
	}

	roomSettings := &room.QuizSettings{
		QuestionDuration: settings.QuestionDurationMs,
		ShowCorrectness:  settings.ShowCorrectness,
		ShowLeaderboard:  settings.ShowLeaderboard,
		AllowReconnect:   settings.AllowReconnect,
	}

	// Create in-memory game room and register with hub
	gameRoom := room.NewRoomFromExisting(
		dbRoom.ID,
		dbRoom.PIN,
		createMsg.QuizID,
		c.userID,
		roomQuizData,
		roomSettings,
		c.gateway.store,
		c.gateway.apiClient,
		c.logger,
	)

	c.gateway.hub.AddRoom(gameRoom)
	c.room = gameRoom

	// Register host connection with the room
	if err := gameRoom.AddMember(c.userID, c.user.Username, c); err != nil {
		c.logger.Error("Failed to add host to room",
			zap.Error(err),
			zap.String("room_id", dbRoom.ID),
			zap.String("user_id", c.userID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to initialize room")
		return
	}

	// Send runtime state snapshot to the host immediately
	if stateMsg, err := gameRoom.BuildStateMessage(); err != nil {
		c.logger.Error("Failed to build runtime state message for host",
			zap.Error(err),
			zap.String("room_id", dbRoom.ID))
	} else {
		if err := c.Send(stateMsg); err != nil {
			c.logger.Error("Failed to send runtime state message to host",
				zap.Error(err),
				zap.String("room_id", dbRoom.ID),
				zap.String("user_id", c.userID))
		}
	}

	// Start room event loop
	go gameRoom.Run(context.Background())

	// Send success response using the new buildStateMessage function
	responseMsg, err := c.gateway.buildStateMessage(dbRoom, c.userID)
	if err != nil {
		c.logger.Error("Failed to build state message",
			zap.Error(err),
			zap.String("room_id", dbRoom.ID))
		c.sendError(protocol.ErrorCodeUnknown, "Failed to build state message")
		return
	}

	c.sendMessage(ctx, responseMsg)

	c.logger.Info("Room created successfully",
		zap.String("room_id", dbRoom.ID),
		zap.String("pin", dbRoom.PIN),
		zap.String("host_id", c.userID))
}

func (c *WSConnection) handleLeave(ctx context.Context, msg *protocol.Message) {
	c.logger.Info("Processing leave request")

	if c.room == nil {
		c.logger.Warn("User not in a room")
		c.sendError(protocol.ErrorCodeState, "Not in a room")
		return
	}

	roomID := c.room.ID
	isHost := c.userID == c.room.HostID

	c.logger.Info("User leaving room",
		zap.String("room_id", roomID),
		zap.String("user_id", c.userID),
		zap.Bool("is_host", isHost))

	// Remove member from database
	err := c.roomRepo.RemoveMember(roomID, c.userID, "user_left")
	if err != nil {
		c.logger.Error("Failed to remove member from room",
			zap.Error(err),
			zap.String("room_id", roomID),
			zap.String("user_id", c.userID))
	}

	// If host is leaving, transfer host role to next member
	var newHostID string
	if isHost {
		c.logger.Info("Host is leaving, attempting to transfer host role",
			zap.String("room_id", roomID),
			zap.String("old_host_id", c.userID))

		newHostID, err = c.roomRepo.TransferHost(roomID, c.userID)
		if err != nil {
			// No members left to transfer to - room will close
			c.logger.Info("No remaining members for host transfer, closing room",
				zap.String("room_id", roomID),
				zap.Error(err))

			// Delete the room
			if deleteErr := c.roomRepo.DeleteRoom(roomID); deleteErr != nil {
				c.logger.Error("Failed to delete room after host left", zap.Error(deleteErr))
			} else {
				c.logger.Info("Room deleted after host left with no remaining members",
					zap.String("room_id", roomID))
			}
		} else {
			c.logger.Info("Host role transferred successfully",
				zap.String("room_id", roomID),
				zap.String("old_host_id", c.userID),
				zap.String("new_host_id", newHostID))
		}
	}

	// Broadcast to other members that this user left
	leftData := protocol.LeftMessage{UserID: c.userID, Reason: "user_left"}
	leftMsg, err := protocol.NewMessage(protocol.TypeLeft, leftData)
	if err != nil {
		c.logger.Error("Failed to create left message", zap.Error(err))
		return
	}

	// Broadcast to all members in the room (except the leaving user)
	if err := c.gateway.hub.BroadcastToRoomMembers(ctx, roomID, leftMsg, c.roomRepo); err != nil {
		c.logger.Error("Failed to broadcast leave message", zap.Error(err))
	}

	// Remove from runtime room
	if c.room != nil {
		c.room.RemoveMember(c.userID, "user_left")
		c.room = nil
	}

	// If host was transferred, send notifications to all remaining members
	if newHostID != "" {
		c.logger.Info("Broadcasting host transfer and updated state")

		// Get new host's display name for the message
		members, memberErr := c.roomRepo.GetRoomMembers(roomID)
		var newHostName string
		if memberErr != nil {
			c.logger.Error("Failed to fetch room members for host transfer", zap.Error(memberErr))
		} else {
			for _, member := range members {
				if member.UserID == newHostID {
					newHostName = member.DisplayName
					break
				}
			}
		}

		// Send dedicated HOST_TRANSFER message
		hostTransferData := protocol.HostTransferMessage{
			OldHostID:   c.userID,
			NewHostID:   newHostID,
			NewHostName: newHostName,
			RoomID:      roomID,
		}
		hostTransferMsg, err := protocol.NewMessage(protocol.TypeHostTransfer, hostTransferData)
		if err != nil {
			c.logger.Error("Failed to create host transfer message", zap.Error(err))
		} else {
			if err := c.gateway.hub.BroadcastToRoomMembers(ctx, roomID, hostTransferMsg, c.roomRepo); err != nil {
				c.logger.Error("Failed to broadcast host transfer message", zap.Error(err))
			} else {
				c.logger.Info("Host transfer message broadcasted",
					zap.String("new_host_id", newHostID),
					zap.String("new_host_name", newHostName))
			}
		}

		// Also send updated STATE message with new host
		room, err := c.roomRepo.GetRoomByID(roomID)
		if err != nil {
			c.logger.Error("Failed to get room for state update", zap.Error(err))
		} else {
			stateMsg, err := c.gateway.buildStateMessage(room, newHostID)
			if err != nil {
				c.logger.Error("Failed to build state message after host transfer", zap.Error(err))
			} else {
				if err := c.gateway.hub.BroadcastToRoomMembers(ctx, roomID, stateMsg, c.roomRepo); err != nil {
					c.logger.Error("Failed to broadcast state after host transfer", zap.Error(err))
				} else {
					c.logger.Info("State message broadcasted after host transfer")
				}
			}
		}
	}

	// Clear room from connection
	c.room = nil

	// Send confirmation to the leaving user
	c.sendMessage(ctx, leftMsg)

	c.logger.Info("User left room successfully",
		zap.String("room_id", roomID),
		zap.String("user_id", c.userID),
		zap.Bool("was_host", isHost),
		zap.String("new_host_id", newHostID))
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

	// Unregister connection from hub
	c.gateway.hub.UnregisterConnection(c.userID)
	c.logger.Info("Connection unregistered from hub")

	// Remove from room if connected
	if c.room != nil {
		c.room.RemoveMember(c.userID, "disconnected")
		c.room = nil
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

// Connection registry methods
func (h *Hub) RegisterConnection(conn *WSConnection) {
	h.connectionsMutex.Lock()
	defer h.connectionsMutex.Unlock()

	h.connections[conn.userID] = conn
	h.logger.Info("Connection registered",
		zap.String("user_id", conn.userID),
		zap.Int("total_connections", len(h.connections)))
}

func (h *Hub) UnregisterConnection(userID string) {
	h.connectionsMutex.Lock()
	defer h.connectionsMutex.Unlock()

	delete(h.connections, userID)
	h.logger.Info("Connection unregistered",
		zap.String("user_id", userID),
		zap.Int("total_connections", len(h.connections)))
}

func (h *Hub) GetConnection(userID string) (*WSConnection, bool) {
	h.connectionsMutex.RLock()
	defer h.connectionsMutex.RUnlock()

	conn, exists := h.connections[userID]
	return conn, exists
}

// BroadcastToRoomMembers sends a message to all members of a room
func (h *Hub) BroadcastToRoomMembers(ctx context.Context, roomID string, msg *protocol.Message, roomRepo *repository.RoomRepository) error {
	// Get all members from database
	members, err := roomRepo.GetRoomMembers(roomID)
	if err != nil {
		h.logger.Error("Failed to get room members for broadcast",
			zap.Error(err),
			zap.String("room_id", roomID))
		return err
	}

	h.connectionsMutex.RLock()
	defer h.connectionsMutex.RUnlock()

	sentCount := 0
	for _, member := range members {
		if conn, exists := h.connections[member.UserID]; exists {
			if err := conn.Send(msg); err != nil {
				h.logger.Warn("Failed to send message to member",
					zap.String("user_id", member.UserID),
					zap.Error(err))
			} else {
				sentCount++
			}
		} else {
			h.logger.Debug("Member not connected",
				zap.String("user_id", member.UserID))
		}
	}

	h.logger.Info("Broadcasted message to room members",
		zap.String("room_id", roomID),
		zap.String("msg_type", msg.Type),
		zap.Int("total_members", len(members)),
		zap.Int("sent_to", sentCount))

	return nil
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
