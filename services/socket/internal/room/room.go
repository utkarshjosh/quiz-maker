package room

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"quiz-realtime-service/internal/protocol"
	"quiz-realtime-service/internal/scoring"
	"quiz-realtime-service/internal/store"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Room struct {
	ID       string
	PIN      string
	HostID   string
	QuizID   string
	State    *RoomState
	Members  map[string]*Member
	Quiz     *QuizData
	Settings *QuizSettings

	// Internal channels
	msgChan    chan *ClientMessage
	tickChan   chan time.Time
	closeChan  chan struct{}
	
	// Dependencies
	store      *store.RedisStore
	calculator *scoring.ScoreCalculator
	logger     *zap.Logger
	
	// Synchronization
	mu sync.RWMutex
}

type RoomState struct {
	Phase           string    `json:"phase"`
	QuestionIndex   int       `json:"question_index"`
	PhaseDeadline   *int64    `json:"phase_deadline_ms,omitempty"`
	StartTime       time.Time `json:"start_time"`
	UserScores      map[string]int `json:"user_scores"`
	UserStats       map[string]scoring.UserStats `json:"user_stats"`
}

type Member struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"display_name"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
	IsOnline    bool      `json:"is_online"`
	Connection  Connection `json:"-"`
}

type Connection interface {
	Send(message *protocol.Message) error
	Close() error
	UserID() string
}

type ClientMessage struct {
	UserID  string
	Message *protocol.Message
}

type QuizData struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Questions   []Question  `json:"questions"`
}

type Question struct {
	Index       int      `json:"index"`
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	CorrectAnswer string `json:"correct_answer"`
	CorrectIndex  int    `json:"correct_index"`
	Explanation   string `json:"explanation,omitempty"`
}

type QuizSettings struct {
	QuestionDuration int  `json:"question_duration_ms"`
	ShowCorrectness  bool `json:"show_correctness"`
	ShowLeaderboard  bool `json:"show_leaderboard"`
	AllowReconnect   bool `json:"allow_reconnect"`
}

func NewRoom(quizID, hostID string, quiz *QuizData, settings *QuizSettings, store *store.RedisStore, logger *zap.Logger) (*Room, error) {
	roomID := uuid.New().String()
	pin := generatePIN()
	
	// Reserve PIN in Redis
	ctx := context.Background()
	if err := store.ReservePIN(ctx, pin, roomID, 2*time.Hour); err != nil {
		return nil, fmt.Errorf("failed to reserve PIN: %w", err)
	}
	
	room := &Room{
		ID:       roomID,
		PIN:      pin,
		HostID:   hostID,
		QuizID:   quizID,
		Quiz:     quiz,
		Settings: settings,
		State: &RoomState{
			Phase:         protocol.StateLobby,
			QuestionIndex: -1,
			UserScores:    make(map[string]int),
			UserStats:     make(map[string]scoring.UserStats),
		},
		Members:    make(map[string]*Member),
		msgChan:    make(chan *ClientMessage, 100),
		tickChan:   make(chan time.Time, 10),
		closeChan:  make(chan struct{}),
		store:      store,
		calculator: scoring.NewScoreCalculator(),
		logger:     logger.With(zap.String("room_id", roomID)),
	}
	
	// Save initial state to Redis
	if err := room.saveState(ctx); err != nil {
		return nil, fmt.Errorf("failed to save initial state: %w", err)
	}
	
	return room, nil
}

func (r *Room) Run(ctx context.Context) {
	r.logger.Info("Room started")
	defer r.logger.Info("Room stopped")
	
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			r.cleanup()
			return
		case <-r.closeChan:
			r.cleanup()
			return
		case msg := <-r.msgChan:
			r.handleMessage(ctx, msg)
		case <-ticker.C:
			r.tick(ctx)
		}
	}
}

