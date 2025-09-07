package auth

import (
	"net/http"
	"quiz-realtime-service/internal/models"
)

// AuthServiceInterface defines the interface for authentication services
type AuthServiceInterface interface {
	AuthenticateWebSocket(r *http.Request) (*models.User, error)
	AuthMiddleware(next http.Handler) http.Handler
}

// Ensure Auth0Service implements AuthServiceInterface
var _ AuthServiceInterface = (*Auth0Service)(nil)
