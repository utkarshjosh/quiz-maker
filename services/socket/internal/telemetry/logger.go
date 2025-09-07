package telemetry

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger creates a new structured logger based on environment
func NewLogger(environment string) (*zap.Logger, error) {
	var config zap.Config

	if environment == "production" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
	}

	// Customize the config for better debugging
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339)
	config.EncoderConfig.LevelKey = "level"
	config.EncoderConfig.MessageKey = "message"
	config.EncoderConfig.CallerKey = "caller"
	config.EncoderConfig.StacktraceKey = "stacktrace"

	// Set log level based on environment and LOG_LEVEL env var
	if environment == "development" || os.Getenv("LOG_LEVEL") == "debug" {
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		config.DisableStacktrace = false
		// Add color output for better readability in development
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		config.DisableStacktrace = true
	}

	logger, err := config.Build()
	if err != nil {
		return nil, err
	}

	return logger, nil
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
