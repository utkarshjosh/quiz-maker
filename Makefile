# Quiz AI System - Makefile

.PHONY: help install dev start stop build clean logs test

# Default target
help:
	@echo "Quiz AI System - Development Commands"
	@echo "====================================="
	@echo "make install    - Install dependencies for all services"
	@echo "make dev        - Start development environment"
	@echo "make start      - Start all services with Docker Compose"
	@echo "make stop       - Stop all services"
	@echo "make build      - Build all Docker images"
	@echo "make clean      - Clean up containers and volumes"
	@echo "make logs       - View logs from all services"
	@echo "make test       - Run tests for all services"
	@echo "make setup      - Initial setup (install + build)"

# Install dependencies
install:
	@echo "Installing dependencies..."
	cd api-gateway && npm install
	cd quiz-generator && npm install
	cd realtime-service && go mod download
	@echo "Dependencies installed!"

# Development mode (without Docker)
dev:
	@echo "Starting development environment..."
	@echo "Make sure Redis and MongoDB are running locally"
	@echo "Starting API Gateway..."
	cd api-gateway && npm run dev &
	@echo "Starting Quiz Generator..."
	cd quiz-generator && npm run dev &
	@echo "Starting Realtime Service..."
	cd realtime-service && go run cmd/main.go &
	@echo "All services started in development mode!"

# Start with Docker Compose
start:
	@echo "Starting all services with Docker Compose..."
	docker-compose -f docker/docker-compose.yml up -d
	@echo "All services started!"
	@echo "API Gateway: http://localhost:3000"
	@echo "Quiz Generator: http://localhost:3001"
	@echo "Realtime Service: http://localhost:8080"

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose -f docker/docker-compose.yml down
	@echo "All services stopped!"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose -f docker/docker-compose.yml build
	@echo "Docker images built!"

# Clean up Docker resources
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose -f docker/docker-compose.yml down -v --remove-orphans
	docker system prune -f
	@echo "Clean up completed!"

# View logs
logs:
	@echo "Viewing logs from all services..."
	docker-compose -f docker/docker-compose.yml logs -f

# Run tests
test:
	@echo "Running tests..."
	cd api-gateway && npm test
	cd quiz-generator && npm test
	cd realtime-service && go test ./...
	@echo "Tests completed!"

# Initial setup
setup: install build
	@echo "Initial setup completed!"
	@echo "You can now run 'make start' to start all services"

# Check health of all services
health:
	@echo "Checking health of all services..."
	@curl -f http://localhost:3000/api/health || echo "API Gateway not responding"
	@curl -f http://localhost:3001/health || echo "Quiz Generator not responding"
	@curl -f http://localhost:8080/health || echo "Realtime Service not responding"

# Development shortcuts
api:
	cd api-gateway && npm run dev

generator:
	cd quiz-generator && npm run dev

realtime:
	cd realtime-service && go run cmd/main.go

# Database operations
db-seed:
	@echo "Seeding database with sample data..."
	# TODO: Add database seeding script

db-reset:
	@echo "Resetting database..."
	docker-compose -f docker/docker-compose.yml exec mongodb mongosh --eval "db.dropDatabase()"
	docker-compose -f docker/docker-compose.yml exec redis redis-cli flushall

# Utility commands
ps:
	docker-compose -f docker/docker-compose.yml ps

restart:
	@echo "Restarting all services..."
	docker-compose -f docker/docker-compose.yml restart

# Production commands
prod-build:
	@echo "Building for production..."
	docker-compose -f docker/docker-compose.prod.yml build

prod-start:
	@echo "Starting production environment..."
	docker-compose -f docker/docker-compose.prod.yml up -d 