func (r *Room) AddMember(userID, displayName string, conn Connection) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	// Check if room is full
	if len(r.Members) >= 50 { // Max room size
		return fmt.Errorf("room is full")
	}
	
	role := "player"
	if userID == r.HostID {
		role = "host"
	}
	
	member := &Member{
		ID:          userID,
		DisplayName: displayName,
		Role:        role,
		JoinedAt:    time.Now(),
		IsOnline:    true,
		Connection:  conn,
	}
	
	r.Members[userID] = member
	
	// Add to Redis presence
	ctx := context.Background()
	if err := r.store.AddUserToRoom(ctx, r.ID, userID, 2*time.Hour); err != nil {
		r.logger.Error("Failed to add user to Redis presence", zap.Error(err))
	}
	
	// Broadcast join event
	r.broadcastToAll(&protocol.Message{
		Version: 1,
		Type:    protocol.TypeJoined,
		Data:    r.marshalData(protocol.JoinedMessage{User: r.memberToProtocol(member)}),
	})
	
	// Send current state to new member
	r.sendState(member.Connection)
	
	r.logger.Info("Member joined", zap.String("user_id", userID), zap.String("display_name", displayName))
	return nil
}

func (r *Room) RemoveMember(userID string, reason string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	member, exists := r.Members[userID]
	if !exists {
		return
	}
	
	delete(r.Members, userID)
	
	// Remove from Redis presence
	ctx := context.Background()
	if err := r.store.RemoveUserFromRoom(ctx, r.ID, userID); err != nil {
		r.logger.Error("Failed to remove user from Redis presence", zap.Error(err))
	}
	
	// Close connection
	member.Connection.Close()
	
	// Broadcast leave event
	r.broadcastToAll(&protocol.Message{
		Version: 1,
		Type:    protocol.TypeLeft,
		Data:    r.marshalData(protocol.LeftMessage{UserID: userID, Reason: reason}),
	})
	
	// If host left, transfer host or close room
	if userID == r.HostID {
		r.handleHostLeft()
	}
	
	r.logger.Info("Member left", zap.String("user_id", userID), zap.String("reason", reason))
}

func (r *Room) SendMessage(userID string, msg *protocol.Message) {
	select {
	case r.msgChan <- &ClientMessage{UserID: userID, Message: msg}:
	default:
		r.logger.Warn("Message channel full, dropping message", zap.String("user_id", userID))
	}
}

func (r *Room) handleMessage(ctx context.Context, clientMsg *ClientMessage) {
	msg := clientMsg.Message
	userID := clientMsg.UserID
	
	r.mu.RLock()
	member, exists := r.Members[userID]
	r.mu.RUnlock()
	
	if !exists {
		r.logger.Warn("Message from unknown user", zap.String("user_id", userID))
		return
	}
	
	switch msg.Type {
	case protocol.TypeStart:
		r.handleStart(ctx, member)
	case protocol.TypeAnswer:
		r.handleAnswer(ctx, member, msg)
	case protocol.TypeKick:
		r.handleKick(ctx, member, msg)
	case protocol.TypeLeave:
		r.RemoveMember(userID, "left")
	case protocol.TypePing:
		r.handlePing(member, msg)
	default:
		r.logger.Warn("Unknown message type", zap.String("type", msg.Type))
	}
}

func (r *Room) handleStart(ctx context.Context, member *Member) {
	if member.Role != "host" {
		r.sendError(member.Connection, protocol.ErrorCodeForbidden, "Only host can start quiz")
		return
	}
	
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if r.State.Phase != protocol.StateLobby {
		r.sendError(member.Connection, protocol.ErrorCodeState, "Quiz already started")
		return
	}
	
	r.State.Phase = protocol.StateQuestion
	r.State.QuestionIndex = 0
	r.State.StartTime = time.Now()
	
	r.startQuestion(ctx, 0)
}

func (r *Room) handleAnswer(ctx context.Context, member *Member, msg *protocol.Message) {
	var answerMsg protocol.AnswerMessage
	if err := msg.UnmarshalData(&answerMsg); err != nil {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Invalid answer format")
		return
	}
	
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if r.State.Phase != protocol.StateQuestion {
		r.sendError(member.Connection, protocol.ErrorCodeState, "Not in question phase")
		return
	}
	
	if answerMsg.QuestionIndex != r.State.QuestionIndex {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Wrong question index")
		return
	}
	
	// Check if deadline passed
	if r.State.PhaseDeadline != nil && time.Now().UnixMilli() > *r.State.PhaseDeadline {
		r.sendError(member.Connection, protocol.ErrorCodeState, "Answer deadline passed")
		return
	}
	
	// Store answer in Redis
	answerTime := time.Now().UnixMilli()
	if err := r.store.SetUserAnswer(ctx, r.ID, r.State.QuestionIndex, member.ID, answerMsg.Choice, answerTime); err != nil {
		r.logger.Error("Failed to store answer", zap.Error(err))
		r.sendError(member.Connection, protocol.ErrorCodeUnknown, "Failed to store answer")
		return
	}
	
	r.logger.Debug("Answer received", 
		zap.String("user_id", member.ID),
		zap.Int("question", r.State.QuestionIndex),
		zap.String("answer", answerMsg.Choice))
}

