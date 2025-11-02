package scoring

import (
	"math"
	"time"
)

// ScoreCalculator implements the latency-weighted scoring algorithm
type ScoreCalculator struct {
	basePoints  int
	maxStreak   int
	streakBonus float64 // 0.1 = 10% per streak
	timeAlpha   float64 // Power for time factor calculation
}

// NewScoreCalculator creates a new scoring calculator with default parameters
func NewScoreCalculator() *ScoreCalculator {
	return &ScoreCalculator{
		basePoints:  1000,
		maxStreak:   5,    // Max 50% bonus
		streakBonus: 0.10, // 10% per consecutive correct
		timeAlpha:   0.5,  // Square root curve for time factor
	}
}

// CalculateScore calculates the score for a player's answer
// 
// Formula: score = basePoints × timeFactor × (1 + streakBonus)
// 
// Where:
// - basePoints = 1000
// - timeFactor = max(0, 1 - (elapsed/timeLimit)^α) where α=0.5
// - streakBonus = min(streak × 0.10, 0.50) // Max 50% bonus
//
// Parameters:
// - elapsedMs: Time taken to answer in milliseconds
// - timeLimitMs: Time limit for the question in milliseconds
// - currentStreak: Number of consecutive correct answers (before this one)
// - isCorrect: Whether the answer is correct
//
// Returns:
// - score: The calculated score (0 if incorrect)
// - newStreak: The updated streak count
func (c *ScoreCalculator) CalculateScore(elapsedMs, timeLimitMs int64, currentStreak int, isCorrect bool) (score int, newStreak int) {
	// Incorrect answer: no points, streak breaks
	if !isCorrect {
		return 0, 0
	}

	// Ensure no division by zero
	if timeLimitMs <= 0 {
		timeLimitMs = 30000 // Default 30 seconds
	}

	// Calculate time factor: f(t) = max(0, 1 - (elapsed/timeLimit)^α)
	timeFraction := float64(elapsedMs) / float64(timeLimitMs)
	
	// Clamp time fraction to [0, 1]
	if timeFraction < 0 {
		timeFraction = 0
	}
	if timeFraction > 1 {
		timeFraction = 1
	}

	// Apply power curve (square root makes early answers more valuable)
	timeFactor := 1.0 - math.Pow(timeFraction, c.timeAlpha)
	if timeFactor < 0 {
		timeFactor = 0
	}

	// Calculate streak bonus: min(streak × 0.10, 0.50)
	streakMultiplier := float64(currentStreak) * c.streakBonus
	maxBonus := float64(c.maxStreak) * c.streakBonus
	if streakMultiplier > maxBonus {
		streakMultiplier = maxBonus
	}

	// Final score calculation
	finalScore := float64(c.basePoints) * timeFactor * (1.0 + streakMultiplier)
	
	// Round to nearest integer
	score = int(math.Round(finalScore))

	// Update streak
	newStreak = currentStreak + 1

	return score, newStreak
}

// GetStreakBonus returns the bonus multiplier for a given streak
func (c *ScoreCalculator) GetStreakBonus(streak int) float64 {
	bonus := float64(streak) * c.streakBonus
	maxBonus := float64(c.maxStreak) * c.streakBonus
	if bonus > maxBonus {
		bonus = maxBonus
	}
	return bonus
}

// GetTimeFactor calculates just the time component of the score
func (c *ScoreCalculator) GetTimeFactor(elapsedMs, timeLimitMs int64) float64 {
	if timeLimitMs <= 0 {
		timeLimitMs = 30000
	}

	timeFraction := float64(elapsedMs) / float64(timeLimitMs)
	if timeFraction < 0 {
		timeFraction = 0
	}
	if timeFraction > 1 {
		timeFraction = 1
	}

	timeFactor := 1.0 - math.Pow(timeFraction, c.timeAlpha)
	if timeFactor < 0 {
		timeFactor = 0
	}

	return timeFactor
}

// PlayerScoreState tracks a player's scoring state
type PlayerScoreState struct {
	UserID            string
	TotalScore        int
	CorrectAnswers    int
	TotalAnswers      int
	CurrentStreak     int
	MaxStreak         int
	AverageResponseMs int64
	TotalResponseMs   int64
}

// NewPlayerScoreState creates a new player score state
func NewPlayerScoreState(userID string) *PlayerScoreState {
	return &PlayerScoreState{
		UserID:         userID,
		TotalScore:     0,
		CorrectAnswers: 0,
		TotalAnswers:   0,
		CurrentStreak:  0,
		MaxStreak:      0,
	}
}

