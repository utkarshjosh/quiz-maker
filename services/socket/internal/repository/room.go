package repository

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	mathrand "math/rand"
	"strconv"
	"time"

	"quiz-realtime-service/internal/models"

	"go.uber.org/zap"
)

type RoomRepository struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewRoomRepository(db *sql.DB, logger *zap.Logger) *RoomRepository {
	return &RoomRepository{
		db:     db,
		logger: logger,
	}
}

// CreateRoom creates a new quiz room in the database
func (r *RoomRepository) CreateRoom(hostID, quizID string, settings models.RoomSettings) (*models.QuizRoom, error) {
	// Generate unique PIN
	pin, err := r.generateUniquePIN()
	if err != nil {
		return nil, fmt.Errorf("failed to generate PIN: %w", err)
	}

	// Create room
	room := &models.QuizRoom{
		ID:       generateUUID(),
		PIN:      pin,
		HostID:   hostID,
		QuizID:   quizID,
		Status:   "lobby",
		Settings: settings.ToJSONB(),
		CreatedAt: time.Now(),
	}

	query := `
		INSERT INTO quiz_rooms (id, pin, host_user_id, quiz_id, status, settings_json, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err = r.db.Exec(query, room.ID, room.PIN, room.HostID, room.QuizID, room.Status, room.Settings, room.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create room: %w", err)
	}

	// Add host as a member
	err = r.AddMember(room.ID, hostID, "Host User", "host")
	if err != nil {
		// If adding host fails, clean up the room
		r.DeleteRoom(room.ID)
		return nil, fmt.Errorf("failed to add host as member: %w", err)
	}

	r.logger.Info("Room created successfully", 
		zap.String("room_id", room.ID),
		zap.String("pin", room.PIN),
		zap.String("host_id", hostID))

	return room, nil
}

// GetRoomByID retrieves a room by its ID
func (r *RoomRepository) GetRoomByID(roomID string) (*models.QuizRoom, error) {
	query := `
		SELECT id, pin, host_user_id, quiz_id, status, settings_json, created_at, started_at, ended_at, closed_at
		FROM quiz_rooms
		WHERE id = $1
	`

	room := &models.QuizRoom{}
	err := r.db.QueryRow(query, roomID).Scan(
		&room.ID, &room.PIN, &room.HostID, &room.QuizID, &room.Status,
		&room.Settings, &room.CreatedAt, &room.StartedAt, &room.EndedAt, &room.ClosedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("room not found")
		}
		return nil, fmt.Errorf("failed to get room: %w", err)
	}

	return room, nil
}

// GetRoomByPIN retrieves a room by its PIN
func (r *RoomRepository) GetRoomByPIN(pin string) (*models.QuizRoom, error) {
	query := `
		SELECT id, pin, host_user_id, quiz_id, status, settings_json, created_at, started_at, ended_at, closed_at
		FROM quiz_rooms
		WHERE pin = $1 AND closed_at IS NULL
	`

	room := &models.QuizRoom{}
	err := r.db.QueryRow(query, pin).Scan(
		&room.ID, &room.PIN, &room.HostID, &room.QuizID, &room.Status,
		&room.Settings, &room.CreatedAt, &room.StartedAt, &room.EndedAt, &room.ClosedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("room not found")
		}
		return nil, fmt.Errorf("failed to get room by PIN: %w", err)
	}

	return room, nil
}

// UpdateRoomStatus updates the status of a room
func (r *RoomRepository) UpdateRoomStatus(roomID, status string) error {
	query := `UPDATE quiz_rooms SET status = $1 WHERE id = $2`
	
	_, err := r.db.Exec(query, status, roomID)
	if err != nil {
		return fmt.Errorf("failed to update room status: %w", err)
	}

	return nil
}

// AddMember adds a member to a room
func (r *RoomRepository) AddMember(roomID, userID, displayName, role string) error {
	// First, get the user's picture data
	var picture *string
	userQuery := `SELECT picture FROM users WHERE id = $1`
	err := r.db.QueryRow(userQuery, userID).Scan(&picture)
	if err != nil {
		r.logger.Warn("Failed to get user picture, continuing without picture", 
			zap.String("user_id", userID), 
			zap.Error(err))
		// Continue without picture data
	}

	member := &models.QuizRoomMember{
		ID:          generateUUID(),
		RoomID:      roomID,
		UserID:      userID,
		DisplayName: displayName,
		Role:        role,
		Picture:     picture,
		JoinedAt:    time.Now(),
	}

	query := `
		INSERT INTO quiz_room_members (id, room_id, user_id, display_name, role, picture, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err = r.db.Exec(query, member.ID, member.RoomID, member.UserID, member.DisplayName, member.Role, member.Picture, member.JoinedAt)
	if err != nil {
		return fmt.Errorf("failed to add member: %w", err)
	}

	return nil
}

// GetRoomMembers retrieves all members of a room with user picture data
func (r *RoomRepository) GetRoomMembers(roomID string) ([]models.QuizRoomMember, error) {
	query := `
		SELECT 
			qrm.id, qrm.room_id, qrm.user_id, qrm.display_name, qrm.role, 
			qrm.joined_at, qrm.left_at, qrm.kicked_by, qrm.kick_reason,
			u.picture
		FROM quiz_room_members qrm
		LEFT JOIN users u ON qrm.user_id = u.id
		WHERE qrm.room_id = $1 AND qrm.left_at IS NULL
		ORDER BY qrm.joined_at ASC
	`

	rows, err := r.db.Query(query, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room members: %w", err)
	}
	defer rows.Close()

	var members []models.QuizRoomMember
	for rows.Next() {
		var member models.QuizRoomMember
		err := rows.Scan(
			&member.ID, &member.RoomID, &member.UserID, &member.DisplayName,
			&member.Role, &member.JoinedAt, &member.LeftAt, &member.KickedBy, &member.KickReason,
			&member.Picture,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan member: %w", err)
		}
		members = append(members, member)
	}

	return members, nil
}

// RemoveMember removes a member from a room
func (r *RoomRepository) RemoveMember(roomID, userID, reason string) error {
	query := `
		UPDATE quiz_room_members 
		SET left_at = $1, kick_reason = $2
		WHERE room_id = $3 AND user_id = $4 AND left_at IS NULL
	`

	_, err := r.db.Exec(query, time.Now(), reason, roomID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	return nil
}

// DeleteRoom deletes a room and all its data
func (r *RoomRepository) DeleteRoom(roomID string) error {
	// Delete in order due to foreign key constraints
	queries := []string{
		"DELETE FROM quiz_answers WHERE room_id = $1",
		"DELETE FROM quiz_room_members WHERE room_id = $1",
		"DELETE FROM quiz_rooms WHERE id = $1",
	}

	for _, query := range queries {
		_, err := r.db.Exec(query, roomID)
		if err != nil {
			return fmt.Errorf("failed to delete room data: %w", err)
		}
	}

	return nil
}

// GetQuiz retrieves a quiz by ID (matches Prisma schema)
func (r *RoomRepository) GetQuiz(quizID string) (*models.Quiz, error) {
	query := `
		SELECT id, user_id, title, description, difficulty, time_limit, 
		       total_questions, quiz_data, status, created_at, updated_at, 
		       published_at, version, image_url
		FROM quizzes
		WHERE id = $1 AND status = 'published'
	`
	r.logger.Info("Getting quiz", zap.String("quiz_id", quizID))
	quiz := &models.Quiz{}
	err := r.db.QueryRow(query, quizID).Scan(
		&quiz.ID, &quiz.UserID, &quiz.Title, &quiz.Description, &quiz.Difficulty,
		&quiz.TimeLimit, &quiz.TotalQuestions, &quiz.QuizData, &quiz.Status,
		&quiz.CreatedAt, &quiz.UpdatedAt, &quiz.PublishedAt, &quiz.Version, &quiz.ImageURL,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("quiz not found")
		}
		return nil, fmt.Errorf("failed to get quiz: %w", err)
	}

	return quiz, nil
}

// GetQuizQuestions retrieves all questions for a quiz from quiz_data JSON
func (r *RoomRepository) GetQuizQuestions(quizID string) ([]models.Question, error) {
	// First get the quiz to access quiz_data
	quiz, err := r.GetQuiz(quizID)
	if err != nil {
		return nil, fmt.Errorf("failed to get quiz: %w", err)
	}

	// Parse questions from quiz_data JSON
	var questions []models.Question
	if quiz.QuizData != nil {
		// The quiz_data should contain a "questions" array
		if questionsData, ok := quiz.QuizData["questions"].([]interface{}); ok {
			for i, q := range questionsData {
				if questionMap, ok := q.(map[string]interface{}); ok {
					question := models.Question{
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

	return questions, nil
}

// generateUniquePIN generates a unique 6-digit PIN
func (r *RoomRepository) generateUniquePIN() (string, error) {
	const maxAttempts = 10
	
	for i := 0; i < maxAttempts; i++ {
		pin := generatePIN()
		
		// Check if PIN already exists
		exists, err := r.pinExists(pin)
		if err != nil {
			return "", err
		}
		
		if !exists {
			return pin, nil
		}
	}
	
	return "", fmt.Errorf("failed to generate unique PIN after %d attempts", maxAttempts)
}

// pinExists checks if a PIN already exists in the database
func (r *RoomRepository) pinExists(pin string) (bool, error) {
	query := `SELECT COUNT(*) FROM quiz_rooms WHERE pin = $1 AND closed_at IS NULL`
	
	var count int
	err := r.db.QueryRow(query, pin).Scan(&count)
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}

// generatePIN generates a random 6-digit PIN
func generatePIN() string {
	mathrand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", mathrand.Intn(1000000))
}

// generateUUID generates a proper UUID v4
func generateUUID() string {
	// Generate a proper UUID v4
	b := make([]byte, 16)
	rand.Read(b)
	
	// Set version (4) and variant bits
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // Variant bits
	
	return fmt.Sprintf("%x-%x-%x-%x-%x", 
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
