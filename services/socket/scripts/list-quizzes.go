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

	// Get all published quizzes
	query := `
		SELECT id, user_id, title, description, difficulty, time_limit, 
		       total_questions, quiz_data, status, created_at, updated_at, 
		       published_at, version, image_url
		FROM quizzes
		WHERE status = 'published'
		ORDER BY created_at DESC
		LIMIT 10
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Fatalf("Failed to query quizzes: %v", err)
	}
	defer rows.Close()

	fmt.Println("\n📝 Published Quizzes:")
	fmt.Println("==================================================================================")

	var quizCount int
	for rows.Next() {
		var quiz Quiz
		err := rows.Scan(
			&quiz.ID, &quiz.UserID, &quiz.Title, &quiz.Description, &quiz.Difficulty,
			&quiz.TimeLimit, &quiz.TotalQuestions, &quiz.QuizData, &quiz.Status,
			&quiz.CreatedAt, &quiz.UpdatedAt, &quiz.PublishedAt, &quiz.Version, &quiz.ImageURL,
		)
		if err != nil {
			log.Fatalf("Failed to scan quiz: %v", err)
		}

		quizCount++
		fmt.Printf("\n%d. Quiz ID: %s\n", quizCount, quiz.ID)
		fmt.Printf("   Title: %s\n", quiz.Title)
		if quiz.Description != nil {
			fmt.Printf("   Description: %s\n", *quiz.Description)
		}
		fmt.Printf("   Difficulty: %s\n", quiz.Difficulty)
		fmt.Printf("   Total Questions: %d\n", quiz.TotalQuestions)
		fmt.Printf("   Status: %s\n", quiz.Status)
		fmt.Printf("   Created: %s\n", quiz.CreatedAt)

		// Parse quiz_data to show sample questions
		var quizData map[string]interface{}
		if err := json.Unmarshal(quiz.QuizData, &quizData); err == nil {
			if questions, ok := quizData["questions"].([]interface{}); ok {
				fmt.Printf("   Questions in quiz_data: %d\n", len(questions))
				if len(questions) > 0 {
					fmt.Printf("   Sample question: %v\n", questions[0])
				}
			}
		}
	}

	if quizCount == 0 {
		fmt.Println("❌ No published quizzes found")
		fmt.Println("\n💡 To test the websocket service, you need at least one quiz with status='published'")
		fmt.Println("   You can update a quiz status using:")
		fmt.Println("   UPDATE quizzes SET status = 'published' WHERE id = 'your-quiz-id';")
	} else {
		fmt.Printf("\n✅ Found %d published quizzes\n", quizCount)
		fmt.Println("\n🎯 You can use any of these quiz IDs to test the websocket service!")
	}

	// Also check for draft quizzes
	fmt.Println("\n📝 Draft Quizzes:")
	fmt.Println("========================================")

	draftQuery := `
		SELECT id, title, status, created_at
		FROM quizzes
		WHERE status = 'draft'
		ORDER BY created_at DESC
		LIMIT 5
	`

	draftRows, err := db.Query(draftQuery)
	if err != nil {
		log.Fatalf("Failed to query draft quizzes: %v", err)
	}
	defer draftRows.Close()

	var draftCount int
	for draftRows.Next() {
		var id, title, status, createdAt string
		if err := draftRows.Scan(&id, &title, &status, &createdAt); err != nil {
			log.Fatalf("Failed to scan draft quiz: %v", err)
		}
		draftCount++
		fmt.Printf("%d. %s (ID: %s) - %s\n", draftCount, title, id, createdAt)
	}

	if draftCount == 0 {
		fmt.Println("No draft quizzes found")
	} else {
		fmt.Printf("Found %d draft quizzes\n", draftCount)
	}

	fmt.Println("\n🎉 Database quiz listing completed!")
}
