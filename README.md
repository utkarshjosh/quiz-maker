# 🧠 AI-Powered Real-Time Quiz System

A scalable, full-stack AI-powered quiz generation and real-time hosting platform built with modern technologies.

## 🎯 Features

- **🤖 AI-Powered Quiz Generation**: Create quizzes from simple prompts using OpenAI
- **⚡ Real-Time Quiz Hosting**: Live quiz sessions with WebSocket connections
- **🚀 High-Performance Caching**: Redis-based write-through caching
- **📊 Live Leaderboards**: Real-time scoring and rankings
- **🔐 Secure Authentication**: JWT-based user authentication
- **🐳 Docker Ready**: Complete containerization support
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

The system follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │ Quiz Generator  │
│   (Vue.js)      │◄──►│   (Node.js)     │◄──►│   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │                        │
                               ▼                        ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │ Realtime Service│    │     Redis       │
                    │   (Golang)      │◄──►│    (Cache)      │
                    └─────────────────┘    └─────────────────┘
                               │                        │
                               ▼                        ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │    MongoDB      │    │    OpenAI       │
                    │  (Database)     │    │     (API)       │
                    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vue.js/React | Quiz UI, dashboards, real-time updates |
| **API Gateway** | Node.js (Express) | Authentication, routing, validation |
| **Quiz Generator** | Node.js (OpenAI SDK) | AI-powered quiz creation |
| **Realtime Service** | Golang + WebSocket | Live quiz hosting, real-time communication |
| **Cache** | Redis | Session storage, real-time data, pub/sub |
| **Database** | MongoDB | Persistent storage for quizzes and users |
| **Container** | Docker | Service containerization and orchestration |

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Go** (v1.21 or higher)
- **Docker & Docker Compose**
- **Redis** (for local development)
- **MongoDB** (for local development)
- **OpenAI API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quiz-maker
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development environment**
   ```bash
   # With Docker (recommended)
   make start

   # Or without Docker (requires local Redis & MongoDB)
   make dev
   ```

## 🔧 Development Commands

The project includes a comprehensive Makefile for easy development:

```bash
# Setup and Installation
make install       # Install all dependencies
make setup         # Complete initial setup

# Development
make dev           # Start development servers
make start         # Start with Docker Compose
make stop          # Stop all services

# Utilities
make logs          # View service logs
make health        # Check service health
make test          # Run all tests
make clean         # Clean up Docker resources
```

## 📁 Project Structure

```
quiz-maker/
├── api-gateway/           # API Gateway service
│   ├── src/
│   │   ├── routes/        # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utility functions
│   └── package.json
├── quiz-generator/        # AI Quiz Generation service
│   ├── src/
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   │   └── utils/         # Utility functions
│   └── package.json
├── realtime-service/      # Golang WebSocket service
│   ├── cmd/               # Main application
│   ├── internal/
│   │   ├── handlers/      # HTTP handlers
│   │   ├── models/        # Data structures
│   │   ├── redis/         # Redis client
│   │   └── websocket/     # WebSocket hub
│   └── go.mod
├── shared/                # Shared utilities and types
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # Common utilities
│   └── configs/           # Configuration files
├── docker/                # Docker configuration
│   ├── docker-compose.yml
│   └── Dockerfile.*
└── scripts/               # Development scripts
```

## 🔌 API Endpoints