func (r *Room) startQuestion(ctx context.Context, questionIndex int) {
	if questionIndex >= len(r.Quiz.Questions) {
		r.endQuiz(ctx)
		return
	}
	
	question := r.Quiz.Questions[questionIndex]
	duration := time.Duration(r.Settings.QuestionDuration) * time.Millisecond
	deadline := time.Now().Add(duration)
	deadlineMs := deadline.UnixMilli()
	
	r.State.Phase = protocol.StateQuestion
	r.State.QuestionIndex = questionIndex
	r.State.PhaseDeadline = &deadlineMs
	
	questionMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeQuestion,
		RoomID:  &r.ID,
		Data: r.marshalData(protocol.QuestionMessage{
			Index:      questionIndex,
			Question:   question.Question,
			Options:    question.Options,
			DeadlineMS: deadlineMs,
			Duration:   r.Settings.QuestionDuration,
		}),
	}
	
	r.broadcastToAll(questionMsg)
	r.saveState(ctx)
	
	r.logger.Info("Question started", zap.Int("index", questionIndex))
}

func (r *Room) tick(ctx context.Context) {
	r.mu.RLock()
	phase := r.State.Phase
	deadline := r.State.PhaseDeadline
	r.mu.RUnlock()
	
	if deadline == nil {
		return
	}
	
	now := time.Now().UnixMilli()
	if now >= *deadline {
		switch phase {
		case protocol.StateQuestion:
			r.revealAnswer(ctx)
		case protocol.StateReveal:
			r.nextQuestion(ctx)
		}
	}
}

func (r *Room) revealAnswer(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	questionIndex := r.State.QuestionIndex
	question := r.Quiz.Questions[questionIndex]
	
	// Get all answers for this question
	answers, err := r.store.GetAllAnswers(ctx, r.ID, questionIndex)
	if err != nil {
		r.logger.Error("Failed to get answers", zap.Error(err))
	}
	
	// Calculate scores and stats
	userStats := make([]protocol.UserStat, 0)
	maxTime := time.Duration(r.Settings.QuestionDuration) * time.Millisecond
	
	for userID, member := range r.Members {
		if member.Role == "host" {
			continue
		}
		
		answerData, exists := answers[userID]
		if !exists {
			// No answer submitted
			userStats = append(userStats, protocol.UserStat{
				UserID:      userID,
				DisplayName: member.DisplayName,
				IsCorrect:   false,
				TimeTaken:   int(maxTime.Milliseconds()),
				ScoreDelta:  0,
			})
			continue
		}
		
		// Parse answer data
		var answer struct {
			Answer     string `json:"answer"`
			AnswerTime int64  `json:"answer_time"`
		}
		if err := json.Unmarshal([]byte(answerData), &answer); err != nil {
			r.logger.Error("Failed to parse answer data", zap.Error(err))
			continue
		}
		
		isCorrect := answer.Answer == question.CorrectAnswer
		timeTaken := time.Duration(answer.AnswerTime) * time.Millisecond
		
		// Get current user stats
		stats := r.State.UserStats[userID]
		
		// Calculate score
		score := r.calculator.CalculateScore(isCorrect, timeTaken, maxTime, stats.CurrentStreak)
		r.State.UserScores[userID] += score
		
		// Update user stats
		r.calculator.UpdateUserStats(&stats, isCorrect, timeTaken)
		r.State.UserStats[userID] = stats
		
		userStats = append(userStats, protocol.UserStat{
			UserID:      userID,
			DisplayName: member.DisplayName,
			Answer:      answer.Answer,
			IsCorrect:   isCorrect,
			TimeTaken:   int(timeTaken.Milliseconds()),
			ScoreDelta:  score,
		})
	}
	
	// Calculate leaderboard
	userNames := make(map[string]string)
	for id, member := range r.Members {
		userNames[id] = member.DisplayName
	}
	leaderboard := r.calculator.CalculateLeaderboard(r.State.UserScores, userNames, r.State.UserStats)
	
	// Convert to protocol format
	protocolLeaderboard := make([]protocol.LeaderEntry, len(leaderboard))
	for i, entry := range leaderboard {
		protocolLeaderboard[i] = protocol.LeaderEntry{
			UserID:      entry.UserID,
			DisplayName: entry.DisplayName,
			Score:       entry.Score,
			Rank:        entry.Rank,
			Correct:     entry.Correct,
			Total:       entry.Total,
		}
	}
	
	// Set reveal phase
	r.State.Phase = protocol.StateReveal
	revealDuration := 5 * time.Second // Show results for 5 seconds
	deadline := time.Now().Add(revealDuration).UnixMilli()
	r.State.PhaseDeadline = &deadline
	
	// Broadcast reveal message
	revealMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeReveal,
		RoomID:  &r.ID,
		Data: r.marshalData(protocol.RevealMessage{
			Index:         questionIndex,
			CorrectChoice: question.CorrectAnswer,
			CorrectIndex:  question.CorrectIndex,
			Explanation:   question.Explanation,
			UserStats:     userStats,
			Leaderboard:   protocolLeaderboard,
		}),
	}
	
	r.broadcastToAll(revealMsg)
	r.saveState(ctx)
	
	r.logger.Info("Answer revealed", zap.Int("question", questionIndex))
}

