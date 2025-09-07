package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"quiz-realtime-service/internal/config"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	// Load configuration to get JWT secret
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Create a test JWT payload matching the API format
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

	fmt.Printf("Generated JWT Token:\n")
	fmt.Printf("%s\n\n", tokenString)
	
	// Also create a base64 encoded version for backward compatibility
	payloadBytes, _ := json.Marshal(payload)
	base64Token := string(payloadBytes)
	
	fmt.Printf("Base64 Token (for backward compatibility):\n")
	fmt.Printf("%s\n\n", base64Token)
	
	// Write to file for easy copying
	file, err := os.Create("test_jwt_token.txt")
	if err != nil {
		log.Printf("Failed to create file: %v", err)
		return
	}
	defer file.Close()
	
	file.WriteString("JWT Token:\n")
	file.WriteString(tokenString)
	file.WriteString("\n\nBase64 Token:\n")
	file.WriteString(base64Token)
	file.WriteString("\n")
	
	fmt.Printf("Token saved to test_jwt_token.txt\n")
}
