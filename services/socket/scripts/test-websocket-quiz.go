package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"quiz-realtime-service/internal/repository"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

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

	// Create logger
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	// Create repository
	roomRepo := repository.NewRoomRepository(db, logger)

	// Test quiz retrieval using the same method as websocket service
	testQuizID := "5ff909d5-40f6-4185-af9d-dba6f4997b4b"
	fmt.Printf("\n🔍 Testing quiz retrieval using repository for ID: %s\n", testQuizID)

	quiz, err := roomRepo.GetQuiz(testQuizID)
	if err != nil {
		fmt.Printf("❌ Quiz not found: %v\n", err)
		return
	}

	fmt.Printf("✅ Quiz found successfully!\n")
	fmt.Printf("   Title: %s\n", quiz.Title)
	fmt.Printf("   Status: %s\n", quiz.Status)
	fmt.Printf("   Total Questions: %d\n", quiz.TotalQuestions)

	// Test questions retrieval
	questions, err := roomRepo.GetQuizQuestions(testQuizID)
	if err != nil {
		fmt.Printf("❌ Failed to get questions: %v\n", err)
		return
	}

	fmt.Printf("✅ Retrieved %d questions successfully!\n", len(questions))
	
	if len(questions) > 0 {
		fmt.Printf("\n📝 Sample question:\n")
		q := questions[0]
		fmt.Printf("   Question: %s\n", q.QuestionText)
		fmt.Printf("   Options: %v\n", q.Options)
		fmt.Printf("   Correct Answer: %s (index: %d)\n", q.CorrectAnswer, q.CorrectIndex)
		fmt.Printf("   Type: %s\n", q.Type)
		fmt.Printf("   Points: %d\n", q.Points)
	}

	fmt.Println("\n🎉 Repository test completed successfully!")
	fmt.Println("✅ The websocket service should now be able to find and use this quiz!")
}