func (r *Room) nextQuestion(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	nextIndex := r.State.QuestionIndex + 1
	if nextIndex >= len(r.Quiz.Questions) {
		r.endQuiz(ctx)
		return
	}
	
	r.startQuestion(ctx, nextIndex)
}

func (r *Room) endQuiz(ctx context.Context) {
	r.State.Phase = protocol.StateEnded
	r.State.PhaseDeadline = nil
	
	// Calculate final leaderboard
	userNames := make(map[string]string)
	for id, member := range r.Members {
		userNames[id] = member.DisplayName
	}
	leaderboard := r.calculator.CalculateLeaderboard(r.State.UserScores, userNames, r.State.UserStats)
	
	// Convert to protocol format
	protocolLeaderboard := make([]protocol.LeaderEntry, len(leaderboard))
	for i, entry := range leaderboard {
		protocolLeaderboard[i] = protocol.LeaderEntry{
			UserID:      entry.UserID,
			DisplayName: entry.DisplayName,
			Score:       entry.Score,
			Rank:        entry.Rank,
			Correct:     entry.Correct,
			Total:       entry.Total,
		}
	}
	
	// Calculate quiz stats
	quizStats := r.calculator.CalculateQuizStats(r.State.UserStats, len(r.Quiz.Questions), r.State.StartTime)
	
	endMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeEnd,
		RoomID:  &r.ID,
		Data: r.marshalData(protocol.EndMessage{
			FinalLeaderboard: protocolLeaderboard,
			QuizStats: protocol.QuizStats{
				TotalQuestions:    quizStats.TotalQuestions,
				TotalParticipants: quizStats.TotalParticipants,
				AverageScore:      quizStats.AverageScore,
				CompletionRate:    quizStats.CompletionRate,
				Duration:          quizStats.Duration,
			},
		}),
	}
	
	r.broadcastToAll(endMsg)
	r.saveState(ctx)
	
	r.logger.Info("Quiz ended")
	
	// Schedule room cleanup
	go func() {
		time.Sleep(5 * time.Minute)
		r.Close()
	}()
}

func (r *Room) handleKick(ctx context.Context, member *Member, msg *protocol.Message) {
	if member.Role != "host" {
		r.sendError(member.Connection, protocol.ErrorCodeForbidden, "Only host can kick users")
		return
	}
	
	var kickMsg protocol.KickMessage
	if err := msg.UnmarshalData(&kickMsg); err != nil {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Invalid kick format")
		return
	}
	
	r.mu.RLock()
	targetMember, exists := r.Members[kickMsg.UserID]
	r.mu.RUnlock()
	
	if !exists {
		r.sendError(member.Connection, protocol.ErrorCodeNotFound, "User not found")
		return
	}
	
	if targetMember.Role == "host" {
		r.sendError(member.Connection, protocol.ErrorCodeForbidden, "Cannot kick host")
		return
	}
	
	// Send kick message to target
	kickedMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeKicked,
		Data:    r.marshalData(protocol.KickedMessage{UserID: kickMsg.UserID, Reason: kickMsg.Reason}),
	}
	targetMember.Connection.Send(kickedMsg)
	
	r.RemoveMember(kickMsg.UserID, fmt.Sprintf("kicked: %s", kickMsg.Reason))
}

