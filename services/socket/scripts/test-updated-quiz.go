package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"

	_ "github.com/lib/pq"
)

type Quiz struct {
	ID             string          `json:"id"`
	UserID         string          `json:"user_id"`
	Title          string          `json:"title"`
	Description    *string         `json:"description"`
	Difficulty     string          `json:"difficulty"`
	TimeLimit      int             `json:"time_limit"`
	TotalQuestions int             `json:"total_questions"`
	QuizData       json.RawMessage `json:"quiz_data"`
	Status         string          `json:"status"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
	PublishedAt    *string         `json:"published_at"`
	Version        int             `json:"version"`
	ImageURL       *string         `json:"image_url"`
}

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

func main() {
	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("✅ Connected to database successfully")

	// Test quiz retrieval with the same query as the Go service
	testQuizID := "5ff909d5-40f6-4185-af9d-dba6f4997b4b"
	fmt.Printf("\n🔍 Testing quiz retrieval for ID: %s\n", testQuizID)

	query := `
		SELECT id, user_id, title, description, difficulty, time_limit, 
		       total_questions, quiz_data, status, created_at, updated_at, 
		       published_at, version, image_url
		FROM quizzes
		WHERE id = $1 AND status = 'published'
	`

	quiz := &Quiz{}
	err = db.QueryRow(query, testQuizID).Scan(
		&quiz.ID, &quiz.UserID, &quiz.Title, &quiz.Description, &quiz.Difficulty,
		&quiz.TimeLimit, &quiz.TotalQuestions, &quiz.QuizData, &quiz.Status,
		&quiz.CreatedAt, &quiz.UpdatedAt, &quiz.PublishedAt, &quiz.Version, &quiz.ImageURL,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Printf("❌ Quiz not found with ID: %s\n", testQuizID)
		} else {
			fmt.Printf("❌ Error retrieving quiz: %v\n", err)
		}
		return
	}

	fmt.Printf("✅ Quiz found successfully!\n")
	fmt.Printf("   Title: %s\n", quiz.Title)
	fmt.Printf("   Status: %s\n", quiz.Status)
	fmt.Printf("   Total Questions: %d\n", quiz.TotalQuestions)

	// Parse questions from quiz_data JSON (same logic as Go service)
	var questions []Question
	var quizData map[string]interface{}
	if err := json.Unmarshal(quiz.QuizData, &quizData); err == nil {
		if questionsData, ok := quizData["questions"].([]interface{}); ok {
			for i, q := range questionsData {
				if questionMap, ok := q.(map[string]interface{}); ok {
					question := Question{
						Index: i,
					}
					
					if questionText, ok := questionMap["question"].(string); ok {
						question.QuestionText = questionText
					}
					
					// Parse options array with id/text structure
					if options, ok := questionMap["options"].([]interface{}); ok {
						for _, opt := range options {
							if optMap, ok := opt.(map[string]interface{}); ok {
								if text, ok := optMap["text"].(string); ok {
									question.Options = append(question.Options, text)
								}
							}
						}
					}
					
					// Parse correctAnswer (string) and convert to correctIndex
					if correctAnswer, ok := questionMap["correctAnswer"].(string); ok {
						question.CorrectAnswer = correctAnswer
						// Convert string to int for correctIndex
						if correctIndex, err := strconv.Atoi(correctAnswer); err == nil {
							question.CorrectIndex = correctIndex
						}
					}
					
					if explanation, ok := questionMap["explanation"].(string); ok {
						question.Explanation = explanation
					}
					
					if questionType, ok := questionMap["type"].(string); ok {
						question.Type = questionType
					}
					
					if points, ok := questionMap["points"].(float64); ok {
						question.Points = int(points)
					}
					
					questions = append(questions, question)
				}
			}
		}
	}

	fmt.Printf("\n❓ Parsed %d questions successfully!\n", len(questions))
	
	if len(questions) > 0 {
		fmt.Printf("\n📝 Sample question (parsed):\n")
		q := questions[0]
		fmt.Printf("   Question: %s\n", q.QuestionText)
		fmt.Printf("   Options: %v\n", q.Options)
		fmt.Printf("   Correct Answer: %s (index: %d)\n", q.CorrectAnswer, q.CorrectIndex)
		fmt.Printf("   Type: %s\n", q.Type)
		fmt.Printf("   Points: %d\n", q.Points)
	}

	fmt.Println("\n🎉 Updated quiz parsing test completed!")
}