### API Gateway (Port 3000)
- `GET /api/health` - Health check
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/quiz/generate` - Generate new quiz
- `GET /api/quiz/:id` - Get quiz by ID

### Quiz Generator (Port 3001)
- `GET /health` - Health check
- `POST /generate` - Generate quiz from prompt
- `GET /quiz/:id/status` - Get generation status

### Realtime Service (Port 8080)
- `GET /health` - Health check
- `POST /room` - Create quiz room
- `GET /room/:id` - Get room details
- `GET /ws/:roomId` - WebSocket connection
- `POST /room/:id/start` - Start quiz session

## 🌐 WebSocket Events

The realtime service supports the following WebSocket events:

### Client → Server
- `join` - Join a quiz room
- `answer` - Submit an answer
- `leave` - Leave the room

### Server → Client
- `player_joined` - New player joined
- `player_left` - Player left
- `quiz_started` - Quiz session started
- `new_question` - New question broadcast
- `question_result` - Question results
- `leaderboard` - Updated leaderboard
- `quiz_finished` - Quiz completed

## 🗃️ Database Schema

### MongoDB Collections

#### Quizzes
```javascript
{
  _id: ObjectId,
  title: String,
  prompt: String,
  difficulty: String,
  questions: [{
    id: String,
    text: String,
    options: Object,
    correctAnswer: String,
    explanation: String
  }],
  createdAt: Date,
  createdBy: ObjectId,
  tags: [String]
}
```

#### Users
```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  password: String,
  role: String,
  createdAt: Date
}
```

### Redis Key Patterns
- `quiz:{roomId}:room` - Room information
- `quiz:{roomId}:state` - Quiz state
- `quiz:{roomId}:scores` - Player scores
- `player:{roomId}:{playerId}:answers` - Player answers
- `quiz_channel:{roomId}` - Pub/Sub channel

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
# Service Configuration
NODE_ENV=development
API_GATEWAY_PORT=3000
QUIZ_GENERATOR_PORT=3001
REALTIME_SERVICE_PORT=8080

# Database
MONGODB_URI=mongodb://localhost:27017/quiz-ai-system
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Security
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h

# URLs
FRONTEND_URL=http://localhost:5173
API_GATEWAY_URL=http://localhost:3000
QUIZ_GENERATOR_URL=http://localhost:3001
REALTIME_SERVICE_URL=http://localhost:8080
```

## 🧪 Testing

Run tests for all services:

```bash
make test
```

Or test individual services:

```bash
# API Gateway
cd api-gateway && npm test

# Quiz Generator
cd quiz-generator && npm test

# Realtime Service
cd realtime-service && go test ./...
```

## 🚀 Deployment

### Docker Deployment

1. Build all images:
   ```bash
   make build
   ```

2. Start production environment:
   ```bash
   make prod-start
   ```

### Manual Deployment

1. **Database Setup**: Configure MongoDB and Redis
2. **Environment Variables**: Set production environment variables
3. **Build Services**: Build each service for production
4. **Process Management**: Use PM2 or similar for Node.js services
5. **Reverse Proxy**: Configure Nginx for load balancing

## 📊 Monitoring

- **Health Checks**: All services expose `/health` endpoints
- **Logging**: Structured logging with appropriate levels
- **Metrics**: Redis provides built-in monitoring
- **WebSocket Monitoring**: Real-time connection tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for the GPT API
- Redis for caching and pub/sub
- MongoDB for document storage
- Gorilla WebSocket for Go WebSocket implementation
- All the open-source contributors

---

**Happy Quizzing! 🎉**

For more information, check out the individual service README files in each directory. 



quiz-maker/
├── frontend/                    # Vue.js/React frontend
├── api-gateway/                 # Node.js API Gateway (Express)
├── quiz-generator/              # Node.js AI Quiz Generation service
├── realtime-service/            # Golang WebSocket service
├── shared/                      # Shared types, utilities, configs
│   ├── types/                   # TypeScript interfaces/types
│   ├── utils/                   # Common utilities
│   └── configs/                 # Shared configuration files
├── database/                    # Database schemas and migrations
│   ├── mongodb/                 # MongoDB schemas
│   └── migrations/              # Database migrations
├── docker/                      # Docker configurations
│   ├── docker-compose.yml
│   ├── Dockerfile.frontend
│   ├── Dockerfile.api-gateway
│   ├── Dockerfile.quiz-generator
│   └── Dockerfile.realtime-service
├── scripts/                     # Deployment and utility scripts
├── docs/                        # Additional documentation
├── .env.example                 # Environment variables template
├── README.md                    # Project documentation
└── Makefile                     # Build and deployment commands