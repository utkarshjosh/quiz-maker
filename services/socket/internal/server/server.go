package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"quiz-realtime-service/internal/auth"
	"quiz-realtime-service/internal/config"
	"quiz-realtime-service/internal/database"
	"quiz-realtime-service/internal/gateway"
	"quiz-realtime-service/internal/repository"
	"quiz-realtime-service/internal/store"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"go.uber.org/zap"
)

type Server struct {
	config    *config.Config
	logger    *zap.Logger
	httpServer *http.Server
	
	// Services
	authService auth.AuthServiceInterface
	redisStore  *store.RedisStore
	database    *database.Database
	roomRepo    *repository.RoomRepository
	wsGateway   *gateway.WebSocketGateway
}

func New(cfg *config.Config, logger *zap.Logger) (*Server, error) {
	// Initialize database
	db, err := database.New(database.Config{
		URL:             cfg.Database.URL,
		MaxOpenConns:    cfg.Database.MaxOpenConns,
		MaxIdleConns:    cfg.Database.MaxIdleConns,
		ConnMaxLifetime: cfg.Database.ConnMaxLifetime,
	}, logger)
	if err != nil {
		return nil, err
	}

	// Initialize room repository
	roomRepo := repository.NewRoomRepository(db.GetConnection(), logger)

	// Initialize user repository
	userRepo := repository.NewUserRepository(db.GetConnection(), logger)

	// Initialize Redis store
	redisStore := store.NewRedisStore(
		cfg.Redis.Address,
		cfg.Redis.Password,
		cfg.Redis.DB,
		logger,
	)

	// Test Redis connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := redisStore.Ping(ctx); err != nil {
		return nil, err
	}

	// Initialize Auth0 service
	authService := auth.NewAuth0Service(
		cfg.Auth0.Domain,
		cfg.Auth0.ClientID,
		cfg.Auth0.ClientSecret,
		cfg.Auth0.Audience,
		cfg.Auth0.JWTSecret,
		userRepo,
		logger,
	)

	// Initialize WebSocket gateway
	wsGateway := gateway.NewWebSocketGateway(authService, roomRepo, logger)

	// Create HTTP server
	router := chi.NewRouter()
	server := &Server{
		config:      cfg,
		logger:      logger,
		authService: authService,
		redisStore:  redisStore,
		database:    db,
		roomRepo:    roomRepo,
		wsGateway:   wsGateway,
	}

	server.setupRoutes(router)

	server.httpServer = &http.Server{
		Addr:         cfg.Server.Address,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	return server, nil
}

func (s *Server) setupRoutes(r chi.Router) {
	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Configure based on your needs
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoints
	r.Get("/health", s.handleHealth)
	r.Get("/readyz", s.handleReadiness)
	r.Get("/metrics", s.handleMetrics)

	// WebSocket endpoint
	r.Get("/ws", s.wsGateway.HandleWebSocket)

	// Admin endpoints (protected)
	r.Route("/internal", func(r chi.Router) {
		r.Use(s.authService.AuthMiddleware)
		r.Post("/rooms/{roomID}/close", s.handleCloseRoom)
		r.Post("/rooms/{roomID}/kick", s.handleKickUser)
		r.Get("/rooms", s.handleListRooms)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{
		"status": "healthy",
		"service": "realtime-service",
		"timestamp": "` + time.Now().Format(time.RFC3339) + `"
	}`))
}

func (s *Server) handleReadiness(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Check Redis connectivity
	if err := s.redisStore.Ping(ctx); err != nil {
		s.logger.Error("Redis health check failed", zap.Error(err))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{
			"status": "not_ready",
			"error": "redis_unavailable"
		}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{
		"status": "ready",
		"service": "realtime-service",
		"timestamp": "` + time.Now().Format(time.RFC3339) + `"
	}`))
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	// Basic metrics - in production you'd use Prometheus
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("# HELP active_rooms Number of active rooms\n"))
	w.Write([]byte("# TYPE active_rooms gauge\n"))
	// Note: This would need proper metrics collection in a real implementation
	w.Write([]byte("active_rooms 0\n"))
}

func (s *Server) handleCloseRoom(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomID")
	if roomID == "" {
		http.Error(w, "Room ID required", http.StatusBadRequest)
		return
	}

	hub := s.wsGateway.GetHub()
	room, exists := hub.GetRoom(roomID)
	if !exists {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	room.Close()
	hub.RemoveRoom(roomID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "closed"}`))
}

func (s *Server) handleKickUser(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "roomID")
	if roomID == "" {
		http.Error(w, "Room ID required", http.StatusBadRequest)
		return
	}

	// Parse request body for user ID and reason
	var req struct {
		UserID string `json:"user_id"`
		Reason string `json:"reason"`
	}
	
	if err := parseJSON(r, &req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	hub := s.wsGateway.GetHub()
	room, exists := hub.GetRoom(roomID)
	if !exists {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	room.RemoveMember(req.UserID, req.Reason)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "kicked"}`))
}

func (s *Server) handleListRooms(w http.ResponseWriter, r *http.Request) {
	// This would return a list of active rooms
	// For now, return empty array
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"rooms": []}`))
}

func (s *Server) Start() error {
	s.logger.Info("Starting HTTP server", zap.String("address", s.config.Server.Address))
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("Shutting down HTTP server")
	
	// Close database connection
	if err := s.database.Close(); err != nil {
		s.logger.Error("Failed to close database connection", zap.Error(err))
	}
	
	// Close Redis connection
	if err := s.redisStore.Close(); err != nil {
		s.logger.Error("Failed to close Redis connection", zap.Error(err))
	}
	
	return s.httpServer.Shutdown(ctx)
}

func parseJSON(r *http.Request, v interface{}) error {
	// Simple JSON parsing helper
	// In production, you'd use a proper JSON decoder with limits
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}
