package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/redis"
	"quiz-realtime-service/internal/websocket"
)

type QuizHandler struct {
	redisClient *redis.RedisClient
	hub         *websocket.Hub
}

func NewQuizHandler(redisClient *redis.RedisClient, hub *websocket.Hub) *QuizHandler {
	return &QuizHandler{
		redisClient: redisClient,
		hub:         hub,
	}
}

// CreateRoom creates a new quiz room
func (h *QuizHandler) CreateRoom(c *gin.Context) {
	var req struct {
		QuizID     string `json:"quiz_id" binding:"required"`
		HostID     string `json:"host_id" binding:"required"`
		MaxPlayers int    `json:"max_players"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default max players if not provided
	if req.MaxPlayers == 0 {
		req.MaxPlayers = 50
	}

	// Create new room
	room := &models.QuizRoom{
		ID:         uuid.New().String(),
		QuizID:     req.QuizID,
		HostID:     req.HostID,
		MaxPlayers: req.MaxPlayers,
		Status:     "waiting",
		CreatedAt:  time.Now(),
		Players:    []models.Player{},
	}

	// Save room to Redis
	if err := h.redisClient.SaveQuizRoom(room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create room"})
		return
	}

	// Initialize quiz state
	quizState := &models.QuizState{
		RoomID:         room.ID,
		CurrentQuestion: 0,
		Status:         "waiting",
	}

	if err := h.redisClient.SaveQuizState(quizState); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize quiz state"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"room_id":     room.ID,
		"quiz_id":     room.QuizID,
		"host_id":     room.HostID,
		"max_players": room.MaxPlayers,
		"status":      room.Status,
		"created_at":  room.CreatedAt,
	})
}

// GetRoom retrieves room information
func (h *QuizHandler) GetRoom(c *gin.Context) {
	roomID := c.Param("roomId")

	room, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Get current player count from WebSocket hub
	playerCount := h.hub.GetRoomPlayerCount(roomID)

	c.JSON(http.StatusOK, gin.H{
		"room_id":       room.ID,
		"quiz_id":       room.QuizID,
		"host_id":       room.HostID,
		"max_players":   room.MaxPlayers,
		"status":        room.Status,
		"created_at":    room.CreatedAt,
		"player_count":  playerCount,
		"players":       room.Players,
	})
}

// DeleteRoom removes a quiz room
func (h *QuizHandler) DeleteRoom(c *gin.Context) {
	roomID := c.Param("roomId")

	// Check if room exists
	_, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Delete room from Redis
	if err := h.redisClient.DeleteQuizRoom(roomID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete room"})
		return
	}

	// TODO: Notify all connected clients that the room is being deleted
	message := &models.WebSocketMessage{
		Type:      "room_deleted",
		Data:      map[string]string{"room_id": roomID},
		Timestamp: time.Now(),
	}
	h.hub.BroadcastToRoom(roomID, message)

	c.JSON(http.StatusOK, gin.H{"message": "Room deleted successfully"})
}

// GetRoomPlayers returns all players in a room
func (h *QuizHandler) GetRoomPlayers(c *gin.Context) {
	roomID := c.Param("roomId")

	room, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Get real-time player count from WebSocket hub
	connectedCount := h.hub.GetRoomPlayerCount(roomID)

	c.JSON(http.StatusOK, gin.H{
		"room_id":         roomID,
		"players":         room.Players,
		"connected_count": connectedCount,
		"total_players":   len(room.Players),
	})
}

// StartQuiz starts a quiz in a room
func (h *QuizHandler) StartQuiz(c *gin.Context) {
	roomID := c.Param("roomId")

	// Get room
	room, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Check if room is in waiting state
	if room.Status != "waiting" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quiz has already started or finished"})
		return
	}

	// Get quiz data
	quiz, err := h.redisClient.GetQuiz(room.QuizID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	// Update room status
	room.Status = "active"
	if err := h.redisClient.SaveQuizRoom(room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update room status"})
		return
	}

	// Update quiz state
	quizState := &models.QuizState{
		RoomID:            roomID,
		CurrentQuestion:   0,
		TotalQuestions:    len(quiz.Questions),
		Status:            "question",
		QuestionStarted:   time.Now(),
		QuestionTimeLimit: quiz.TimeLimit,
	}

	if err := h.redisClient.SaveQuizState(quizState); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz state"})
		return
	}

	// Broadcast quiz start to all players
	message := &models.WebSocketMessage{
		Type: models.MessageTypeQuizStarted,
		Data: map[string]interface{}{
			"room_id":        roomID,
			"quiz_id":        room.QuizID,
			"total_questions": len(quiz.Questions),
			"time_limit":     quiz.TimeLimit,
		},
		Timestamp: time.Now(),
	}
	h.hub.BroadcastToRoom(roomID, message)

	// Send first question
	if len(quiz.Questions) > 0 {
		h.broadcastQuestion(roomID, &quiz.Questions[0], 0)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Quiz started successfully",
		"room_id":       roomID,
		"quiz_id":       room.QuizID,
		"total_questions": len(quiz.Questions),
	})
}

// NextQuestion advances to the next question
func (h *QuizHandler) NextQuestion(c *gin.Context) {
	roomID := c.Param("roomId")

	// Get current quiz state
	quizState, err := h.redisClient.GetQuizState(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz state not found"})
		return
	}

	// Get quiz data
	room, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	quiz, err := h.redisClient.GetQuiz(room.QuizID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	// Check if there are more questions
	if quizState.CurrentQuestion >= len(quiz.Questions)-1 {
		// Quiz finished
		return h.EndQuiz(c)
	}

	// Move to next question
	quizState.CurrentQuestion++
	quizState.QuestionStarted = time.Now()
	quizState.Status = "question"

	if err := h.redisClient.SaveQuizState(quizState); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quiz state"})
		return
	}

	// Broadcast next question
	question := &quiz.Questions[quizState.CurrentQuestion]
	h.broadcastQuestion(roomID, question, quizState.CurrentQuestion)

	c.JSON(http.StatusOK, gin.H{
		"message":          "Next question sent",
		"current_question": quizState.CurrentQuestion,
		"total_questions":  len(quiz.Questions),
	})
}

// EndQuiz ends the quiz and shows results
func (h *QuizHandler) EndQuiz(c *gin.Context) {
	roomID := c.Param("roomId")

	// Get room
	room, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Update room status
	room.Status = "finished"
	if err := h.redisClient.SaveQuizRoom(room); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update room status"})
		return
	}

	// Update quiz state
	quizState, _ := h.redisClient.GetQuizState(roomID)
	if quizState != nil {
		quizState.Status = "finished"
		h.redisClient.SaveQuizState(quizState)
	}

	// Get final scores
	scores, err := h.redisClient.GetPlayerScores(roomID)
	if err != nil {
		scores = make(map[string]int)
	}

	// TODO: Calculate leaderboard
	leaderboard := &models.Leaderboard{
		RoomID:  roomID,
		Players: []models.LeaderboardEntry{},
	}

	// Broadcast quiz finished
	message := &models.WebSocketMessage{
		Type: models.MessageTypeQuizFinished,
		Data: map[string]interface{}{
			"room_id":     roomID,
			"leaderboard": leaderboard,
			"scores":      scores,
		},
		Timestamp: time.Now(),
	}
	h.hub.BroadcastToRoom(roomID, message)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Quiz finished",
		"room_id":     roomID,
		"leaderboard": leaderboard,
		"scores":      scores,
	})
}

// HandleWebSocket handles WebSocket connections
func (h *QuizHandler) HandleWebSocket(c *gin.Context) {
	roomID := c.Param("roomId")
	playerID := c.Query("player_id")

	if playerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "player_id is required"})
		return
	}

	// Verify room exists
	_, err := h.redisClient.GetQuizRoom(roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	// Upgrade to WebSocket
	h.hub.ServeWS(c.Writer, c.Request, roomID, playerID)
}

// broadcastQuestion sends a question to all players in a room
func (h *QuizHandler) broadcastQuestion(roomID string, question *models.Question, questionNumber int) {
	// Don't send the correct answer to players
	questionData := map[string]interface{}{
		"id":              question.ID,
		"text":            question.Text,
		"options":         question.Options,
		"time_limit":      question.TimeLimit,
		"question_number": questionNumber,
		"subtopic":        question.Subtopic,
		"difficulty":      question.Difficulty,
	}

	message := &models.WebSocketMessage{
		Type:      models.MessageTypeNewQuestion,
		Data:      questionData,
		Timestamp: time.Now(),
	}

	h.hub.BroadcastToRoom(roomID, message)
} 