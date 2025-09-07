package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
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

	// Check if quizzes table exists and get its structure
	fmt.Println("\n📊 Checking quizzes table...")
	
	var tableExists bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'quizzes'
		);
	`).Scan(&tableExists)

	if err != nil {
		log.Fatalf("Failed to check if quizzes table exists: %v", err)
	}

	if !tableExists {
		fmt.Println("❌ Quizzes table does not exist")
		return
	}

	fmt.Println("✅ Quizzes table exists")

	// Get table structure
	fmt.Println("\n🔍 Quizzes table structure:")
	rows, err := db.Query(`
		SELECT column_name, data_type, is_nullable, column_default
		FROM information_schema.columns 
		WHERE table_name = 'quizzes' 
		ORDER BY ordinal_position
	`)
	if err != nil {
		log.Fatalf("Failed to get table structure: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var colName, dataType, isNullable, defaultValue sql.NullString
		if err := rows.Scan(&colName, &dataType, &isNullable, &defaultValue); err != nil {
			log.Fatalf("Failed to scan column info: %v", err)
		}
		fmt.Printf("  - %s: %s (nullable: %s, default: %s)\n", 
			colName.String, dataType.String, isNullable.String, defaultValue.String)
	}

	// Count quizzes
	var quizCount int
	err = db.QueryRow("SELECT COUNT(*) FROM quizzes").Scan(&quizCount)
	if err != nil {
		log.Fatalf("Failed to count quizzes: %v", err)
	}

	fmt.Printf("\n📝 Found %d quizzes in database\n", quizCount)

	// List first 5 quizzes
	fmt.Println("\n📋 Sample quizzes:")
	rows, err = db.Query(`
		SELECT id, title, description, status, created_at 
		FROM quizzes 
		ORDER BY created_at DESC 
		LIMIT 5
	`)
	if err != nil {
		log.Fatalf("Failed to query quizzes: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, title, description, status, createdAt string
		if err := rows.Scan(&id, &title, &description, &status, &createdAt); err != nil {
			log.Fatalf("Failed to scan quiz: %v", err)
		}
		fmt.Printf("  - ID: %s\n    Title: %s\n    Status: %s\n    Created: %s\n\n", 
			id, title, status, createdAt)
	}

	// Check questions table
	fmt.Println("🔍 Checking questions table...")
	var questionsExist bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'questions'
		);
	`).Scan(&questionsExist)

	if questionsExist {
		var questionCount int
		err = db.QueryRow("SELECT COUNT(*) FROM questions").Scan(&questionCount)
		if err != nil {
			log.Fatalf("Failed to count questions: %v", err)
		}
		fmt.Printf("✅ Questions table exists with %d questions\n", questionCount)
	} else {
		fmt.Println("❌ Questions table does not exist")
	}

	// Check quiz_rooms table
	fmt.Println("\n🔍 Checking quiz_rooms table...")
	var roomsExist bool
	err = db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'quiz_rooms'
		);
	`).Scan(&roomsExist)

	if roomsExist {
		var roomCount int
		err = db.QueryRow("SELECT COUNT(*) FROM quiz_rooms").Scan(&roomCount)
		if err != nil {
			log.Fatalf("Failed to count rooms: %v", err)
		}
		fmt.Printf("✅ Quiz rooms table exists with %d rooms\n", roomCount)
	} else {
		fmt.Println("❌ Quiz rooms table does not exist")
	}

	fmt.Println("\n🎉 Database connection test completed!")
}

