package scoring

import (
	"math"
	"time"
)

type ScoreCalculator struct {
	basePoints      int
	timeWeight      float64
	streakMultiplier float64
}

type AnswerResult struct {
	UserID      string
	IsCorrect   bool
	TimeTaken   time.Duration
	MaxTime     time.Duration
	Score       int
	ScoreDelta  int
	Streak      int
}

func NewScoreCalculator() *ScoreCalculator {
	return &ScoreCalculator{
		basePoints:      1000,
		timeWeight:      1.2,
		streakMultiplier: 0.1,
	}
}

// CalculateScore computes score based on correctness and response time
func (sc *ScoreCalculator) CalculateScore(isCorrect bool, timeTaken, maxTime time.Duration, currentStreak int) int {
	if !isCorrect {
		return 0
	}

	// Calculate time factor (0 to 1, where 1 is instant response)
	timeFactor := sc.calculateTimeFactor(timeTaken, maxTime)
	
	// Base score with time weighting
	score := float64(sc.basePoints) * timeFactor
	
	// Apply streak bonus
	streakBonus := float64(currentStreak) * sc.streakMultiplier
	score = score * (1.0 + streakBonus)
	
	return int(math.Round(score))
}

// calculateTimeFactor returns a value between 0 and 1 based on response time
func (sc *ScoreCalculator) calculateTimeFactor(timeTaken, maxTime time.Duration) float64 {
	if timeTaken >= maxTime {
		return 0.0
	}
	
	// Calculate time fraction (0 = instant, 1 = max time)
	timeFraction := float64(timeTaken) / float64(maxTime)
	
	// Apply exponential decay: f(t) = max(0, 1 - t^α)
	// where α controls the curve steepness
	alpha := sc.timeWeight
	factor := math.Max(0, 1.0 - math.Pow(timeFraction, alpha))
	
	return factor
}

type scoreEntry struct {
	userID string
	score  int
	stats  UserStats
}

// CalculateLeaderboard sorts users by score and assigns ranks
func (sc *ScoreCalculator) CalculateLeaderboard(userScores map[string]int, userNames map[string]string, userStats map[string]UserStats) []LeaderboardEntry {
	
	// Convert to slice for sorting
	entries := make([]scoreEntry, 0, len(userScores))
	for userID, score := range userScores {
		stats := userStats[userID]
		entries = append(entries, scoreEntry{
			userID: userID,
			score:  score,
			stats:  stats,
		})
	}
	
	// Sort by score (descending), then by correct answers, then by average time
	for i := 0; i < len(entries)-1; i++ {
		for j := i + 1; j < len(entries); j++ {
			if sc.shouldSwap(entries[i], entries[j]) {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}
	
	// Create leaderboard with ranks
	leaderboard := make([]LeaderboardEntry, len(entries))
	currentRank := 1
	
	for i, entry := range entries {
		// Handle ties - same score gets same rank
		if i > 0 && entries[i-1].score != entry.score {
			currentRank = i + 1
		}
		
		displayName := userNames[entry.userID]
		if displayName == "" {
			displayName = "Anonymous"
		}
		
		leaderboard[i] = LeaderboardEntry{
			UserID:      entry.userID,
			DisplayName: displayName,
			Score:       entry.score,
			Rank:        currentRank,
			Correct:     entry.stats.CorrectAnswers,
			Total:       entry.stats.TotalAnswered,
		}
	}
	
	return leaderboard
}

func (sc *ScoreCalculator) shouldSwap(a, b scoreEntry) bool {
	// Primary: Higher score wins
	if a.score != b.score {
		return a.score < b.score
	}
	
	// Secondary: More correct answers wins
	if a.stats.CorrectAnswers != b.stats.CorrectAnswers {
		return a.stats.CorrectAnswers < b.stats.CorrectAnswers
	}
	
	// Tertiary: Faster average response time wins
	return a.stats.AverageResponseTime > b.stats.AverageResponseTime
}

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

// UpdateUserStats updates user statistics after answering a question
func (sc *ScoreCalculator) UpdateUserStats(stats *UserStats, isCorrect bool, responseTime time.Duration) {
	stats.TotalAnswered++
	
	if isCorrect {
		stats.CorrectAnswers++
		stats.CurrentStreak++
		if stats.CurrentStreak > stats.MaxStreak {
			stats.MaxStreak = stats.CurrentStreak
		}
	} else {
		stats.CurrentStreak = 0
	}
	
	// Update average response time
	if stats.TotalAnswered == 1 {
		stats.AverageResponseTime = responseTime
	} else {
		// Calculate running average
		totalTime := stats.AverageResponseTime * time.Duration(stats.TotalAnswered-1)
		totalTime += responseTime
		stats.AverageResponseTime = totalTime / time.Duration(stats.TotalAnswered)
	}
}

// CalculateQuizStats computes overall quiz statistics
func (sc *ScoreCalculator) CalculateQuizStats(userStats map[string]UserStats, totalQuestions int, startTime time.Time) QuizStatistics {
	if len(userStats) == 0 {
		return QuizStatistics{}
	}
	
	var totalScore int
	var totalCorrect int
	var totalAnswered int
	
	for _, stats := range userStats {
		totalScore += stats.CorrectAnswers * sc.basePoints // Simplified for stats
		totalCorrect += stats.CorrectAnswers
		totalAnswered += stats.TotalAnswered
	}
	
	participantCount := len(userStats)
	averageScore := float64(totalScore) / float64(participantCount)
	
	completionRate := 0.0
	if totalQuestions > 0 {
		expectedAnswers := participantCount * totalQuestions
		completionRate = float64(totalAnswered) / float64(expectedAnswers)
	}
	
	return QuizStatistics{
		TotalQuestions:    totalQuestions,
		TotalParticipants: participantCount,
		AverageScore:      averageScore,
		CompletionRate:    completionRate,
		Duration:          time.Since(startTime),
	}
}

type QuizStatistics struct {
	TotalQuestions    int           `json:"total_questions"`
	TotalParticipants int           `json:"total_participants"`
	AverageScore      float64       `json:"average_score"`
	CompletionRate    float64       `json:"completion_rate"`
	Duration          time.Duration `json:"duration_ms"`
}
