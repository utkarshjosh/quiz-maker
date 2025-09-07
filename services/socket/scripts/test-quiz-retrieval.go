package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

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
	testQuizID := "5ff909d5-40f6-4185-af9d-dba6f4997b4b" // First quiz from the list
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

	// Parse quiz_data to see the structure
	var quizData map[string]interface{}
	if err := json.Unmarshal(quiz.QuizData, &quizData); err != nil {
		fmt.Printf("❌ Failed to parse quiz_data: %v\n", err)
		return
	}

	fmt.Printf("\n📊 Quiz data structure:\n")
	for key, value := range quizData {
		fmt.Printf("   %s: %T\n", key, value)
	}

	// Check if questions exist in quiz_data
	if questions, ok := quizData["questions"].([]interface{}); ok {
		fmt.Printf("\n❓ Found %d questions in quiz_data\n", len(questions))
		if len(questions) > 0 {
			fmt.Printf("   Sample question structure:\n")
			questionJSON, _ := json.MarshalIndent(questions[0], "   ", "  ")
			fmt.Printf("%s\n", questionJSON)
		}
	} else {
		fmt.Printf("❌ No 'questions' array found in quiz_data\n")
		fmt.Printf("   Available keys: ")
		for key := range quizData {
			fmt.Printf("%s ", key)
		}
		fmt.Println()
	}

	fmt.Println("\n🎉 Quiz retrieval test completed!")
}

