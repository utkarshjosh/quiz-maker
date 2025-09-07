package main

import (
	"encoding/json"
	"time"
)

// Message types
const (
	// Client to Server
	TypeJoin         = "join"
	TypeCreateRoom   = "create_room"
	TypeStart        = "start"
	TypeAnswer       = "answer"
	TypeKick         = "kick"
	TypeLeave        = "leave"
	TypePing         = "ping"

	// Server to Client
	TypeState        = "state"
	TypeQuestion     = "question"
	TypeReveal       = "reveal"
	TypeScore        = "score"
	TypeEnd          = "end"
	TypeError        = "error"
	TypePong         = "pong"
	TypeJoined       = "joined"
	TypeLeft         = "left"
	TypeKicked       = "kicked"
)

// Room states
const (
	StateLobby        = "lobby"
	StateQuestion     = "question"
	StateReveal       = "reveal"
	StateIntermission = "intermission"
	StateEnded        = "ended"
)

// Error codes
const (
	ErrorCodeUnauthorized = "UNAUTHORIZED"
	ErrorCodeForbidden    = "FORBIDDEN"
	ErrorCodeNotFound     = "NOT_FOUND"
	ErrorCodeRateLimit    = "RATE_LIMIT"
	ErrorCodeValidation   = "VALIDATION"
	ErrorCodeState        = "STATE"
	ErrorCodeRoomFull     = "ROOM_FULL"
	ErrorCodeUnknown      = "UNKNOWN"
)

// Base message envelope
type Message struct {
	Version int             `json:"v"`
	Type    string          `json:"type"`
	MsgID   string          `json:"msg_id"`
	RoomID  *string         `json:"room_id,omitempty"`
	Data    json.RawMessage `json:"data"`
}

// Client Messages
type JoinMessage struct {
	PIN         string `json:"pin" validate:"required,len=6"`
	DisplayName string `json:"display_name" validate:"required,min=1,max=50"`
}

type CreateRoomMessage struct {
	QuizID   string                 `json:"quiz_id" validate:"required,uuid"`
	Settings map[string]interface{} `json:"settings"`
}

type StartMessage struct {
	// Empty - host starts the quiz
}

type AnswerMessage struct {
	QuestionIndex int    `json:"question_index" validate:"required,min=0"`
	Choice        string `json:"choice" validate:"required"`
}

type KickMessage struct {
	UserID string `json:"user_id" validate:"required,uuid"`
	Reason string `json:"reason,omitempty"`
}

type LeaveMessage struct {
	// Empty - user leaves the room
}

type PingMessage struct {
	Timestamp int64 `json:"timestamp"`
}

// Server Messages
type StateMessage struct {
	Phase           string    `json:"phase"`
	RoomID          string    `json:"room_id"`
	PIN             string    `json:"pin"`
	HostID          string    `json:"host_id"`
	QuestionIndex   int       `json:"question_index"`
	TotalQuestions  int       `json:"total_questions"`
	PhaseDeadline   *int64    `json:"phase_deadline_ms,omitempty"`
	Members         []Member  `json:"members"`
	Settings        QuizSettings `json:"settings"`
}

type QuestionMessage struct {
	Index       int      `json:"index"`
	Question    string   `json:"question"`
	Options     []string `json:"options"`
	DeadlineMS  int64    `json:"deadline_ms"`
	Duration    int      `json:"duration_ms"`
}

type RevealMessage struct {
	Index          int            `json:"index"`
	CorrectChoice  string         `json:"correct_choice"`
	CorrectIndex   int            `json:"correct_index"`
	Explanation    string         `json:"explanation,omitempty"`
	UserStats      []UserStat     `json:"user_stats"`
	Leaderboard    []LeaderEntry  `json:"leaderboard"`
}

type ScoreMessage struct {
	UserID       string `json:"user_id"`
	Score        int    `json:"score"`
	ScoreDelta   int    `json:"score_delta"`
	Rank         int    `json:"rank"`
}

type EndMessage struct {
	FinalLeaderboard []LeaderEntry `json:"final_leaderboard"`
	QuizStats        QuizStats     `json:"quiz_stats"`
}

type ErrorMessage struct {
	Code    string `json:"code"`
	Message string `json:"msg"`
	Details string `json:"details,omitempty"`
}

type PongMessage struct {
	Timestamp int64 `json:"timestamp"`
}

type JoinedMessage struct {
	User Member `json:"user"`
}

type LeftMessage struct {
	UserID string `json:"user_id"`
	Reason string `json:"reason,omitempty"`
}

type KickedMessage struct {
	UserID string `json:"user_id"`
	Reason string `json:"reason"`
}

// Supporting types
type Member struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"` // "host" or "player"
	Score       int    `json:"score"`
	IsOnline    bool   `json:"is_online"`
	JoinedAt    int64  `json:"joined_at"`
}

type UserStat struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Answer      string `json:"answer,omitempty"`
	IsCorrect   bool   `json:"is_correct"`
	TimeTaken   int    `json:"time_taken_ms"`
	ScoreDelta  int    `json:"score_delta"`
}

type LeaderEntry struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Score       int    `json:"score"`
	Rank        int    `json:"rank"`
	Correct     int    `json:"correct_answers"`
	Total       int    `json:"total_answered"`
}

type QuizSettings struct {
	QuestionDuration int  `json:"question_duration_ms"`
	ShowCorrectness  bool `json:"show_correctness"`
	ShowLeaderboard  bool `json:"show_leaderboard"`
	AllowReconnect   bool `json:"allow_reconnect"`
}

type QuizStats struct {
	TotalQuestions   int           `json:"total_questions"`
	TotalParticipants int          `json:"total_participants"`
	AverageScore     float64       `json:"average_score"`
	CompletionRate   float64       `json:"completion_rate"`
	Duration         time.Duration `json:"duration_ms"`
}

// User types
type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// Room types
type RoomState struct {
	Phase           string    `json:"phase"`
	QuestionIndex   int       `json:"question_index"`
	PhaseDeadline   *int64    `json:"phase_deadline_ms,omitempty"`
	StartTime       time.Time `json:"start_time"`
	UserScores      map[string]int `json:"user_scores"`
	UserStats       map[string]UserStats `json:"user_stats"`
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

// Scoring types
type UserStats struct {
	CorrectAnswers      int
	TotalAnswered       int
	AverageResponseTime time.Duration
	CurrentStreak       int
	MaxStreak           int
}

type LeaderboardEntry struct {
	UserID      string `json:"user_id"`
	DisplayName string `json:"display_name"`
	Score       int    `json:"score"`
	Rank        int    `json:"rank"`
	Correct     int    `json:"correct_answers"`
	Total       int    `json:"total_answered"`
}

type QuizStatistics struct {
	TotalQuestions    int           `json:"total_questions"`
	TotalParticipants int           `json:"total_participants"`
	AverageScore      float64       `json:"average_score"`
	CompletionRate    float64       `json:"completion_rate"`
	Duration          time.Duration `json:"duration_ms"`
}
