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
	@echo ""
	@echo "Development shortcuts:"
	@echo "make dev:api    - Start API Gateway only"
	@echo "make dev:web    - Start Web Frontend only"
	@echo "make dev:quiz   - Start Quiz Generator only"
	@echo "make dev:socket - Start WebSocket service only"

# Install dependencies
install:
	@echo "Installing dependencies for all workspaces..."
	npm install
	@echo "Dependencies installed!"

# Development mode (without Docker)
dev:
	@echo "Starting development environment..."
	@echo "Make sure Redis and MongoDB are running locally"
	@echo "Starting all services..."
	npm run dev:api &
	npm run dev:web &
	npm run dev:quiz-gen &
	@echo "Starting WebSocket service..."
	cd services/socket && go run cmd/main.go &
	@echo "All services started in development mode!"

# Start with Docker Compose
start:
	@echo "Starting all services with Docker Compose..."
	docker-compose -f infra/docker-compose.yml up -d
	@echo "All services started!"
	@echo "API Gateway: http://localhost:3000"
	@echo "Web Frontend: http://localhost:5173"
	@echo "Quiz Generator: http://localhost:3001"
	@echo "WebSocket Service: http://localhost:8080"

# Stop all services
stop:
	@echo "Stopping all services..."
	docker-compose -f infra/docker-compose.yml down
	@echo "All services stopped!"

# Build Docker images
build:
	@echo "Building Docker images..."
	docker-compose -f infra/docker-compose.yml build
	@echo "Docker images built!"

# Clean up Docker resources
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose -f infra/docker-compose.yml down -v --remove-orphans
	docker system prune -f
	@echo "Clean up completed!"

# View logs
logs:
	@echo "Viewing logs from all services..."
	docker-compose -f infra/docker-compose.yml logs -f

# Run tests
test:
	@echo "Running tests for all services..."
	npm run test:all

# Initial setup
setup: install build
	@echo "Initial setup completed!"
	@echo "You can now run 'make start' to start all services"

# Check health of all services
health:
	@echo "Checking health of all services..."
	@curl -f http://localhost:3000/api/health || echo "API Gateway not responding"
	@curl -f http://localhost:5173 || echo "Web Frontend not responding"
	@curl -f http://localhost:3001/health || echo "Quiz Generator not responding"
	@curl -f http://localhost:8080/health || echo "WebSocket Service not responding"

# Development shortcuts
dev:api:
	@echo "Starting API Gateway..."
	npm run dev:api

dev:web:
	@echo "Starting Web Frontend..."
	npm run dev:web

dev:quiz:
	@echo "Starting Quiz Generator..."
	npm run dev:quiz-gen

dev:socket:
	@echo "Starting WebSocket Service..."
	cd services/socket && go run cmd/main.go

# Build shortcuts
build:api:
	@echo "Building API Gateway..."
	npm run build:api

build:web:
	@echo "Building Web Frontend..."
	npm run build:web

build:quiz:
	@echo "Building Quiz Generator..."
	npm run build:quiz-gen

build:all:
	@echo "Building all applications..."
	npm run build:all

# Test shortcuts
test:api:
	@echo "Testing API Gateway..."
	npm run test:api

test:web:
	@echo "Testing Web Frontend..."
	npm run test:web

test:quiz:
	@echo "Testing Quiz Generator..."
	npm run test:quiz-gen

test:all:
	@echo "Testing all services..."
	npm run test:all

# Lint shortcuts
lint:api:
	@echo "Linting API Gateway..."
	npm run lint:api

lint:web:
	@echo "Linting Web Frontend..."
	npm run lint:web

lint:quiz:
	@echo "Linting Quiz Generator..."
	npm run lint:quiz-gen

lint:all:
	@echo "Linting all services..."
	npm run lint:all

# Database operations
db-seed:
	@echo "Seeding database with sample data..."
	cd apps/api && npm run seed

db-reset:
	@echo "Resetting database..."
	docker-compose -f infra/docker-compose.yml exec mongodb mongosh --eval "db.dropDatabase()"
	docker-compose -f infra/docker-compose.yml exec redis redis-cli flushall

# Utility commands
ps:
	docker-compose -f infra/docker-compose.yml ps

restart:
	@echo "Restarting all services..."
	docker-compose -f infra/docker-compose.yml restart

# Production commands
prod-build:
	@echo "Building for production..."
	docker build -f infra/Dockerfile.api-gateway -t quiz-maker/api:latest .
	docker build -f infra/Dockerfile.quiz-generator -t quiz-maker/quiz-gen:latest .
	docker build -f infra/Dockerfile.realtime-service -t quiz-maker/socket:latest .

prod-start:
	@echo "Starting production environment..."
	@echo "Production deployment not yet configured"
	@echo "Use 'make prod-build' to build production images first"

# Shared package commands
pkg:build:
	@echo "Building shared packages..."
	cd pkg/ts && npm run build

pkg:dev:
	@echo "Watching shared packages..."
	cd pkg/ts && npm run dev

# Clean workspace
clean:workspace:
	@echo "Cleaning workspace..."
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf services/*/node_modules
	rm -rf pkg/*/node_modules
	@echo "Workspace cleaned!"

# Reset everything
reset: clean clean:workspace install
	@echo "Complete reset completed!" 
