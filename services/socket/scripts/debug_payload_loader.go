package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"time"

	"nhooyr.io/websocket"
)

type DebugPayloads struct {
	DebugPayloads struct {
		Description string `json:"description"`
		QuizID      string `json:"quiz_id"`
		UserID      string `json:"user_id"`
		Payloads    map[string]interface{} `json:"payloads"`
	} `json:"debug_payloads"`
}

type Message struct {
	Version int                    `json:"v"`
	Type    string                 `json:"type"`
	MsgID   string                 `json:"msg_id"`
	Data    map[string]interface{} `json:"data"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run debug_payload_loader.go <server_url> [payload_name]")
		fmt.Println("Example: go run debug_payload_loader.go ws://localhost:5000/ws ping")
		fmt.Println("Available payloads: ping, create_room, join_room, start_quiz, answer_question, etc.")
		os.Exit(1)
	}

	serverURL := os.Args[1]
	payloadName := ""
	if len(os.Args) > 2 {
		payloadName = os.Args[2]
	}

	// Load debug payloads
	payloads, err := loadDebugPayloads()
	if err != nil {
		log.Fatalf("Failed to load debug payloads: %v", err)
	}

	// Connect to WebSocket
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("Connecting to %s...\n", serverURL)
	conn, _, err := websocket.Dial(ctx, serverURL, &websocket.DialOptions{
		Subprotocols: []string{"quiz-protocol"},
	})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "debug payload loader completed")

	fmt.Println("✅ Connected successfully!")

	// If specific payload requested, send it
	if payloadName != "" {
		sendSpecificPayload(conn, payloads, payloadName)
		return
	}

	// Interactive mode
	showInteractiveMenu(conn, payloads)
}

func loadDebugPayloads() (*DebugPayloads, error) {
	data, err := ioutil.ReadFile("debug_payloads.json")
	if err != nil {
		return nil, err
	}

	var payloads DebugPayloads
	err = json.Unmarshal(data, &payloads)
	if err != nil {
		return nil, err
	}

	return &payloads, nil
}

func sendSpecificPayload(conn *websocket.Conn, payloads *DebugPayloads, payloadName string) {
	payload, exists := payloads.DebugPayloads.Payloads[payloadName]
	if !exists {
		fmt.Printf("❌ Payload '%s' not found\n", payloadName)
		fmt.Println("Available payloads:")
		for name := range payloads.DebugPayloads.Payloads {
			fmt.Printf("  - %s\n", name)
		}
		return
	}

	fmt.Printf("📤 Sending payload: %s\n", payloadName)
	
	// Handle different payload types
	switch p := payload.(type) {
	case map[string]interface{}:
		sendPayload(conn, p)
	case []interface{}:
		// Handle concurrent messages
		for i, msg := range p {
			if msgMap, ok := msg.(map[string]interface{}); ok {
				fmt.Printf("📤 Sending concurrent message %d\n", i+1)
				sendPayload(conn, msgMap)
				time.Sleep(100 * time.Millisecond) // Small delay between messages
			}
		}
	case string:
		// Handle malformed JSON
		fmt.Printf("📤 Sending malformed JSON: %s\n", p)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		conn.Write(ctx, websocket.MessageText, []byte(p))
	default:
		fmt.Printf("❌ Unknown payload type: %T\n", p)
	}

	// Wait for response
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, data, err := conn.Read(ctx)
	if err != nil {
		fmt.Printf("❌ Failed to read response: %v\n", err)
		return
	}

	fmt.Printf("📨 Received response: %s\n", string(data))
}

func sendPayload(conn *websocket.Conn, payload map[string]interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("❌ Failed to marshal payload: %v\n", err)
		return
	}

	fmt.Printf("📤 Sending: %s\n", string(data))

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = conn.Write(ctx, websocket.MessageText, data)
	if err != nil {
		fmt.Printf("❌ Failed to send payload: %v\n", err)
		return
	}

	fmt.Println("✅ Payload sent successfully")
}

func showInteractiveMenu(conn *websocket.Conn, payloads *DebugPayloads) {
	fmt.Println("\n🔧 Debug Payload Loader - Interactive Mode")
	fmt.Println("==========================================")

	// Start message reader goroutine
	go readMessages(conn)

	for {
		fmt.Println("\nAvailable payloads:")
		count := 0
		for name := range payloads.DebugPayloads.Payloads {
			fmt.Printf("  %d. %s\n", count+1, name)
			count++
		}
		fmt.Printf("  %d. Exit\n", count+1)
		fmt.Print("Choose a payload (1-", count+1, "): ")

		var choice int
		fmt.Scanf("%d", &choice)

		if choice == count+1 {
			fmt.Println("👋 Goodbye!")
			return
		}

		if choice < 1 || choice > count {
			fmt.Println("❌ Invalid choice")
			continue
		}

		// Get payload name by index
		payloadNames := make([]string, 0, len(payloads.DebugPayloads.Payloads))
		for name := range payloads.DebugPayloads.Payloads {
			payloadNames = append(payloadNames, name)
		}

		if choice-1 < len(payloadNames) {
			payloadName := payloadNames[choice-1]
			sendSpecificPayload(conn, payloads, payloadName)
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
