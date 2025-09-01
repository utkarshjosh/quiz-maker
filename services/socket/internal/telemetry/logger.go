package telemetry

import (
	"go.uber.org/zap"
)

// NewLogger creates a new structured logger based on environment
func NewLogger(environment string) (*zap.Logger, error) {
	var config zap.Config

	if environment == "production" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
	}

	// Customize the config
	config.DisableStacktrace = true
	config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)

	if environment == "development" {
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	}

	logger, err := config.Build()
	if err != nil {
		return nil, err
	}

	return logger, nil
}