func (r *Room) handlePing(member *Member, msg *protocol.Message) {
	var pingMsg protocol.PingMessage
	if err := msg.UnmarshalData(&pingMsg); err != nil {
		return
	}
	
	pongMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypePong,
		Data:    r.marshalData(protocol.PongMessage{Timestamp: pingMsg.Timestamp}),
	}
	
	member.Connection.Send(pongMsg)
}

func (r *Room) handleHostLeft() {
	// Find another member to promote to host
	for userID, member := range r.Members {
		if member.Role == "player" {
			member.Role = "host"
			r.HostID = userID
			r.logger.Info("Host transferred", zap.String("new_host", userID))
			
			// Broadcast state update
			r.broadcastState()
			return
		}
	}
	
	// No other members, close room
	r.logger.Info("No members left, closing room")
	r.Close()
}

func (r *Room) sendState(conn Connection) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	members := make([]protocol.Member, 0, len(r.Members))
	for _, member := range r.Members {
		members = append(members, r.memberToProtocol(member))
	}
	
	stateMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeState,
		RoomID:  &r.ID,
		Data: r.marshalData(protocol.StateMessage{
			Phase:          r.State.Phase,
			RoomID:         r.ID,
			PIN:            r.PIN,
			HostID:         r.HostID,
			QuestionIndex:  r.State.QuestionIndex,
			TotalQuestions: len(r.Quiz.Questions),
			PhaseDeadline:  r.State.PhaseDeadline,
			Members:        members,
			Settings: protocol.QuizSettings{
				QuestionDuration: r.Settings.QuestionDuration,
				ShowCorrectness:  r.Settings.ShowCorrectness,
				ShowLeaderboard:  r.Settings.ShowLeaderboard,
				AllowReconnect:   r.Settings.AllowReconnect,
			},
		}),
	}
	
	conn.Send(stateMsg)
}

func (r *Room) broadcastState() {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	for _, member := range r.Members {
		r.sendState(member.Connection)
	}
}

func (r *Room) broadcastToAll(msg *protocol.Message) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	for _, member := range r.Members {
		if err := member.Connection.Send(msg); err != nil {
			r.logger.Error("Failed to send message to member", 
				zap.String("user_id", member.ID), 
				zap.Error(err))
		}
	}
}

func (r *Room) sendError(conn Connection, code, message string) {
	errorMsg := protocol.NewErrorMessage(code, message)
	conn.Send(errorMsg)
}

func (r *Room) memberToProtocol(member *Member) protocol.Member {
	score := r.State.UserScores[member.ID]
	return protocol.Member{
		ID:          member.ID,
		DisplayName: member.DisplayName,
		Role:        member.Role,
		Score:       score,
		IsOnline:    member.IsOnline,
		JoinedAt:    member.JoinedAt.UnixMilli(),
	}
}

func (r *Room) marshalData(data interface{}) json.RawMessage {
	bytes, _ := json.Marshal(data)
	return bytes
}

func (r *Room) saveState(ctx context.Context) error {
	return r.store.SetRoomState(ctx, r.ID, r.State, 2*time.Hour)
}

func (r *Room) Close() {
	close(r.closeChan)
}

func (r *Room) cleanup() {
	ctx := context.Background()
	
	// Close all connections
	r.mu.Lock()
	for _, member := range r.Members {
		member.Connection.Close()
	}
	r.mu.Unlock()
	
	// Cleanup Redis data
	r.store.ReleasePIN(ctx, r.PIN)
	r.store.CleanupRoom(ctx, r.ID)
	
	r.logger.Info("Room cleanup completed")
}

func generatePIN() string {
	// Generate 6-digit PIN avoiding confusing sequences
	for {
		pin := fmt.Sprintf("%06d", rand.Intn(1000000))
		
		// Avoid easily guessable patterns
		if isValidPIN(pin) {
			return pin
		}
	}
}

func isValidPIN(pin string) bool {
	// Avoid sequences like 000000, 123456, etc.
	if pin == "000000" || pin == "123456" || pin == "111111" {
		return false
	}
	
	// Check for repeating digits
	same := true
	for i := 1; i < len(pin); i++ {
		if pin[i] != pin[0] {
			same = false
			break
		}
	}
	
	return !same
}
