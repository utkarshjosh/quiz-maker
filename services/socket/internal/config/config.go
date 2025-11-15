package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment string
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	Auth0       Auth0Config
	Quiz        QuizConfig
}

type ServerConfig struct {
	Address      string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type RedisConfig struct {
	Address  string
	Password string
	DB       int
}

type Auth0Config struct {
	Domain       string
	ClientID     string
	ClientSecret string
	Audience     string
	JWTSecret    string
}

type QuizConfig struct {
	DefaultQuestionDuration time.Duration
	MaxRoomSize             int
	RoomTTL                 time.Duration
	PinLength               int
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	environment := getEnv("ENVIRONMENT", "")
	if environment == "" {
		environment = getEnv("NODE_ENV", "development")
	}
	_ = os.Setenv("ENVIRONMENT", environment)
	if os.Getenv("NODE_ENV") == "" {
		_ = os.Setenv("NODE_ENV", environment)
	}

	cfg := &Config{
		Environment: environment,
		Server: ServerConfig{
			Address:      getEnv("SERVER_ADDRESS", ":5000"),
			ReadTimeout:  getDuration("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout: getDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:  getDuration("SERVER_IDLE_TIMEOUT", 60*time.Second),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", ""),
			MaxOpenConns:    getInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Address:  getEnv("REDIS_ADDRESS", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getInt("REDIS_DB", 0),
		},

		Auth0: Auth0Config{
			Domain:       getEnv("AUTH0_DOMAIN", ""),
			ClientID:     getEnv("AUTH0_CLIENT_ID", ""),
			ClientSecret: getEnv("AUTH0_CLIENT_SECRET", ""),
			Audience:     getEnv("AUTH0_AUDIENCE", ""),
			JWTSecret:    getEnv("JWT_SECRET", ""),
		},
		Quiz: QuizConfig{
			DefaultQuestionDuration: getDuration("QUIZ_QUESTION_DURATION", 30*time.Second),
			MaxRoomSize:             getInt("QUIZ_MAX_ROOM_SIZE", 50),
			RoomTTL:                 getDuration("QUIZ_ROOM_TTL", 2*time.Hour),
			PinLength:               getInt("QUIZ_PIN_LENGTH", 6),
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if c.Auth0.Domain == "" {
		return fmt.Errorf("AUTH0_DOMAIN is required")
	}
	if c.Auth0.ClientID == "" {
		return fmt.Errorf("AUTH0_CLIENT_ID is required")
	}
	if c.Auth0.ClientSecret == "" {
		return fmt.Errorf("AUTH0_CLIENT_SECRET is required")
	}
	if c.Auth0.Audience == "" {
		return fmt.Errorf("AUTH0_AUDIENCE is required")
	}
	if c.Auth0.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
