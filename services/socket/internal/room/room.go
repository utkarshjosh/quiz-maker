package room

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"sync"
	"time"

	"quiz-realtime-service/internal/api"
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
	msgChan   chan *ClientMessage
	tickChan  chan time.Time
	closeChan chan struct{}

	// Dependencies
	store      *store.RedisStore
	calculator *scoring.ScoreCalculator
	apiClient  *api.Client
	logger     *zap.Logger

	// Synchronization
	mu        sync.RWMutex
	closeOnce sync.Once
}

type RoomState struct {
	Phase             string                       `json:"phase"`
	QuestionIndex     int                          `json:"question_index"`
	PhaseDeadline     *int64                       `json:"phase_deadline_ms,omitempty"`
	StartTime         time.Time                    `json:"start_time"`
	QuestionStartTime int64                        `json:"question_start_time,omitempty"`
	UserScores        map[string]int               `json:"user_scores"`
	UserStats         map[string]scoring.UserStats `json:"user_stats"`
}

type Member struct {
	ID          string     `json:"id"`
	DisplayName string     `json:"display_name"`
	Role        string     `json:"role"`
	JoinedAt    time.Time  `json:"joined_at"`
	IsOnline    bool       `json:"is_online"`
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
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
}

type Question struct {
	Index         int      `json:"index"`
	Question      string   `json:"question"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	CorrectIndex  int      `json:"correct_index"`
	Explanation   string   `json:"explanation,omitempty"`
}

type QuizSettings struct {
	QuestionDuration int  `json:"question_duration_ms"`
	ShowCorrectness  bool `json:"show_correctness"`
	ShowLeaderboard  bool `json:"show_leaderboard"`
	AllowReconnect   bool `json:"allow_reconnect"`
}

func NewRoom(quizID, hostID string, quiz *QuizData, settings *QuizSettings, store *store.RedisStore, apiClient *api.Client, logger *zap.Logger) (*Room, error) {
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
		apiClient:  apiClient,
		logger:     logger.With(zap.String("room_id", roomID)),
	}

	// Save initial state to Redis
	if err := room.saveState(ctx); err != nil {
		return nil, fmt.Errorf("failed to save initial state: %w", err)
	}

	return room, nil
}

// NewRoomFromExisting creates a new room instance using an existing room ID and PIN
func NewRoomFromExisting(roomID, pin, quizID, hostID string, quiz *QuizData, settings *QuizSettings, store *store.RedisStore, apiClient *api.Client, logger *zap.Logger) *Room {
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
		apiClient:  apiClient,
		logger:     logger.With(zap.String("room_id", roomID)),
	}

	// Persist initial state but ignore errors (non-fatal for runtime)
	_ = room.saveState(context.Background())

	return room
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
	ctx := context.Background()

	r.mu.Lock()

	// Check if room is full
	if len(r.Members) >= 50 { // Max room size
		r.mu.Unlock()
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

	joinedMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeJoined,
		Data:    r.marshalData(protocol.JoinedMessage{User: r.memberToProtocol(member)}),
	}

	r.mu.Unlock()

	// Add to Redis presence
	if err := r.store.AddUserToRoom(ctx, r.ID, userID, 2*time.Hour); err != nil {
		r.logger.Error("Failed to add user to Redis presence", zap.Error(err))
	}

	// Broadcast join event
	r.broadcastToAll(joinedMsg)

	// Send current state to new member
	r.sendState(member.Connection)

	r.logger.Info("Member joined", zap.String("user_id", userID), zap.String("display_name", displayName))
	return nil
}

func (r *Room) RemoveMember(userID string, reason string) {
	ctx := context.Background()

	var (
		checkEarlyReveal      bool
		earlyRevealQuestionID int
		remainingPlayerIDs    []string
	)

	r.mu.Lock()

	member, exists := r.Members[userID]
	if !exists {
		r.mu.Unlock()
		return
	}

	delete(r.Members, userID)
	isHost := userID == r.HostID

	if r.State != nil && r.State.Phase == protocol.StateQuestion {
		earlyRevealQuestionID = r.State.QuestionIndex
		remainingPlayerIDs = collectActiveParticipantIDs(r.Members)
		checkEarlyReveal = true
	}

	leftMsg := &protocol.Message{
		Version: 1,
		Type:    protocol.TypeLeft,
		Data:    r.marshalData(protocol.LeftMessage{UserID: userID, Reason: reason}),
	}

	r.mu.Unlock()

	// Remove from Redis presence
	if err := r.store.RemoveUserFromRoom(ctx, r.ID, userID); err != nil {
		r.logger.Error("Failed to remove user from Redis presence", zap.Error(err))
	}

	// Close connection
	if member.Connection != nil && member.Connection.UserID() != userID {
		member.Connection.Close()
	}

	// Broadcast leave event
	r.broadcastToAll(leftMsg)

	// If host left, transfer host or close room
	if isHost {
		r.handleHostLeft()
	}

	if checkEarlyReveal {
		go r.checkAndTriggerEarlyReveal(ctx, earlyRevealQuestionID, remainingPlayerIDs)
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
	if r.State.Phase != protocol.StateLobby {
		r.mu.Unlock()
		r.sendError(member.Connection, protocol.ErrorCodeState, "Quiz already started")
		return
	}

	r.State.StartTime = time.Now()
	r.mu.Unlock()

	r.startQuestion(ctx, 0)
}

func (r *Room) handleAnswer(ctx context.Context, member *Member, msg *protocol.Message) {
	var answerMsg protocol.AnswerMessage
	if err := msg.UnmarshalData(&answerMsg); err != nil {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Invalid answer format")
		return
	}

	var (
		checkEarlyReveal      bool
		earlyRevealPlayerIDs  []string
		earlyRevealQuestionID int
	)

	r.mu.Lock()
	defer func() {
		r.mu.Unlock()
		if checkEarlyReveal {
			r.checkAndTriggerEarlyReveal(ctx, earlyRevealQuestionID, earlyRevealPlayerIDs)
		}
	}()

	if r.State.Phase != protocol.StateQuestion {
		r.sendError(member.Connection, protocol.ErrorCodeState, "Not in question phase")
		return
	}

	if answerMsg.QuestionIndex != r.State.QuestionIndex {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Wrong question index")
		return
	}

	// Validate choice
	question := r.Quiz.Questions[r.State.QuestionIndex]
	choiceIndex, ok := determineChoiceIndex(&question, answerMsg.Choice)
	if !ok {
		r.sendError(member.Connection, protocol.ErrorCodeValidation, "Invalid answer choice")
		return
	}

	// Check if deadline passed
	if r.State.PhaseDeadline != nil && time.Now().UnixMilli() > *r.State.PhaseDeadline {
		r.sendError(member.Connection, protocol.ErrorCodeState, "Answer deadline passed")
		return
	}

	// Store answer in Redis
	answeredAt := time.Now().UnixMilli()
	timeTakenMs := int64(0)
	if r.State.QuestionStartTime > 0 && answeredAt >= r.State.QuestionStartTime {
		timeTakenMs = answeredAt - r.State.QuestionStartTime
	}
	if timeTakenMs < 0 {
		timeTakenMs = 0
	}

	trimmedChoice := strings.TrimSpace(answerMsg.Choice)
	if err := r.store.SetUserAnswer(ctx, r.ID, r.State.QuestionIndex, member.ID, trimmedChoice, choiceIndex, timeTakenMs, answeredAt); err != nil {
		r.logger.Error("Failed to store answer", zap.Error(err))
		r.sendError(member.Connection, protocol.ErrorCodeUnknown, "Failed to store answer")
		return
	}

	r.logger.Debug("Answer received",
		zap.String("user_id", member.ID),
		zap.Int("question", r.State.QuestionIndex),
		zap.String("answer", answerMsg.Choice))

	// Prepare to check for early reveal if all active participants have answered
	playerIDs := collectActiveParticipantIDs(r.Members)

	if len(playerIDs) > 0 {
		checkEarlyReveal = true
		earlyRevealPlayerIDs = append(earlyRevealPlayerIDs, playerIDs...)
		earlyRevealQuestionID = r.State.QuestionIndex
	}
}

func (r *Room) startQuestion(ctx context.Context, questionIndex int) {
	r.mu.Lock()

	if questionIndex >= len(r.Quiz.Questions) {
		r.mu.Unlock()
		r.endQuiz(ctx)
		return
	}

	question := r.Quiz.Questions[questionIndex]
	startTime := time.Now()
	duration := time.Duration(r.Settings.QuestionDuration) * time.Millisecond
	deadline := startTime.Add(duration)
	deadlineMs := deadline.UnixMilli()
	startMs := startTime.UnixMilli()

	r.State.Phase = protocol.StateQuestion
	r.State.QuestionIndex = questionIndex
	r.State.PhaseDeadline = &deadlineMs
	r.State.QuestionStartTime = startMs

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

	r.mu.Unlock()

	r.broadcastToAll(questionMsg)
	if err := r.saveState(ctx); err != nil {
		r.logger.Error("Failed to persist state after starting question", zap.Error(err))
	}

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
			r.startIntermission(ctx)
		case protocol.StateIntermission:
			r.nextQuestion(ctx)
		}
	}
}

func (r *Room) revealAnswer(ctx context.Context) {
	r.mu.Lock()
	if r.State.Phase != protocol.StateQuestion {
		r.mu.Unlock()
		return
	}

	questionIndex := r.State.QuestionIndex
	question := r.Quiz.Questions[questionIndex]
	questionStart := r.State.QuestionStartTime

	// Get all answers for this question
	answers, err := r.store.GetAllAnswers(ctx, r.ID, questionIndex)
	if err != nil {
		r.logger.Error("Failed to get answers", zap.Error(err))
	}

	// Calculate scores and stats
	userStats := make([]protocol.UserStat, 0)
	maxTime := time.Duration(r.Settings.QuestionDuration) * time.Millisecond

	for userID, member := range r.Members {
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
			Answer       string `json:"answer"`
			ChoiceIndex  *int   `json:"choice_index,omitempty"`
			TimeTakenMs  int64  `json:"time_taken_ms"`
			AnswerTime   int64  `json:"answer_time"`
			AnsweredAt   int64  `json:"answered_at"`
			RecordedAtMs int64  `json:"timestamp"`
		}
		if err := json.Unmarshal([]byte(answerData), &answer); err != nil {
			r.logger.Error("Failed to parse answer data", zap.Error(err))
			continue
		}

		idx := -1
		if answer.ChoiceIndex != nil {
			idx = *answer.ChoiceIndex
		} else if derivedIdx, ok := determineChoiceIndex(&question, answer.Answer); ok {
			idx = derivedIdx
		}

		isCorrect := isChoiceCorrect(&question, answer.Answer, idx)
		timeTakenMs := answer.TimeTakenMs
		if timeTakenMs <= 0 {
			switch {
			case questionStart > 0 && answer.AnswerTime > 0:
				timeTakenMs = answer.AnswerTime - questionStart
			default:
				timeTakenMs = answer.AnswerTime
			}
		}
		if timeTakenMs < 0 {
			timeTakenMs = 0
		}
		maxTimeMs := maxTime.Milliseconds()
		if maxTimeMs > 0 && timeTakenMs > maxTimeMs {
			timeTakenMs = maxTimeMs
		}
		timeTaken := time.Duration(timeTakenMs) * time.Millisecond

		// Get current user stats
		stats := r.State.UserStats[userID]

		// Calculate score
		score := r.calculator.CalculateScoreWithTime(isCorrect, timeTaken, maxTime, stats.CurrentStreak)
		r.State.UserScores[userID] += score

		// Update user stats
		r.calculator.UpdateUserStats(&stats, isCorrect, timeTaken.Milliseconds())
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
	r.State.QuestionStartTime = 0
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

	r.mu.Unlock()

	r.broadcastToAll(revealMsg)
	if err := r.saveState(ctx); err != nil {
		r.logger.Error("Failed to persist state after reveal", zap.Error(err))
	}

	r.logger.Info("Answer revealed", zap.Int("question", questionIndex))
}

func (r *Room) checkAndTriggerEarlyReveal(ctx context.Context, questionIndex int, playerIDs []string) {
	if len(playerIDs) == 0 || questionIndex < 0 {
		return
	}

	answers, err := r.store.GetAllAnswers(ctx, r.ID, questionIndex)
	if err != nil {
		r.logger.Debug("Unable to evaluate early reveal", zap.Error(err))
		return
	}

	answeredCount := 0
	for _, id := range playerIDs {
		if _, ok := answers[id]; ok {
			answeredCount++
		}
	}

	if answeredCount != len(playerIDs) {
		return
	}

	r.mu.RLock()
	currentPhase := r.State.Phase
	currentQuestion := r.State.QuestionIndex
	r.mu.RUnlock()

	if currentPhase != protocol.StateQuestion || currentQuestion != questionIndex {
		return
	}

	r.logger.Debug("Triggering early reveal after all players answered",
		zap.Int("question", questionIndex),
		zap.Strings("player_ids", playerIDs))

	r.revealAnswer(ctx)
}

func (r *Room) startIntermission(ctx context.Context) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Set intermission phase
	r.State.Phase = protocol.StateIntermission
	intermissionDuration := 3 * time.Second // Brief pause before next question
	deadline := time.Now().Add(intermissionDuration).UnixMilli()
	r.State.PhaseDeadline = &deadline

	r.saveState(ctx)

	r.logger.Info("Intermission started")
}

func (r *Room) nextQuestion(ctx context.Context) {
	r.mu.Lock()
	nextIndex := r.State.QuestionIndex + 1
	totalQuestions := len(r.Quiz.Questions)
	r.mu.Unlock()

	if nextIndex >= totalQuestions {
		r.endQuiz(ctx)
		return
	}

	r.startQuestion(ctx, nextIndex)
}

func (r *Room) endQuiz(ctx context.Context) {
	r.mu.Lock()

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
	quizStats := r.calculator.CalculateQuizStats(r.State.UserStats, len(r.Quiz.Questions), r.State.StartTime.UnixMilli())

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
				Duration:          time.Duration(quizStats.Duration) * time.Millisecond,
			},
		}),
	}

	r.mu.Unlock()

	r.broadcastToAll(endMsg)
	if err := r.saveState(ctx); err != nil {
		r.logger.Error("Failed to persist state after quiz end", zap.Error(err))
	}

	r.logger.Info("Quiz ended")

	// Submit results to API backend (async, non-blocking)
	if r.apiClient != nil {
		go r.submitGameResults(ctx, protocolLeaderboard)
	}

	// Schedule room cleanup
	go func() {
		time.Sleep(5 * time.Minute)
		r.Close()
	}()
}

// submitGameResults submits the final game results to the API backend
func (r *Room) submitGameResults(ctx context.Context, leaderboard []protocol.LeaderEntry) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Prepare player results
	playerResults := make([]api.PlayerResult, 0, len(leaderboard))
	for _, entry := range leaderboard {
		stats := r.State.UserStats[entry.UserID]
		accuracy := 0.0
		if stats.TotalAnswered > 0 {
			accuracy = (float64(stats.CorrectAnswers) / float64(stats.TotalAnswered)) * 100.0
		}

		playerResults = append(playerResults, api.PlayerResult{
			UserID:            entry.UserID,
			DisplayName:       entry.DisplayName,
			FinalScore:        entry.Score,
			CorrectAnswers:    entry.Correct,
			TotalAnswers:      entry.Total,
			Accuracy:          accuracy,
			AverageResponseMs: stats.AverageResponseTime,
			MaxStreak:         stats.MaxStreak,
		})
	}

	// Collect all answers from Redis
	answers := make([]api.AnswerResult, 0)
	for questionIndex := 0; questionIndex < len(r.Quiz.Questions); questionIndex++ {
		questionAnswers, err := r.store.GetAllAnswers(ctx, r.ID, questionIndex)
		if err != nil {
			r.logger.Error("Failed to get answers for submission",
				zap.Error(err),
				zap.Int("question_index", questionIndex))
			continue
		}

		question := r.Quiz.Questions[questionIndex]
		for userID, answerData := range questionAnswers {
			var answer struct {
				Answer     string `json:"answer"`
				AnswerTime int64  `json:"answer_time"`
			}
			if err := json.Unmarshal([]byte(answerData), &answer); err != nil {
				continue
			}

			isCorrect := answer.Answer == question.CorrectAnswer
			answers = append(answers, api.AnswerResult{
				UserID:         userID,
				QuestionIndex:  questionIndex,
				Answer:         answer.Answer,
				IsCorrect:      isCorrect,
				ResponseTimeMs: answer.AnswerTime,
				ScoreDelta:     r.State.UserScores[userID], // This is cumulative, not per question
				AnsweredAt:     time.Now(),                 // Approximate
			})
		}
	}

	// Create game result
	endTime := time.Now()
	duration := endTime.Sub(r.State.StartTime).Milliseconds()

	gameResult := &api.GameResult{
		RoomID:         r.ID,
		QuizID:         r.QuizID,
		HostID:         r.HostID,
		StartedAt:      r.State.StartTime,
		EndedAt:        endTime,
		Duration:       duration,
		TotalQuestions: len(r.Quiz.Questions),
		PlayerResults:  playerResults,
		Answers:        answers,
	}

	// Submit to API (with timeout)
	submitCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := r.apiClient.SubmitGameResults(submitCtx, gameResult); err != nil {
		r.logger.Error("Failed to submit game results to API", zap.Error(err))
		// Don't block the game flow, just log the error
	} else {
		r.logger.Info("Successfully submitted game results to API")
	}
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
	var (
		newHostID   string
		newHostName string
	)

	r.mu.Lock()
	for userID, member := range r.Members {
		if member.Role == "player" {
			member.Role = "host"
			r.HostID = userID
			newHostID = userID
			newHostName = member.DisplayName
			break
		}
	}

	remainingMembers := len(r.Members)
	r.mu.Unlock()

	if newHostID != "" {
		r.logger.Info("Host transferred", zap.String("new_host", newHostID), zap.String("new_host_name", newHostName))
		// Broadcast state update with the new host designation
		r.broadcastState()
		return
	}

	if remainingMembers == 0 {
		r.logger.Info("No members left, closing room")
		r.Close()
	}
}

func (r *Room) sendState(conn Connection) {
	msg, err := r.buildStateMessage()
	if err != nil {
		r.logger.Error("Failed to build state message", zap.Error(err))
		return
	}

	if err := conn.Send(msg); err != nil {
		r.logger.Error("Failed to send state message to connection",
			zap.Error(err),
			zap.String("user_id", conn.UserID()))
	}
}

func (r *Room) broadcastState() {
	msg, err := r.buildStateMessage()
	if err != nil {
		r.logger.Error("Failed to build state message for broadcast", zap.Error(err))
		return
	}

	r.mu.RLock()
	connections := make([]Connection, 0, len(r.Members))
	for _, member := range r.Members {
		connections = append(connections, member.Connection)
	}
	r.mu.RUnlock()

	for _, conn := range connections {
		if err := conn.Send(msg); err != nil {
			r.logger.Error("Failed to broadcast state message",
				zap.Error(err),
				zap.String("user_id", conn.UserID()))
		}
	}
}

// BuildStateMessage returns the current room state as a protocol message.
func (r *Room) BuildStateMessage() (*protocol.Message, error) {
	return r.buildStateMessage()
}

func (r *Room) buildStateMessage() (*protocol.Message, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	members := make([]protocol.Member, 0, len(r.Members))
	for _, member := range r.Members {
		members = append(members, r.memberToProtocol(member))
	}

	state := protocol.StateMessage{
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
	}

	msg, err := protocol.NewMessage(protocol.TypeState, state)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal state message: %w", err)
	}
	msg.RoomID = &r.ID

	return msg, nil
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

func collectActiveParticipantIDs(members map[string]*Member) []string {
	if len(members) == 0 {
		return nil
	}

	ids := make([]string, 0, len(members))
	for _, member := range members {
		if member.Role == "player" || member.Role == "host" {
			ids = append(ids, member.ID)
		}
	}
	return ids
}

func determineChoiceIndex(question *Question, choice string) (int, bool) {
	trimmed := strings.TrimSpace(choice)
	if trimmed == "" {
		return -1, false
	}

	// Attempt to parse provided choice as index
	if idx, err := strconv.Atoi(trimmed); err == nil {
		if idx >= 0 && idx < len(question.Options) {
			return idx, true
		}
	}

	// If correctAnswer stores the index as a string (legacy)
	if question.CorrectAnswer != "" && trimmed == question.CorrectAnswer {
		if idx, err := strconv.Atoi(question.CorrectAnswer); err == nil {
			if idx >= 0 && idx < len(question.Options) {
				return idx, true
			}
		}
	}

	// Match against option text (case insensitive)
	for idx, option := range question.Options {
		if strings.EqualFold(trimmed, option) {
			return idx, true
		}
	}

	// If correct answer is stored as full option text
	if question.CorrectAnswer != "" {
		for idx, option := range question.Options {
			if strings.EqualFold(strings.TrimSpace(question.CorrectAnswer), strings.TrimSpace(option)) &&
				strings.EqualFold(trimmed, question.CorrectAnswer) {
				return idx, true
			}
		}
	}

	return -1, false
}

func isChoiceCorrect(question *Question, choice string, choiceIndex int) bool {
	// Prefer provided choice index
	if choiceIndex >= 0 && choiceIndex < len(question.Options) {
		return choiceIndex == question.CorrectIndex
	}

	trimmed := strings.TrimSpace(choice)
	if trimmed == "" {
		return false
	}

	// Compare against known representations
	if question.CorrectAnswer != "" && strings.EqualFold(trimmed, question.CorrectAnswer) {
		return true
	}

	if question.CorrectIndex >= 0 && question.CorrectIndex < len(question.Options) {
		if strings.EqualFold(trimmed, question.Options[question.CorrectIndex]) {
			return true
		}
	}

	if idx, err := strconv.Atoi(trimmed); err == nil {
		return idx == question.CorrectIndex
	}

	return false
}

func (r *Room) saveState(ctx context.Context) error {
	return r.store.SetRoomState(ctx, r.ID, r.State, 2*time.Hour)
}

func (r *Room) Close() {
	r.closeOnce.Do(func() {
		close(r.closeChan)
	})
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
