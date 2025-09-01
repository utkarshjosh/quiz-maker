# Makefile for Quiz Realtime WebSocket Service

.PHONY: build run test clean dev docker help

# Variables
BINARY_NAME=realtime-service
BUILD_DIR=bin
MAIN_PATH=cmd/main.go

# Default target
help:
	@echo "Available commands:"
	@echo "  build    - Build the binary"
	@echo "  run      - Run the service"
	@echo "  dev      - Run in development mode with auto-reload"
	@echo "  test     - Run tests"
	@echo "  clean    - Clean build artifacts"
	@echo "  docker   - Build Docker image"
	@echo "  deps     - Install dependencies"

# Build the binary
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Run the service
run: build
	@echo "Starting $(BINARY_NAME)..."
	@./$(BUILD_DIR)/$(BINARY_NAME)

# Development mode (requires air for auto-reload)
dev:
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Installing air for auto-reload..."; \
		go install github.com/cosmtrek/air@latest; \
		air; \
	fi

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@go clean

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod tidy
	@go mod download

# Build Docker image
docker:
	@echo "Building Docker image..."
	@docker build -f ../docker/Dockerfile.realtime-service -t quiz-realtime-service .

# Check if required environment variables are set
check-env:
	@echo "Checking environment variables..."
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL is required" && exit 1)
	@test -n "$$JWT_SECRET" || (echo "JWT_SECRET is required" && exit 1)
	@test -n "$$JWT_REFRESH_SECRET" || (echo "JWT_REFRESH_SECRET is required" && exit 1)
	@echo "Environment variables OK"

# Run with environment check
run-safe: check-env run

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Lint code (requires golangci-lint)
lint:
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not installed. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
	fi
