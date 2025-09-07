package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"
)

type SimpleTokenPayload struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Iat   int64  `json:"iat"`
	Exp   int64  `json:"exp"`
}

func main() {
	// Create a test token with a proper UUID
	claims := SimpleTokenPayload{
		Sub:   "1f87b22f-c9f4-4764-92ba-c257e90a585b", // Valid UUID
		Email: "test@example.com",
		Name:  "Test User",
		Iat:   time.Now().Unix(),
		Exp:   time.Now().Unix() + 3600, // 1 hour
	}

	// Convert to JSON
	jsonData, err := json.Marshal(claims)
	if err != nil {
		fmt.Printf("Error marshaling claims: %v\n", err)
		return
	}

	// Encode to base64
	token := base64.StdEncoding.EncodeToString(jsonData)
	
	fmt.Printf("Generated token: %s\n", token)
	fmt.Printf("Decoded token: %s\n", string(jsonData))
}

