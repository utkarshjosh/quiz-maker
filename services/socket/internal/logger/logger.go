package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewDevelopment creates a development logger with detailed output
func NewDevelopment() (*zap.Logger, error) {
	config := zap.NewDevelopmentConfig()
	
	// Customize the development config for better debugging
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
	config.EncoderConfig.LevelKey = "level"
	config.EncoderConfig.MessageKey = "message"
	config.EncoderConfig.CallerKey = "caller"
	config.EncoderConfig.StacktraceKey = "stacktrace"
	
	// Set log level to debug for development
	config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	
	// Add color output for better readability
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	
	return config.Build()
}

// NewProduction creates a production logger with JSON output
func NewProduction() (*zap.Logger, error) {
	config := zap.NewProductionConfig()
	
	// Customize the production config
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
	config.EncoderConfig.LevelKey = "level"
	config.EncoderConfig.MessageKey = "message"
	config.EncoderConfig.CallerKey = "caller"
	config.EncoderConfig.StacktraceKey = "stacktrace"
	
	// Set log level based on environment
	if os.Getenv("LOG_LEVEL") == "debug" {
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	} else {
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}
	
	return config.Build()
}

// NewWebSocketLogger creates a specialized logger for WebSocket operations
func NewWebSocketLogger(baseLogger *zap.Logger) *zap.Logger {
	return baseLogger.With(
		zap.String("component", "websocket"),
		zap.String("service", "realtime"),
	)
}

// NewDatabaseLogger creates a specialized logger for database operations
func NewDatabaseLogger(baseLogger *zap.Logger) *zap.Logger {
	return baseLogger.With(
		zap.String("component", "database"),
		zap.String("service", "realtime"),
	)
}

// NewAuthLogger creates a specialized logger for authentication operations
func NewAuthLogger(baseLogger *zap.Logger) *zap.Logger {
	return baseLogger.With(
		zap.String("component", "auth"),
		zap.String("service", "realtime"),
	)
}
