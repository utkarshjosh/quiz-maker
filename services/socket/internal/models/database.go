package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// QuizRoom represents a quiz room in the database
type QuizRoom struct {
	ID        string    `json:"id" db:"id"`
	PIN       string    `json:"pin" db:"pin"`
	HostID    string    `json:"host_id" db:"host_user_id"`
	QuizID    string    `json:"quiz_id" db:"quiz_id"`
	Status    string    `json:"status" db:"status"`
	Settings  JSONB     `json:"settings" db:"settings_json"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	StartedAt *time.Time `json:"started_at,omitempty" db:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty" db:"ended_at"`
	ClosedAt  *time.Time `json:"closed_at,omitempty" db:"closed_at"`
}

// QuizRoomMember represents a member in a quiz room
type QuizRoomMember struct {
	ID          string     `json:"id" db:"id"`
	RoomID      string     `json:"room_id" db:"room_id"`
	UserID      string     `json:"user_id" db:"user_id"`
	DisplayName string     `json:"display_name" db:"display_name"`
	Role        string     `json:"role" db:"role"`
	JoinedAt    time.Time  `json:"joined_at" db:"joined_at"`
	LeftAt      *time.Time `json:"left_at,omitempty" db:"left_at"`
	KickedBy    *string    `json:"kicked_by,omitempty" db:"kicked_by"`
	KickReason  *string    `json:"kick_reason,omitempty" db:"kick_reason"`
}

// QuizAnswer represents a user's answer to a question
type QuizAnswer struct {
	ID            string `json:"id" db:"id"`
	RoomID        string `json:"room_id" db:"room_id"`
	UserID        string `json:"user_id" db:"user_id"`
	QuestionIndex int    `json:"question_index" db:"question_index"`
	Answer        string `json:"answer" db:"answer"`
	AnswerTimeMs  int64  `json:"answer_time_ms" db:"answer_time_ms"`
	ScoreDelta    int    `json:"score_delta" db:"score_delta"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// Quiz represents a quiz from the database (matches Prisma schema)
type Quiz struct {
	ID             string    `json:"id" db:"id"`
	UserID         string    `json:"user_id" db:"user_id"`
	Title          string    `json:"title" db:"title"`
	Description    *string   `json:"description,omitempty" db:"description"`
	Difficulty     string    `json:"difficulty" db:"difficulty"`
	TimeLimit      int       `json:"time_limit" db:"time_limit"`
	TotalQuestions int       `json:"total_questions" db:"total_questions"`
	QuizData       JSONB     `json:"quiz_data" db:"quiz_data"`
	Status         string    `json:"status" db:"status"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
	PublishedAt    *time.Time `json:"published_at,omitempty" db:"published_at"`
	Version        int       `json:"version" db:"version"`
	ImageURL       *string   `json:"image_url,omitempty" db:"image_url"`
}

// Question represents a question from the quiz_data JSON (matches actual database structure)
type Question struct {
	Index         int      `json:"index"`
	QuestionText  string   `json:"question"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correctAnswer"`
	CorrectIndex  int      `json:"correct_index"`
	Explanation   string   `json:"explanation,omitempty"`
	Type          string   `json:"type"`
	Points        int      `json:"points"`
}

// User represents a user from the database
type User struct {
	ID       string `json:"id" db:"id"`
	Username string `json:"username" db:"username"`
	Email    string `json:"email" db:"email"`
}

// JSONB is a custom type for PostgreSQL JSONB fields
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into JSONB", value)
	}

	return json.Unmarshal(bytes, j)
}

// RoomSettings represents the settings for a quiz room
type RoomSettings struct {
	QuestionDurationMs int  `json:"question_duration_ms"`
	ShowCorrectness    bool `json:"show_correctness"`
	ShowLeaderboard    bool `json:"show_leaderboard"`
	AllowReconnect     bool `json:"allow_reconnect"`
	MaxPlayers         int  `json:"max_players,omitempty"`
}

// ToJSONB converts RoomSettings to JSONB
func (rs RoomSettings) ToJSONB() JSONB {
	return JSONB{
		"question_duration_ms": rs.QuestionDurationMs,
		"show_correctness":     rs.ShowCorrectness,
		"show_leaderboard":     rs.ShowLeaderboard,
		"allow_reconnect":      rs.AllowReconnect,
		"max_players":          rs.MaxPlayers,
	}
}

// DefaultRoomSettings returns default settings for a room
func DefaultRoomSettings() RoomSettings {
	return RoomSettings{
		QuestionDurationMs: 30000, // 30 seconds
		ShowCorrectness:    true,
		ShowLeaderboard:    true,
		AllowReconnect:     true,
		MaxPlayers:         50,
	}
}