// RecordAnswer records an answer and updates the player's state
func (p *PlayerScoreState) RecordAnswer(scoreDelta int, isCorrect bool, responseMs int64, newStreak int) {
	p.TotalScore += scoreDelta
	p.TotalAnswers++
	p.TotalResponseMs += responseMs

	if p.TotalAnswers > 0 {
		p.AverageResponseMs = p.TotalResponseMs / int64(p.TotalAnswers)
	}

	if isCorrect {
		p.CorrectAnswers++
		p.CurrentStreak = newStreak
		if p.CurrentStreak > p.MaxStreak {
			p.MaxStreak = p.CurrentStreak
		}
	} else {
		p.CurrentStreak = 0
	}
}

// GetAccuracy returns the accuracy percentage (0-100)
func (p *PlayerScoreState) GetAccuracy() float64 {
	if p.TotalAnswers == 0 {
		return 0
	}
	return (float64(p.CorrectAnswers) / float64(p.TotalAnswers)) * 100.0
}

// LeaderboardEntry represents a player's position on the leaderboard
type LeaderboardEntry struct {
	UserID      string
	DisplayName string
	Score       int
	Rank        int
	Correct     int
	Total       int
}

// QuizStatistics represents overall quiz statistics
type QuizStatistics struct {
	TotalQuestions    int
	TotalParticipants int
	AverageScore      float64
	CompletionRate    float64
	Duration          int64 // milliseconds
}

// UserStats represents user statistics (compatible with room package)
type UserStats struct {
	CorrectAnswers      int
	TotalAnswered       int
	AverageResponseTime int64 // milliseconds
	CurrentStreak       int
	MaxStreak           int
	TotalResponseMs     int64
}

// UpdateUserStats updates user statistics based on an answer
func (c *ScoreCalculator) UpdateUserStats(stats *UserStats, isCorrect bool, timeTaken int64) {
	stats.TotalAnswered++
	stats.TotalResponseMs += timeTaken

	if stats.TotalAnswered > 0 {
		stats.AverageResponseTime = stats.TotalResponseMs / int64(stats.TotalAnswered)
	}

	if isCorrect {
		stats.CorrectAnswers++
		stats.CurrentStreak++
		if stats.CurrentStreak > stats.MaxStreak {
			stats.MaxStreak = stats.CurrentStreak
		}
	} else {
		stats.CurrentStreak = 0
	}
}

// CalculateLeaderboard calculates and sorts the leaderboard
func (c *ScoreCalculator) CalculateLeaderboard(
	userScores map[string]int,
	userNames map[string]string,
	userStats map[string]UserStats,
) []LeaderboardEntry {
	entries := make([]LeaderboardEntry, 0, len(userScores))

	for userID, score := range userScores {
		stats := userStats[userID]
		name := userNames[userID]
		if name == "" {
			name = "Unknown"
		}

		entries = append(entries, LeaderboardEntry{
			UserID:      userID,
			DisplayName: name,
			Score:       score,
			Correct:     stats.CorrectAnswers,
			Total:       stats.TotalAnswered,
		})
	}

	// Sort by score descending
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].Score > entries[i].Score {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// Assign ranks
	for i := range entries {
		entries[i].Rank = i + 1
	}

	return entries
}

// CalculateQuizStats calculates overall quiz statistics
func (c *ScoreCalculator) CalculateQuizStats(
	userStats map[string]UserStats,
	totalQuestions int,
	startTime int64, // Unix timestamp in milliseconds
) QuizStatistics {
	totalParticipants := len(userStats)
	totalScore := 0
	totalAnswered := 0

	for _, stats := range userStats {
		totalScore += stats.CorrectAnswers * 1000 // Approximate
		totalAnswered += stats.TotalAnswered
	}

	avgScore := 0.0
	if totalParticipants > 0 {
		avgScore = float64(totalScore) / float64(totalParticipants)
	}

	completionRate := 0.0
	if totalQuestions > 0 && totalParticipants > 0 {
		completionRate = float64(totalAnswered) / float64(totalQuestions*totalParticipants) * 100.0
	}

	duration := int64(0)
	if startTime > 0 {
		duration = time.Now().UnixMilli() - startTime
	}

	return QuizStatistics{
		TotalQuestions:    totalQuestions,
		TotalParticipants: totalParticipants,
		AverageScore:      avgScore,
		CompletionRate:    completionRate,
		Duration:          duration,
	}
}

// CalculateScoreWithTime is a compatibility method for room package
// It converts time.Duration to milliseconds and uses the main CalculateScore method
func (c *ScoreCalculator) CalculateScoreWithTime(isCorrect bool, timeTaken, maxTime time.Duration, currentStreak int) int {
	elapsedMs := timeTaken.Milliseconds()
	timeLimitMs := maxTime.Milliseconds()
	
	score, _ := c.CalculateScore(elapsedMs, timeLimitMs, currentStreak, isCorrect)
	return score
}
