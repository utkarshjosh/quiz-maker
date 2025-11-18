package database

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

type Database struct {
	conn   *sql.DB
	logger *zap.Logger
}

type Config struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

func New(cfg Config, logger *zap.Logger) (*Database, error) {
	connString := ensureSSLMode(cfg.URL)

	db, err := sql.Open("postgres", connString)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection with retry logic for PostgreSQL startup
	maxRetries := 30
	retryDelay := 1 * time.Second
	for i := 0; i < maxRetries; i++ {
		if err := db.Ping(); err != nil {
			// Check if it's a startup error
			errStr := err.Error()
			if strings.Contains(errStr, "the database system is starting up") ||
				strings.Contains(errStr, "connection refused") {
				if i < maxRetries-1 {
					logger.Info("Database not ready yet, retrying...",
						zap.Int("attempt", i+1),
						zap.Int("max_retries", maxRetries),
						zap.Duration("retry_delay", retryDelay))
					time.Sleep(retryDelay)
					continue
				}
			}
			// For other errors or final retry, return the error
			return nil, fmt.Errorf("failed to ping database: %w", err)
		}
		// Connection successful
		break
	}

	logger.Info("Database connection established")

	return &Database{
		conn:   db,
		logger: logger,
	}, nil
}

func (d *Database) Close() error {
	return d.conn.Close()
}

func (d *Database) GetConnection() *sql.DB {
	return d.conn
}

func ensureSSLMode(url string) string {
	if url == "" {
		return url
	}

	if strings.Contains(strings.ToLower(url), "sslmode=") {
		return url
	}

	separator := "?"
	if strings.Contains(url, "?") {
		separator = "&"
	}

	return url + separator + "sslmode=disable"
}
