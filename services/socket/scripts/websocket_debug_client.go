package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nhooyr.io/websocket"
)

type Message struct {
	Version int                    `json:"v"`
	Type    string                 `json:"type"`
	MsgID   string                 `json:"msg_id"`
	Data    map[string]interface{} `json:"data"`
}

type ErrorMessage struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type JoinMessage struct {
	PIN         string `json:"pin"`
	DisplayName string `json:"display_name"`
}

type CreateRoomMessage struct {
	QuizID   string                 `json:"quiz_id"`
	Settings map[string]interface{} `json:"settings"`
}

type StateMessage struct {
	Phase          string `json:"phase"`
	RoomID         string `json:"room_id"`
	PIN            string `json:"pin"`
	HostID         string `json:"host_id"`
	QuestionIndex  int    `json:"question_index"`
	TotalQuestions int    `json:"total_questions"`
	Members        []struct {
		ID          string `json:"id"`
		DisplayName string `json:"display_name"`
		Role        string `json:"role"`
		Score       int    `json:"score"`
		IsOnline    bool   `json:"is_online"`
		JoinedAt    int64  `json:"joined_at"`
	} `json:"members"`
	Settings struct {
		QuestionDuration int  `json:"question_duration"`
		ShowCorrectness  bool `json:"show_correctness"`
		ShowLeaderboard  bool `json:"show_leaderboard"`
		AllowReconnect   bool `json:"allow_reconnect"`
	} `json:"settings"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run websocket_debug_client.go <server_url>")
		fmt.Println("Example: go run websocket_debug_client.go ws://localhost:5000/ws")
		os.Exit(1)
	}

	serverURL := os.Args[1]
	
	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Connect to WebSocket
	fmt.Printf("Connecting to %s...\n", serverURL)
	
	conn, _, err := websocket.Dial(ctx, serverURL, &websocket.DialOptions{
		Subprotocols: []string{"quiz-protocol"},
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "debug client completed")

	fmt.Println("✅ Connected successfully!")

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start message reader goroutine
	go readMessages(conn)

	// Interactive menu
	for {
		select {
		case <-sigChan:
			fmt.Println("\n👋 Shutting down...")
			return
		default:
			showMenu()
			handleUserInput(conn)
		}
	}
}

func readMessages(conn *websocket.Conn) {
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		_, data, err := conn.Read(ctx)
		cancel()
		
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure {
				fmt.Println("🔌 Connection closed normally")
			} else {
				fmt.Printf("❌ Read error: %v\n", err)
			}
			return
		}

		fmt.Printf("\n📨 Received: %s\n", string(data))
		
		// Try to parse and display formatted message
		var msg Message
		if err := json.Unmarshal(data, &msg); err == nil {
			displayFormattedMessage(msg)
		}
	}
}

func displayFormattedMessage(msg Message) {
	fmt.Printf("   📋 Type: %s\n", msg.Type)
	fmt.Printf("   🆔 Message ID: %s\n", msg.MsgID)
	fmt.Printf("   🔢 Version: %d\n", msg.Version)
	
	if msg.Data != nil {
		fmt.Printf("   📊 Data: %+v\n", msg.Data)
	}
	
	// Special handling for different message types
	switch msg.Type {
	case "error":
		if errorData, ok := msg.Data["code"].(string); ok {
			fmt.Printf("   ❌ Error Code: %s\n", errorData)
		}
		if errorMsg, ok := msg.Data["message"].(string); ok {
			fmt.Printf("   💬 Error Message: %s\n", errorMsg)
		}
	case "state":
		fmt.Printf("   🏠 State Message - Check data for room details\n")
	case "pong":
		if timestamp, ok := msg.Data["timestamp"].(float64); ok {
			fmt.Printf("   ⏰ Pong timestamp: %d\n", int64(timestamp))
		}
	}
	
	fmt.Println()
}

func showMenu() {
	fmt.Println("\n🔧 WebSocket Debug Client")
	fmt.Println("1. Send Ping")
	fmt.Println("2. Send Join Room")
	fmt.Println("3. Send Create Room")
	fmt.Println("4. Send Custom Message")
	fmt.Println("5. Show Connection Info")
	fmt.Println("6. Exit")
	fmt.Print("Choose an option (1-6): ")
}

func handleUserInput(conn *websocket.Conn) {
	var choice int
	fmt.Scanf("%d", &choice)
	
	switch choice {
	case 1:
		sendPing(conn)
	case 2:
		sendJoinRoom(conn)
	case 3:
		sendCreateRoom(conn)
	case 4:
		sendCustomMessage(conn)
	case 5:
		showConnectionInfo(conn)
	case 6:
		fmt.Println("👋 Goodbye!")
		os.Exit(0)
	default:
		fmt.Println("❌ Invalid choice")
	}
}

func sendPing(conn *websocket.Conn) {
	msg := Message{
		Version: 1,
		Type:    "ping",
		MsgID:   generateMsgID(),
		Data: map[string]interface{}{
			"timestamp": time.Now().UnixMilli(),
		},
	}
	
	sendMessage(conn, msg)
}

func sendJoinRoom(conn *websocket.Conn) {
	var pin, displayName string
	fmt.Print("Enter room PIN: ")
	fmt.Scanf("%s", &pin)
	fmt.Print("Enter display name: ")
	fmt.Scanf("%s", &displayName)
	
	msg := Message{
		Version: 1,
		Type:    "join",
		MsgID:   generateMsgID(),
		Data: map[string]interface{}{
			"pin":          pin,
			"display_name": displayName,
		},
	}
	
	sendMessage(conn, msg)
}

func sendCreateRoom(conn *websocket.Conn) {
	var quizID string
	fmt.Print("Enter quiz ID: ")
	fmt.Scanf("%s", &quizID)
	
	msg := Message{
		Version: 1,
		Type:    "create_room",
		MsgID:   generateMsgID(),
		Data: map[string]interface{}{
			"quiz_id": quizID,
			"settings": map[string]interface{}{
				"question_duration_ms": 30000,
				"show_correctness":     true,
				"show_leaderboard":     true,
				"allow_reconnect":      true,
				"max_players":          50,
			},
		},
	}
	
	sendMessage(conn, msg)
}

func sendCustomMessage(conn *websocket.Conn) {
	var msgType, msgData string
	fmt.Print("Enter message type: ")
	fmt.Scanf("%s", &msgType)
	fmt.Print("Enter JSON data (or press Enter for empty): ")
	fmt.Scanf("%s", &msgData)
	
	var data map[string]interface{}
	if msgData != "" {
		if err := json.Unmarshal([]byte(msgData), &data); err != nil {
			fmt.Printf("❌ Invalid JSON: %v\n", err)
			return
		}
	}
	
	msg := Message{
		Version: 1,
		Type:    msgType,
		MsgID:   generateMsgID(),
		Data:    data,
	}
	
	sendMessage(conn, msg)
}

func showConnectionInfo(conn *websocket.Conn) {
	fmt.Printf("🔌 Connection Info:\n")
	fmt.Printf("   Subprotocol: %s\n", conn.Subprotocol())
	fmt.Printf("   Connection Status: Active\n")
}

func sendMessage(conn *websocket.Conn, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		fmt.Printf("❌ Failed to marshal message: %v\n", err)
		return
	}
	
	fmt.Printf("📤 Sending: %s\n", string(data))
	
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	err = conn.Write(ctx, websocket.MessageText, data)
	if err != nil {
		fmt.Printf("❌ Failed to send message: %v\n", err)
		return
	}
	
	fmt.Println("✅ Message sent successfully")
}

func generateMsgID() string {
	return fmt.Sprintf("debug-%d", time.Now().UnixNano())
}
