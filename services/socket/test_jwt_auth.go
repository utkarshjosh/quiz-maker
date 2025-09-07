package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"quiz-realtime-service/internal/auth"
	"quiz-realtime-service/internal/config"
	"quiz-realtime-service/internal/telemetry"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger, err := telemetry.NewLogger(cfg.Environment)
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}

	// Create JWT service
	jwtService := auth.NewJWTService(cfg.Auth0.JWTSecret, logger)

	// Create Auth0 service
	authService := auth.NewAuth0Service(
		cfg.Auth0.Domain,
		cfg.Auth0.ClientID,
		cfg.Auth0.ClientSecret,
		cfg.Auth0.Audience,
		cfg.Auth0.JWTSecret,
		logger,
	)

	// Test 1: Generate a JWT token (simulating what the API would create)
	fmt.Println("=== Test 1: Generate JWT Token ===")
	
	// Create a test JWT payload similar to what the API creates
	now := time.Now().Unix()
	payload := map[string]interface{}{
		"sub":   "auth0|test-user-123",
		"email": "test@example.com",
		"name":  "Test User",
		"iat":   now,
		"exp":   now + 3600, // 1 hour
		"aud":   cfg.Auth0.Audience,
		"iss":   fmt.Sprintf("https://%s/", cfg.Auth0.Domain),
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims(payload))
	tokenString, err := token.SignedString([]byte(cfg.Auth0.JWTSecret))
	if err != nil {
		log.Fatalf("Failed to create JWT token: %v", err)
	}

	fmt.Printf("Generated JWT token: %s\n", tokenString)
	fmt.Printf("Token length: %d\n", len(tokenString))

	// Test 2: Verify the JWT token
	fmt.Println("\n=== Test 2: Verify JWT Token ===")
	
	claims, err := jwtService.VerifyToken(tokenString)
	if err != nil {
		log.Fatalf("Failed to verify JWT token: %v", err)
	}

	fmt.Printf("Token verified successfully!\n")
	fmt.Printf("Sub: %s\n", claims.Sub)
	fmt.Printf("Email: %s\n", claims.Email)
	fmt.Printf("Name: %s\n", claims.Name)
	fmt.Printf("Exp: %d\n", claims.Exp)

	// Test 3: Test WebSocket authentication
	fmt.Println("\n=== Test 3: WebSocket Authentication ===")
	
	// Create a mock HTTP request with the token
	req := &http.Request{
		URL: &url.URL{
			RawQuery: fmt.Sprintf("token=%s", tokenString),
		},
	}

	user, err := authService.AuthenticateWebSocket(req)
	if err != nil {
		log.Fatalf("WebSocket authentication failed: %v", err)
	}

	fmt.Printf("WebSocket authentication successful!\n")
	fmt.Printf("User ID: %s\n", user.ID)
	fmt.Printf("Username: %s\n", user.Username)
	fmt.Printf("Email: %s\n", user.Email)

	// Test 4: Test with expired token
	fmt.Println("\n=== Test 4: Expired Token Test ===")
	
	expiredPayload := map[string]interface{}{
		"sub":   "auth0|test-user-456",
		"email": "expired@example.com",
		"name":  "Expired User",
		"iat":   now - 7200, // 2 hours ago
		"exp":   now - 3600, // 1 hour ago (expired)
		"aud":   cfg.Auth0.Audience,
		"iss":   fmt.Sprintf("https://%s/", cfg.Auth0.Domain),
	}

	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims(expiredPayload))
	expiredTokenString, err := expiredToken.SignedString([]byte(cfg.Auth0.JWTSecret))
	if err != nil {
		log.Fatalf("Failed to create expired JWT token: %v", err)
	}

	expiredReq := &http.Request{
		URL: &url.URL{
			RawQuery: fmt.Sprintf("token=%s", expiredTokenString),
		},
	}

	_, err = authService.AuthenticateWebSocket(expiredReq)
	if err != nil {
		fmt.Printf("Expired token correctly rejected: %v\n", err)
	} else {
		fmt.Printf("ERROR: Expired token was accepted!\n")
	}

	// Test 5: Test with invalid token
	fmt.Println("\n=== Test 5: Invalid Token Test ===")
	
	invalidReq := &http.Request{
		URL: &url.URL{
			RawQuery: "token=invalid-token",
		},
	}

	_, err = authService.AuthenticateWebSocket(invalidReq)
	if err != nil {
		fmt.Printf("Invalid token correctly rejected: %v\n", err)
	} else {
		fmt.Printf("ERROR: Invalid token was accepted!\n")
	}

	fmt.Println("\n=== All Tests Completed ===")
}
