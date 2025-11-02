package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// Client handles communication with the API backend
type Client struct {
	httpClient *http.Client
	baseURL    string
	jwtSecret  string // For creating internal service tokens
	logger     *zap.Logger
}

// NewClient creates a new API client
func NewClient(baseURL, jwtSecret string, logger *zap.Logger) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL:   baseURL,
		jwtSecret: jwtSecret,
		logger:    logger.With(zap.String("component", "api_client")),
	}
}

// GameResult represents the final results of a completed game
type GameResult struct {
	RoomID         string              `json:"room_id"`
	QuizID         string              `json:"quiz_id"`
	HostID         string              `json:"host_id"`
	StartedAt      time.Time           `json:"started_at"`
	EndedAt        time.Time           `json:"ended_at"`
	Duration       int64               `json:"duration_ms"`
	TotalQuestions int                 `json:"total_questions"`
	PlayerResults  []PlayerResult      `json:"player_results"`
	Answers        []AnswerResult      `json:"answers"`
}

// PlayerResult represents a player's final results
type PlayerResult struct {
	UserID            string  `json:"user_id"`
	DisplayName       string  `json:"display_name"`
	FinalScore        int     `json:"final_score"`
	CorrectAnswers    int     `json:"correct_answers"`
	TotalAnswers      int     `json:"total_answers"`
	Accuracy          float64 `json:"accuracy"`
	AverageResponseMs int64   `json:"average_response_ms"`
	MaxStreak         int     `json:"max_streak"`
}

// AnswerResult represents a single answer in the game
type AnswerResult struct {
	UserID        string    `json:"user_id"`
	QuestionIndex int       `json:"question_index"`
	Answer        string    `json:"answer"`
	IsCorrect     bool      `json:"is_correct"`
	ResponseTimeMs int64    `json:"response_time_ms"`
	ScoreDelta    int       `json:"score_delta"`
	AnsweredAt    time.Time `json:"answered_at"`
}

// GameResultResponse is the response from the API
type GameResultResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	GameID  string `json:"game_id,omitempty"`
}

// SubmitGameResults submits the final game results to the API backend
func (c *Client) SubmitGameResults(ctx context.Context, results *GameResult) error {
	c.logger.Info("Submitting game results to API",
		zap.String("room_id", results.RoomID),
		zap.String("quiz_id", results.QuizID),
		zap.Int("total_players", len(results.PlayerResults)),
		zap.Int("total_answers", len(results.Answers)))

	// Prepare request body
	body, err := json.Marshal(results)
	if err != nil {
		c.logger.Error("Failed to marshal game results", zap.Error(err))
		return fmt.Errorf("failed to marshal game results: %w", err)
	}

	// Create request
	url := fmt.Sprintf("%s/api/internal/game-results", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(body))
	if err != nil {
		c.logger.Error("Failed to create request", zap.Error(err))
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Service", "socket-service")
	// TODO: Add internal service authentication token
	// req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.generateServiceToken()))

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Error("Failed to send request to API", zap.Error(err))
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.logger.Error("Failed to read response body", zap.Error(err))
		return fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.logger.Error("API returned error status",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(respBody)))
		return fmt.Errorf("API returned error status %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse response
	var apiResp GameResultResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		c.logger.Warn("Failed to parse API response", zap.Error(err))
		// Don't fail if we can't parse the response, as long as status was 2xx
	}

	c.logger.Info("Successfully submitted game results",
		zap.String("room_id", results.RoomID),
		zap.String("game_id", apiResp.GameID),
		zap.String("message", apiResp.Message))

	return nil
}

// generateServiceToken generates a JWT token for internal service authentication
// TODO: Implement proper JWT token generation for service-to-service auth
func (c *Client) generateServiceToken() string {
	// This would use the jwtSecret to create a token
	// For now, return empty string (will be implemented with full auth)
	return ""
}

// HealthCheck performs a health check on the API backend
func (c *Client) HealthCheck(ctx context.Context) error {
	url := fmt.Sprintf("%s/health", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check returned status %d", resp.StatusCode)
	}

	return nil
}


