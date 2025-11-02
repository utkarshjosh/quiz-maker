package repository

import (
	"crypto/rand"
	"database/sql"
	"fmt"
	mathrand "math/rand"
	"strconv"
	"strings"
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
func (r *RoomRepository) CreateRoom(hostID, quizID, hostDisplayName string, settings models.RoomSettings) (*models.QuizRoom, error) {
	// Generate unique PIN
	pin, err := r.generateUniquePIN()
	if err != nil {
		return nil, fmt.Errorf("failed to generate PIN: %w", err)
	}

	// Create room
	room := &models.QuizRoom{
		ID:        generateUUID(),
		PIN:       pin,
		HostID:    hostID,
		QuizID:    quizID,
		Status:    "lobby",
		Settings:  settings.ToJSONB(),
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

	// Add host as a member with their actual display name
	err = r.AddMember(room.ID, hostID, hostDisplayName, "host")
	if err != nil {
		// If adding host fails, clean up the room
		r.DeleteRoom(room.ID)
		return nil, fmt.Errorf("failed to add host as member: %w", err)
	}

	r.logger.Info("Room created successfully",
		zap.String("room_id", room.ID),
		zap.String("pin", room.PIN),
		zap.String("host_id", hostID),
		zap.String("host_display_name", hostDisplayName))

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
	// CRITICAL: Check if member already exists (cleanup from previous leave)
	checkQuery := `SELECT id FROM quiz_room_members WHERE room_id = $1 AND user_id = $2`
	var existingID string
	err := r.db.QueryRow(checkQuery, roomID, userID).Scan(&existingID)

	if err == nil {
		// Member exists from previous session - DELETE it first
		r.logger.Info("Removing stale member record before re-adding",
			zap.String("room_id", roomID),
			zap.String("user_id", userID),
			zap.String("existing_id", existingID))

		deleteQuery := `DELETE FROM quiz_room_members WHERE room_id = $1 AND user_id = $2`
		_, delErr := r.db.Exec(deleteQuery, roomID, userID)
		if delErr != nil {
			return fmt.Errorf("failed to remove stale member: %w", delErr)
		}
	} else if err != sql.ErrNoRows {
		// Real error (not just "no rows found")
		r.logger.Error("Error checking existing member", zap.Error(err))
		return fmt.Errorf("failed to check existing member: %w", err)
	}
	// If err == sql.ErrNoRows, member doesn't exist - continue with insert

	// Get the user's picture data
	var picture *string
	userQuery := `SELECT picture FROM users WHERE id = $1`
	err = r.db.QueryRow(userQuery, userID).Scan(&picture)
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

	r.logger.Info("Member added to room successfully",
		zap.String("room_id", roomID),
		zap.String("user_id", userID),
		zap.String("display_name", displayName),
		zap.String("role", role))

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
	// Option 1: Mark as left (keeps history)
	// This is commented out because it causes duplicate key errors on rejoin
	/*
		query := `
			UPDATE quiz_room_members
			SET left_at = $1, kick_reason = $2
			WHERE room_id = $3 AND user_id = $4 AND left_at IS NULL
		`
		_, err := r.db.Exec(query, time.Now(), reason, roomID, userID)
	*/

	// Option 2: Actually DELETE the member (allows rejoining)
	query := `
		DELETE FROM quiz_room_members 
		WHERE room_id = $1 AND user_id = $2
	`

	result, err := r.db.Exec(query, roomID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	r.logger.Info("Member removed from room",
		zap.String("room_id", roomID),
		zap.String("user_id", userID),
		zap.String("reason", reason),
		zap.Int64("rows_affected", rowsAffected))

	return nil
}

// TransferHost transfers host role to the next member (FIFO)
func (r *RoomRepository) TransferHost(roomID, oldHostID string) (newHostID string, err error) {
	// Get all remaining members ordered by join time (FIFO)
	members, err := r.GetRoomMembers(roomID)
	if err != nil {
		return "", fmt.Errorf("failed to get room members: %w", err)
	}

	// Find first non-host member (earliest joined)
	var newHost *models.QuizRoomMember
	for i := range members {
		if members[i].UserID != oldHostID {
			newHost = &members[i]
			break
		}
	}

	// No other members - room should close
	if newHost == nil {
		r.logger.Info("No remaining members to transfer host to, room will close",
			zap.String("room_id", roomID),
			zap.String("old_host_id", oldHostID))
		return "", fmt.Errorf("no members available for host transfer")
	}

	r.logger.Info("Transferring host role",
		zap.String("room_id", roomID),
		zap.String("old_host_id", oldHostID),
		zap.String("new_host_id", newHost.UserID),
		zap.String("new_host_name", newHost.DisplayName))

	// Update member's role to host
	updateMemberQuery := `
		UPDATE quiz_room_members 
		SET role = 'host' 
		WHERE room_id = $1 AND user_id = $2
	`
	_, err = r.db.Exec(updateMemberQuery, roomID, newHost.UserID)
	if err != nil {
		return "", fmt.Errorf("failed to update member role: %w", err)
	}

	// Update room's host_user_id
	updateRoomQuery := `
		UPDATE quiz_rooms 
		SET host_user_id = $1 
		WHERE id = $2
	`
	_, err = r.db.Exec(updateRoomQuery, newHost.UserID, roomID)
	if err != nil {
		return "", fmt.Errorf("failed to update room host: %w", err)
	}

	r.logger.Info("Host transferred successfully",
		zap.String("room_id", roomID),
		zap.String("new_host_id", newHost.UserID))

	return newHost.UserID, nil
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
					optionIDToIndex := make(map[string]int)
					if options, ok := questionMap["options"].([]interface{}); ok {
						for idx, opt := range options {
							if optMap, ok := opt.(map[string]interface{}); ok {
								text, _ := optMap["text"].(string)
								if text == "" {
									if label, ok := optMap["label"].(string); ok {
										text = label
									}
								}

								if text == "" {
									continue
								}

								question.Options = append(question.Options, text)
								currentIndex := len(question.Options) - 1

								if id, ok := optMap["id"].(string); ok && id != "" {
									optionIDToIndex[id] = currentIndex
								}
								optionIDToIndex[strconv.Itoa(idx)] = currentIndex
								optionIDToIndex[strconv.Itoa(currentIndex)] = currentIndex
								optionIDToIndex[strconv.Itoa(idx+1)] = currentIndex
								if value, ok := optMap["value"].(string); ok && value != "" {
									optionIDToIndex[value] = currentIndex
								}
							}
						}
					}

					question.CorrectIndex = -1

					// Parse possible correct index values provided directly
					if idxVal, ok := questionMap["correctIndex"].(float64); ok {
						question.CorrectIndex = int(idxVal)
					}
					if idxVal, ok := questionMap["correct_index"].(float64); ok && question.CorrectIndex == -1 {
						question.CorrectIndex = int(idxVal)
					}

					// Parse correctAnswer (string/number) and convert to option text when possible
					if correctAnswerRaw, exists := questionMap["correctAnswer"]; exists {
						switch value := correctAnswerRaw.(type) {
						case string:
							question.CorrectAnswer = strings.TrimSpace(value)
						case float64:
							question.CorrectAnswer = strconv.Itoa(int(value))
						case int:
							question.CorrectAnswer = strconv.Itoa(value)
						case int32:
							question.CorrectAnswer = strconv.Itoa(int(value))
						case int64:
							question.CorrectAnswer = strconv.Itoa(int(value))
						default:
							question.CorrectAnswer = fmt.Sprintf("%v", value)
						}
					}

					// Resolve correct index from the raw answer if we haven't already
					if question.CorrectIndex < 0 && question.CorrectAnswer != "" {
						if idx, err := strconv.Atoi(question.CorrectAnswer); err == nil {
							question.CorrectIndex = idx
						} else if mappedIdx, ok := optionIDToIndex[question.CorrectAnswer]; ok {
							question.CorrectIndex = mappedIdx
						}
					}

					// Normalise 1-based indices if detected
					if question.CorrectIndex >= len(question.Options) && len(question.Options) > 0 {
						if question.CorrectIndex-1 >= 0 && question.CorrectIndex-1 < len(question.Options) {
							question.CorrectIndex--
						} else {
							question.CorrectIndex = -1
						}
					}

					// Normalise string answer to actual option text when index is known
					if question.CorrectIndex >= 0 && question.CorrectIndex < len(question.Options) {
						question.CorrectAnswer = question.Options[question.CorrectIndex]
					} else if question.CorrectAnswer != "" {
						for idx, option := range question.Options {
							if strings.EqualFold(strings.TrimSpace(option), question.CorrectAnswer) {
								question.CorrectIndex = idx
								question.CorrectAnswer = option
								break
							}
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
