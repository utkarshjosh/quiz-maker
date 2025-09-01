package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type JWTPayload struct {
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
	Type      string `json:"type"`
	jwt.RegisteredClaims
}

type AuthService struct {
	jwtSecret        string
	refreshSecret    string
	logger           *zap.Logger
}

func NewAuthService(jwtSecret, refreshSecret string, logger *zap.Logger) *AuthService {
	return &AuthService{
		jwtSecret:     jwtSecret,
		refreshSecret: refreshSecret,
		logger:        logger,
	}
}

// ExtractTokenFromHeader extracts JWT token from Authorization header
func (a *AuthService) ExtractTokenFromHeader(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid authorization header format")
	}

	return parts[1], nil
}

// ExtractTokenFromQuery extracts JWT token from query parameter
func (a *AuthService) ExtractTokenFromQuery(r *http.Request) (string, error) {
	token := r.URL.Query().Get("token")
	if token == "" {
		return "", fmt.Errorf("no token in query parameters")
	}
	return token, nil
}

// VerifyToken verifies and parses JWT token
func (a *AuthService) VerifyToken(tokenString string) (*JWTPayload, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTPayload{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(a.jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*JWTPayload)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Check if token type is access token
	if claims.Type != "access" {
		return nil, fmt.Errorf("invalid token type: %s", claims.Type)
	}

	// Check expiration
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, fmt.Errorf("token expired")
	}

	return claims, nil
}

// AuthenticateWebSocket authenticates WebSocket connection
func (a *AuthService) AuthenticateWebSocket(r *http.Request) (*User, error) {
	// Try to get token from Authorization header first
	var tokenString string
	var err error

	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		tokenString, err = a.ExtractTokenFromHeader(authHeader)
		if err != nil {
			a.logger.Debug("Failed to extract token from header", zap.Error(err))
		}
	}

	// If no token in header, try query parameter
	if tokenString == "" {
		tokenString, err = a.ExtractTokenFromQuery(r)
		if err != nil {
			return nil, fmt.Errorf("no valid token found: %w", err)
		}
	}

	// Verify token
	claims, err := a.VerifyToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("token verification failed: %w", err)
	}

	// For now, we'll create a user object from the claims
	// In a full implementation, you might want to fetch user details from database
	user := &User{
		ID:       claims.UserID,
		Username: "", // Would be fetched from DB in real implementation
		Email:    "", // Would be fetched from DB in real implementation
	}

	return user, nil
}

// AuthMiddleware is HTTP middleware for REST endpoints
func (a *AuthService) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := a.AuthenticateWebSocket(r)
		if err != nil {
			a.logger.Warn("Authentication failed", zap.Error(err))
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Add user to context
		ctx := context.WithValue(r.Context(), "user", user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserFromContext extracts user from request context
func GetUserFromContext(ctx context.Context) (*User, bool) {
	user, ok := ctx.Value("user").(*User)
	return user, ok
}
