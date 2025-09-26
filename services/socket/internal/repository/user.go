package repository

import (
	"database/sql"
	"fmt"

	"quiz-realtime-service/internal/models"

	"go.uber.org/zap"
)

type UserRepository struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewUserRepository(db *sql.DB, logger *zap.Logger) *UserRepository {
	return &UserRepository{
		db:     db,
		logger: logger,
	}
}

// GetUserByAuth0ID retrieves a user by their Auth0 ID
func (r *UserRepository) GetUserByAuth0ID(auth0ID string) (*models.User, error) {
	query := `
		SELECT id, name, email
		FROM users
		WHERE auth0_id = $1
	`

	user := &models.User{}
	var name sql.NullString
	err := r.db.QueryRow(query, auth0ID).Scan(
		&user.ID, &name, &user.Email,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found for Auth0 ID: %s", auth0ID)
		}
		return nil, fmt.Errorf("failed to get user by Auth0 ID: %w", err)
	}

	// Set username from name field
	if name.Valid {
		user.Username = name.String
	} else {
		user.Username = user.Email // Fallback to email if name is null
	}

	r.logger.Debug("User found by Auth0 ID", 
		zap.String("auth0_id", auth0ID),
		zap.String("internal_id", user.ID),
		zap.String("username", user.Username))

	return user, nil
}

// GetUserByID retrieves a user by their internal UUID
func (r *UserRepository) GetUserByID(userID string) (*models.User, error) {
	query := `
		SELECT id, name, email
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	var name sql.NullString
	err := r.db.QueryRow(query, userID).Scan(
		&user.ID, &name, &user.Email,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found for ID: %s", userID)
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	// Set username from name field
	if name.Valid {
		user.Username = name.String
	} else {
		user.Username = user.Email // Fallback to email if name is null
	}

	return user, nil
}
