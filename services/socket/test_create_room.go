package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"nhooyr.io/websocket"
)

type Message struct {
	Version int                    `json:"v"`
	Type    string                 `json:"type"`
	MsgID   string                 `json:"msg_id"`
	Data    map[string]interface{} `json:"data"`
}

func main() {
	// Connect to WebSocket with token
	token := "eyJzdWIiOiIxZjg3YjIyZi1jOWY0LTQ3NjQtOTJiYS1jMjU3ZTkwYTU4NWIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzU3MjI4NjU2LCJleHAiOjE3NTcyMzIyNTZ9"
	url := fmt.Sprintf("ws://localhost:5000/ws?token=%s", token)
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fmt.Printf("Connecting to %s...\n", url)
	conn, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		Subprotocols: []string{"quiz-protocol"},
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "test completed")

	fmt.Println("✅ Connected successfully!")

	// Send create room message
	createRoomMsg := Message{
		Version: 1,
		Type:    "create_room",
		MsgID:   "test-create-room-001",
		Data: map[string]interface{}{
			"quiz_id": "0043a49e-683c-453b-b4ef-5f288f74feeb",
			"settings": map[string]interface{}{
				"question_duration_ms": 30000,
				"show_correctness":     true,
				"show_leaderboard":     true,
				"allow_reconnect":      true,
				"max_players":          50,
			},
		},
	}

	// Marshal and send message
	data, err := json.Marshal(createRoomMsg)
	if err != nil {
		log.Fatalf("Failed to marshal message: %v", err)
	}

	fmt.Printf("📤 Sending create room message: %s\n", string(data))
	
	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	err = conn.Write(ctx, websocket.MessageText, data)
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}

	fmt.Println("✅ Message sent successfully!")

	// Wait for response
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, responseData, err := conn.Read(ctx)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	fmt.Printf("📨 Received response: %s\n", string(responseData))

	// Try to parse response
	var response Message
	if err := json.Unmarshal(responseData, &response); err == nil {
		fmt.Printf("   📋 Type: %s\n", response.Type)
		fmt.Printf("   🆔 Message ID: %s\n", response.MsgID)
		fmt.Printf("   🔢 Version: %d\n", response.Version)
		if response.Data != nil {
			fmt.Printf("   📊 Data: %+v\n", response.Data)
		}
	}

	fmt.Println("✅ Test completed successfully!")
}

