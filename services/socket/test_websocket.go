package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"nhooyr.io/websocket"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to WebSocket
	url := "ws://localhost:8080/ws"
	log.Printf("Connecting to %s", url)

	conn, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		Subprotocols: []string{"quiz-protocol"},
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "test completed")

	log.Println("Connected successfully!")

	// Send a ping message
	pingMsg := `{"v":1,"type":"ping","msg_id":"test-123","data":{"timestamp":1234567890}}`
	log.Printf("Sending ping: %s", pingMsg)

	err = conn.Write(ctx, websocket.MessageText, []byte(pingMsg))
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}

	// Wait for response
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, data, err := conn.Read(ctx)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}

	log.Printf("Received response: %s", string(data))

	// Send a join message
	joinMsg := `{"v":1,"type":"join","msg_id":"test-456","data":{"pin":"123456","display_name":"TestUser"}}`
	log.Printf("Sending join: %s", joinMsg)

	err = conn.Write(ctx, websocket.MessageText, []byte(joinMsg))
	if err != nil {
		log.Fatalf("Failed to send join message: %v", err)
	}

	// Wait for response
	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, data, err = conn.Read(ctx)
	if err != nil {
		log.Fatalf("Failed to read join response: %v", err)
	}

	log.Printf("Received join response: %s", string(data))

	log.Println("Test completed successfully!")
}
