package main

import (
	"context"
	"log"
	"time"

	"quiz-realtime-service/internal/config"
	"quiz-realtime-service/internal/database"

	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create logger
	logger, err := zap.NewDevelopment()
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	logger.Info("Starting database connection test")

	// Test database connection
	db, err := database.New(database.Config{
		URL:             cfg.Database.URL,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
	}, logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	logger.Info("Database connection established successfully")

	// Test basic query
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn := db.GetConnection()

	// Test 1: Check if we can query the database
	var version string
	err = conn.QueryRowContext(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		logger.Error("Failed to query database version", zap.Error(err))
	} else {
		logger.Info("Database version", zap.String("version", version))
	}

	// Test 2: Check if quiz_rooms table exists
	var tableExists bool
	err = conn.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'quiz_rooms'
		)
	`).Scan(&tableExists)
	if err != nil {
		logger.Error("Failed to check if quiz_rooms table exists", zap.Error(err))
	} else {
		logger.Info("quiz_rooms table exists", zap.Bool("exists", tableExists))
	}

	// Test 3: Check if quizzes table exists
	err = conn.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'quizzes'
		)
	`).Scan(&tableExists)
	if err != nil {
		logger.Error("Failed to check if quizzes table exists", zap.Error(err))
	} else {
		logger.Info("quizzes table exists", zap.Bool("exists", tableExists))
	}

	// Test 4: Count quizzes
	var quizCount int
	err = conn.QueryRowContext(ctx, "SELECT COUNT(*) FROM quizzes").Scan(&quizCount)
	if err != nil {
		logger.Error("Failed to count quizzes", zap.Error(err))
	} else {
		logger.Info("Quiz count", zap.Int("count", quizCount))
	}

	// Test 5: Count quiz rooms
	var roomCount int
	err = conn.QueryRowContext(ctx, "SELECT COUNT(*) FROM quiz_rooms").Scan(&roomCount)
	if err != nil {
		logger.Error("Failed to count quiz rooms", zap.Error(err))
	} else {
		logger.Info("Quiz room count", zap.Int("count", roomCount))
	}

	// Test 6: Get a sample quiz
	rows, err := conn.QueryContext(ctx, `
		SELECT id, title, difficulty, total_questions, status, created_at
		FROM quizzes 
		WHERE status = 'published' 
		LIMIT 5
	`)
	if err != nil {
		logger.Error("Failed to query sample quizzes", zap.Error(err))
	} else {
		defer rows.Close()
		
		logger.Info("Sample quizzes:")
		for rows.Next() {
			var id, title, difficulty, status string
			var totalQuestions int
			var createdAt time.Time
			
			err := rows.Scan(&id, &title, &difficulty, &totalQuestions, &status, &createdAt)
			if err != nil {
				logger.Error("Failed to scan quiz row", zap.Error(err))
				continue
			}
			
			logger.Info("Quiz found",
				zap.String("id", id),
				zap.String("title", title),
				zap.String("difficulty", difficulty),
				zap.Int("total_questions", totalQuestions),
				zap.String("status", status),
				zap.Time("created_at", createdAt))
		}
	}

	// Test 7: Test room creation (dry run)
	logger.Info("Testing room creation query...")
	
	// Test the room creation query without actually inserting
	testQuery := `
		INSERT INTO quiz_rooms (id, pin, host_user_id, quiz_id, status, settings_json, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	
	// Prepare the statement to test syntax
	stmt, err := conn.PrepareContext(ctx, testQuery)
	if err != nil {
		logger.Error("Failed to prepare room creation query", zap.Error(err))
	} else {
		stmt.Close()
		logger.Info("Room creation query syntax is valid")
	}

	// Test 8: Test member addition query
	testMemberQuery := `
		INSERT INTO quiz_room_members (id, room_id, user_id, display_name, role, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	
	stmt, err = conn.PrepareContext(ctx, testMemberQuery)
	if err != nil {
		logger.Error("Failed to prepare member addition query", zap.Error(err))
	} else {
		stmt.Close()
		logger.Info("Member addition query syntax is valid")
	}

	logger.Info("Database connection test completed successfully")
}
