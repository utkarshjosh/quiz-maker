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

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
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
