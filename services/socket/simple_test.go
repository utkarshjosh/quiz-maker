package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"nhooyr.io/websocket"
)

func main() {
	token := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHw2OGFhZWQ1MThlZTdjODM5OGY4OTA3NTkiLCJlbWFpbCI6InV0a2Fyc2hqb3NoaTdAZ21haWwuY29tIiwibmFtZSI6InV0a2Fyc2hqb3NoaTdAZ21haWwuY29tIiwicGljdHVyZSI6Imh0dHBzOi8vcy5ncmF2YXRhci5jb20vYXZhdGFyLzI3MzY1YmM4NGZjNGIxNDg0MjI5MTNiMjAxMjI4YWNlP3M9NDgwJnI9cGcmZD1odHRwcyUzQSUyRiUyRmNkbi5hdXRoMC5jb20lMkZhdmF0YXJzJTJGdXQucG5nIiwiaWF0IjoxNzU3MjQwNzM2LCJleHAiOjE3NTczMjcxMzYsImF1ZCI6Imh0dHBzOi8vZGV2LTNmemliaTNqNzI0bTNjNHIudXMuYXV0aDAuY29tL2FwaS92Mi8iLCJpc3MiOiJodHRwczovL2Rldi0zZnppYmkzajcyNG0zYzRyLnVzLmF1dGgwLmNvbS8ifQ.qGokZZJt5NpGXXx2C47602AYhWOSIHpNy_zEvxuhahY"
	
	url := fmt.Sprintf("ws://localhost:5000/ws?token=%s", token)
	
	fmt.Printf("Connecting to %s...\n", url)
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	conn, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		Subprotocols: []string{"quiz-protocol"},
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "test completed")
	
	fmt.Println("✅ Connected successfully!")
	
	// Send a ping message
	pingMsg := `{"v":1,"type":"ping","msg_id":"test-123","data":{"timestamp":` + fmt.Sprintf("%d", time.Now().UnixMilli()) + `}}`
	
	fmt.Printf("📤 Sending: %s\n", pingMsg)
	
	ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel2()
	
	err = conn.Write(ctx2, websocket.MessageText, []byte(pingMsg))
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}
	
	fmt.Println("✅ Message sent successfully")
	
	// Read response
	ctx3, cancel3 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel3()
	
	_, data, err := conn.Read(ctx3)
	if err != nil {
		log.Fatalf("Failed to read response: %v", err)
	}
	
	fmt.Printf("📨 Received: %s\n", string(data))
	
	// Try to read another message
	ctx4, cancel4 := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel4()
	
	_, data2, err := conn.Read(ctx4)
	if err != nil {
		fmt.Printf("❌ Second read failed: %v\n", err)
		fmt.Printf("   Close status: %v\n", websocket.CloseStatus(err))
	} else {
		fmt.Printf("📨 Second message: %s\n", string(data2))
	}
	
	fmt.Println("✅ Test completed")
}
