package scoring

import (
	"testing"
)

func TestScoreCalculator_CalculateScore(t *testing.T) {
	calc := NewScoreCalculator()

	tests := []struct {
		name          string
		elapsedMs     int64
		timeLimitMs   int64
		currentStreak int
		isCorrect     bool
		wantMinScore  int
		wantMaxScore  int
		wantStreak    int
	}{
		{
			name:          "Instant correct answer, no streak",
			elapsedMs:     100,
			timeLimitMs:   30000,
			currentStreak: 0,
			isCorrect:     true,
			wantMinScore:  900, // Should be close to 1000
			wantMaxScore:  1000,
			wantStreak:    1,
		},
		{
			name:          "Half time correct answer, no streak",
			elapsedMs:     15000,
			timeLimitMs:   30000,
			currentStreak: 0,
			isCorrect:     true,
			wantMinScore:  200,
			wantMaxScore:  400,
			wantStreak:    1,
		},
		{
			name:          "Instant correct answer, 2 streak",
			elapsedMs:     100,
			timeLimitMs:   30000,
			currentStreak: 2,
			isCorrect:     true,
			wantMinScore:  1100, // 1000 * ~1.0 * (1 + 0.20)
			wantMaxScore:  1200,
			wantStreak:    3,
		},
		{
			name:          "Incorrect answer breaks streak",
			elapsedMs:     5000,
			timeLimitMs:   30000,
			currentStreak: 3,
			isCorrect:     false,
			wantMinScore:  0,
			wantMaxScore:  0,
			wantStreak:    0,
		},
		{
			name:          "Max streak bonus (5 streak)",
			elapsedMs:     100,
			timeLimitMs:   30000,
			currentStreak: 5,
			isCorrect:     true,
			wantMinScore:  1400, // 1000 * ~1.0 * (1 + 0.50)
			wantMaxScore:  1500,
			wantStreak:    6,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, newStreak := calc.CalculateScore(tt.elapsedMs, tt.timeLimitMs, tt.currentStreak, tt.isCorrect)
			
			if score < tt.wantMinScore || score > tt.wantMaxScore {
				t.Errorf("CalculateScore() score = %v, want between %v and %v", score, tt.wantMinScore, tt.wantMaxScore)
			}
			
			if newStreak != tt.wantStreak {
				t.Errorf("CalculateScore() streak = %v, want %v", newStreak, tt.wantStreak)
			}
		})
	}
}

func TestPlayerScoreState_RecordAnswer(t *testing.T) {
	player := NewPlayerScoreState("user-123")

	// Record first correct answer
	player.RecordAnswer(800, true, 5000, 1)
	if player.TotalScore != 800 {
		t.Errorf("Expected score 800, got %d", player.TotalScore)
	}
	if player.CurrentStreak != 1 {
		t.Errorf("Expected streak 1, got %d", player.CurrentStreak)
	}
	if player.CorrectAnswers != 1 {
		t.Errorf("Expected 1 correct answer, got %d", player.CorrectAnswers)
	}

	// Record second correct answer
	player.RecordAnswer(900, true, 3000, 2)
	if player.TotalScore != 1700 {
		t.Errorf("Expected score 1700, got %d", player.TotalScore)
	}
	if player.CurrentStreak != 2 {
		t.Errorf("Expected streak 2, got %d", player.CurrentStreak)
	}

	// Record incorrect answer (breaks streak)
	player.RecordAnswer(0, false, 10000, 0)
	if player.TotalScore != 1700 {
		t.Errorf("Expected score 1700, got %d", player.TotalScore)
	}
	if player.CurrentStreak != 0 {
		t.Errorf("Expected streak 0, got %d", player.CurrentStreak)
	}
	if player.CorrectAnswers != 2 {
		t.Errorf("Expected 2 correct answers, got %d", player.CorrectAnswers)
	}

	// Check accuracy
	accuracy := player.GetAccuracy()
	expectedAccuracy := (2.0 / 3.0) * 100.0
	if accuracy < expectedAccuracy-1 || accuracy > expectedAccuracy+1 {
		t.Errorf("Expected accuracy ~%.2f, got %.2f", expectedAccuracy, accuracy)
	}
}


