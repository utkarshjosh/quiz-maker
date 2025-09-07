package models

import (
	"time"
)

// LegacyQuizRoom represents a quiz room (legacy Redis-based)
type LegacyQuizRoom struct {
	ID         string    `json:"id"`
	QuizID     string    `json:"quiz_id"`
	HostID     string    `json:"host_id"`
	MaxPlayers int       `json:"max_players"`
	Status     string    `json:"status"` // waiting, active, finished
	CreatedAt  time.Time `json:"created_at"`
	Players    []Player  `json:"players"`
}

// Player represents a player in a quiz room
type Player struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	SessionID   string            `json:"session_id"`
	Score       int               `json:"score"`
	JoinedAt    time.Time         `json:"joined_at"`
	Answers     map[string]Answer `json:"answers"`
	IsConnected bool              `json:"is_connected"`
}

// Answer represents a player's answer to a question
type Answer struct {
	QuestionID     string    `json:"question_id"`
	SelectedOption string    `json:"selected_option"`
	IsCorrect      bool      `json:"is_correct"`
	AnsweredAt     time.Time `json:"answered_at"`
	TimeTaken      int       `json:"time_taken"` // in seconds
}

// QuizState represents the current state of a quiz
type QuizState struct {
	RoomID           string    `json:"room_id"`
	CurrentQuestion  int       `json:"current_question"`
	TotalQuestions   int       `json:"total_questions"`
	TimeLeft         int       `json:"time_left"`
	Status           string    `json:"status"` // waiting, question, results, finished
	QuestionStarted  time.Time `json:"question_started"`
	QuestionTimeLimit int      `json:"question_time_limit"`
}

// LegacyQuestion represents a quiz question (legacy Redis-based)
type LegacyQuestion struct {
	ID             string            `json:"id"`
	Text           string            `json:"text"`
	Options        map[string]string `json:"options"`
	CorrectAnswer  string            `json:"correct_answer"`
	Explanation    string            `json:"explanation"`
	TimeLimit      int               `json:"time_limit"`
	Subtopic       string            `json:"subtopic"`
	Difficulty     string            `json:"difficulty"`
}

// LegacyQuiz represents a complete quiz (legacy Redis-based)
type LegacyQuiz struct {
	ID            string           `json:"id"`
	Title         string           `json:"title"`
	Description   string           `json:"description"`
	Questions     []LegacyQuestion `json:"questions"`
	TimeLimit     int              `json:"time_limit"`
	Difficulty    string           `json:"difficulty"`
	CreatedAt     time.Time        `json:"created_at"`
	Tags          []string         `json:"tags"`
}

// WebSocketMessage represents messages sent over WebSocket
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	PlayerID  string      `json:"player_id,omitempty"`
}

// Message types
const (
	MessageTypeJoin           = "join"
	MessageTypeLeave          = "leave"
	MessageTypePlayerJoined   = "player_joined"
	MessageTypePlayerLeft     = "player_left"
	MessageTypeQuizStarted    = "quiz_started"
	MessageTypeNewQuestion    = "new_question"
	MessageTypeAnswer         = "answer"
	MessageTypeQuestionResult = "question_result"
	MessageTypeLeaderboard    = "leaderboard"
	MessageTypeQuizFinished   = "quiz_finished"
	MessageTypeError          = "error"
)

// Leaderboard represents the current standings
type Leaderboard struct {
	Players []LeaderboardEntry `json:"players"`
	RoomID  string             `json:"room_id"`
}

// LeaderboardEntry represents a player's position in the leaderboard
type LeaderboardEntry struct {
	PlayerID        string `json:"player_id"`
	Name            string `json:"name"`
	Score           int    `json:"score"`
	CorrectAnswers  int    `json:"correct_answers"`
	TotalAnswers    int    `json:"total_answers"`
	AverageTime     int    `json:"average_time"`
	Position        int    `json:"position"`
} 