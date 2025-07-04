package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"quiz-realtime-service/internal/handlers"
	"quiz-realtime-service/internal/redis"
	"quiz-realtime-service/internal/websocket"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Redis client
	redisClient := redis.NewRedisClient()
	defer redisClient.Close()

	// Initialize WebSocket hub
	hub := websocket.NewHub(redisClient)
	go hub.Run()

	// Initialize handlers
	quizHandler := handlers.NewQuizHandler(redisClient, hub)

	// Setup Gin router
	router := gin.Default()

	// Enable CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"service":   "realtime-service",
			"timestamp": gin.Time(),
		})
	})

	// WebSocket endpoint
	router.GET("/ws/:roomId", quizHandler.HandleWebSocket)

	// Quiz room management endpoints
	router.POST("/room", quizHandler.CreateRoom)
	router.GET("/room/:roomId", quizHandler.GetRoom)
	router.DELETE("/room/:roomId", quizHandler.DeleteRoom)
	router.GET("/room/:roomId/players", quizHandler.GetRoomPlayers)

	// Quiz control endpoints
	router.POST("/room/:roomId/start", quizHandler.StartQuiz)
	router.POST("/room/:roomId/next", quizHandler.NextQuestion)
	router.POST("/room/:roomId/end", quizHandler.EndQuiz)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Realtime service starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
} 