package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"quiz-realtime-service/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// JWTService handles JWT token verification for internal tokens
type JWTService struct {
	Secret string
	logger *zap.Logger
}

// InternalJWTPayload represents the internal JWT payload structure
type InternalJWTPayload struct {
	Sub       string `json:"sub"`
	Email     string `json:"email"`
	Name      string `json:"name,omitempty"`
	Picture   string `json:"picture,omitempty"`
	Iat       int64  `json:"iat"`
	Exp       int64  `json:"exp"`
	Aud       string `json:"aud"`
	Iss       string `json:"iss"`
	jwt.RegisteredClaims
}

// NewJWTService creates a new JWT service for internal token verification
func NewJWTService(secret string, logger *zap.Logger) *JWTService {
	return &JWTService{
		Secret: secret,
		logger: logger.With(zap.String("component", "jwt")),
	}
}

// VerifyToken verifies an internal JWT token
func (j *JWTService) VerifyToken(tokenString string) (*InternalJWTPayload, error) {
	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &InternalJWTPayload{}, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// Return the secret key
		return []byte(j.Secret), nil
	})

	if err != nil {
		j.logger.Debug("Token parsing failed", zap.Error(err))
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		j.logger.Debug("Token is invalid")
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*InternalJWTPayload)
	if !ok {
		j.logger.Debug("Invalid token claims")
		return nil, fmt.Errorf("invalid token claims")
	}

	// Check expiration
	if claims.Exp < time.Now().Unix() {
		j.logger.Debug("Token has expired", 
			zap.Int64("exp", claims.Exp),
			zap.Int64("now", time.Now().Unix()))
		return nil, fmt.Errorf("token has expired")
	}

	j.logger.Debug("Token verified successfully",
		zap.String("sub", claims.Sub),
		zap.String("email", claims.Email),
		zap.Int64("exp", claims.Exp))

	return claims, nil
}

// CreateUserFromJWT creates a User model from JWT claims
func (j *JWTService) CreateUserFromJWT(claims *InternalJWTPayload) *models.User {
	return &models.User{
		ID:       claims.Sub,
		Username: claims.Sub, // Use sub as username for now
		Email:    claims.Email,
	}
}

// VerifyTokenSignature manually verifies JWT signature (fallback method)
func (j *JWTService) VerifyTokenSignature(tokenString string) (*InternalJWTPayload, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	// Decode header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}

	var header map[string]interface{}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse header: %w", err)
	}

	// Check algorithm
	if alg, ok := header["alg"].(string); !ok || alg != "HS256" {
		return nil, fmt.Errorf("unsupported algorithm: %v", header["alg"])
	}

	// Verify signature
	message := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("failed to decode signature: %w", err)
	}

	mac := hmac.New(sha256.New, []byte(j.Secret))
	mac.Write([]byte(message))
	expectedSignature := mac.Sum(nil)

	if !hmac.Equal(signature, expectedSignature) {
		return nil, fmt.Errorf("invalid signature")
	}

	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var claims InternalJWTPayload
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse payload: %w", err)
	}

	// Check expiration
	if claims.Exp > 0 && claims.Exp < time.Now().Unix() {
		return nil, fmt.Errorf("token has expired")
	}

	return &claims, nil
}
