package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"quiz-realtime-service/internal/models"
	"quiz-realtime-service/internal/redis"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		return true
	},
}

// Client represents a WebSocket client
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	roomID   string
	playerID string
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Redis client for pub/sub
	redisClient *redis.RedisClient

	// Room-specific client mapping
	rooms map[string]map[*Client]bool
}

// NewHub creates a new WebSocket hub
func NewHub(redisClient *redis.RedisClient) *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		redisClient: redisClient,
		rooms:       make(map[string]map[*Client]bool),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			
			// Add client to room
			if h.rooms[client.roomID] == nil {
				h.rooms[client.roomID] = make(map[*Client]bool)
			}
			h.rooms[client.roomID][client] = true
			
			log.Printf("Client %s joined room %s", client.playerID, client.roomID)
			
			// Notify other clients in the room
			message := &models.WebSocketMessage{
				Type:      models.MessageTypePlayerJoined,
				Data:      map[string]string{"player_id": client.playerID},
				Timestamp: time.Now(),
			}
			h.BroadcastToRoom(client.roomID, message)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				
				// Remove client from room
				if h.rooms[client.roomID] != nil {
					delete(h.rooms[client.roomID], client)
					if len(h.rooms[client.roomID]) == 0 {
						delete(h.rooms, client.roomID)
					}
				}
				
				log.Printf("Client %s left room %s", client.playerID, client.roomID)
				
				// Notify other clients in the room
				message := &models.WebSocketMessage{
					Type:      models.MessageTypePlayerLeft,
					Data:      map[string]string{"player_id": client.playerID},
					Timestamp: time.Now(),
				}
				h.BroadcastToRoom(client.roomID, message)
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// BroadcastToRoom sends a message to all clients in a specific room
func (h *Hub) BroadcastToRoom(roomID string, message *models.WebSocketMessage) {
	if h.rooms[roomID] == nil {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for client := range h.rooms[roomID] {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
			delete(h.rooms[roomID], client)
		}
	}
}

// ServeWS handles websocket requests from the peer
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request, roomID, playerID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:      h,
		conn:     conn,
		send:     make(chan []byte, 256),
		roomID:   roomID,
		playerID: playerID,
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse incoming message
		var message models.WebSocketMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		// Handle different message types
		c.handleMessage(&message)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming WebSocket messages
func (c *Client) handleMessage(message *models.WebSocketMessage) {
	switch message.Type {
	case models.MessageTypeAnswer:
		c.handleAnswerMessage(message)
	case models.MessageTypeJoin:
		c.handleJoinMessage(message)
	default:
		log.Printf("Unknown message type: %s", message.Type)
	}
}

// handleAnswerMessage processes player answers
func (c *Client) handleAnswerMessage(message *models.WebSocketMessage) {
	// TODO: Implement answer handling
	// 1. Parse answer data
	// 2. Save to Redis
	// 3. Update player score
	// 4. Broadcast to room if needed
	
	log.Printf("Answer received from player %s in room %s", c.playerID, c.roomID)
}

// handleJoinMessage processes player join requests
func (c *Client) handleJoinMessage(message *models.WebSocketMessage) {
	// TODO: Implement join handling
	// 1. Validate player
	// 2. Update room state
	// 3. Send current quiz state to player
	
	log.Printf("Join request from player %s in room %s", c.playerID, c.roomID)
}

// GetRoomClients returns all clients in a specific room
func (h *Hub) GetRoomClients(roomID string) []*Client {
	var clients []*Client
	if h.rooms[roomID] != nil {
		for client := range h.rooms[roomID] {
			clients = append(clients, client)
		}
	}
	return clients
}

// GetRoomPlayerCount returns the number of players in a room
func (h *Hub) GetRoomPlayerCount(roomID string) int {
	if h.rooms[roomID] != nil {
		return len(h.rooms[roomID])
	}
	return 0
} 