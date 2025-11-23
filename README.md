# 🧠 AI-Powered Real-Time Quiz System

A scalable, full-stack AI-powered quiz generation and real-time hosting platform built with modern technologies.

## 🌐 Live Demo

**Try it out:** [quiz.utkarshjoshi.com](https://quiz.utkarshjoshi.com)

**Check out more projects:** [utkarshjoshi.com/projects/](https://utkarshjoshi.com/projects/)

## 🎯 Features

- **🤖 AI-Powered Quiz Generation**: Create quizzes from simple prompts using OpenAI
- **⚡ Real-Time Quiz Hosting**: Live quiz sessions with WebSocket connections
- **🚀 High-Performance Caching**: Redis-based write-through caching
- **📊 Live Leaderboards**: Real-time scoring and rankings
- **🔐 Secure Authentication**: JWT-based user authentication
- **🐳 Docker Ready**: Complete containerization support
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

The system follows a modular, scalable architecture with clear separation of concerns:

```
quiz-maker/
├── apps/                    # Main applications
│   ├── api/                # Express + TypeScript backend (feature slices)
│   └── web/                # React frontend (Next.js/Vite/CRA etc.)
├── services/                # Specialized services
│   ├── socket/             # Go WebSocket service
│   └── quiz-generator/     # AI-powered quiz generation
├── pkg/                    # Shared libraries
│   ├── ts/                 # Shared TS libraries (DTOs, utils)
│   └── go/                 # Shared Go libraries
├── infra/                  # Infrastructure
│   ├── docker/             # Docker configurations
│   └── database/           # Database migrations and configs
└── docs/                   # ADRs, philosophy, runbooks
```

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │  API Gateway    │    │ Quiz Generator  │
│   (React)       │◄──►│   (Express)     │◄──►│   (Node.js)     │
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

| Layer                | Technology                     | Purpose                                    |
| -------------------- | ------------------------------ | ------------------------------------------ |
| **Frontend**         | React + TypeScript             | Quiz UI, dashboards, real-time updates     |
| **API Gateway**      | Node.js + Express + TypeScript | Authentication, routing, validation        |
| **Quiz Generator**   | Node.js + TypeScript           | AI-powered quiz creation                   |
| **Socket Service**   | Golang + WebSocket             | Live quiz hosting, real-time communication |
| **Cache**            | Redis                          | Session storage, real-time data, pub/sub   |
| **Database**         | MongoDB + Prisma               | Persistent storage for quizzes and users   |
| **Container**        | Docker                         | Service containerization and orchestration |
| **Shared Libraries** | TypeScript + Go                | Reusable DTOs, types, and utilities        |

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
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development environment**

   ```bash
   # With Docker (recommended)
   docker-compose up -d

   # Or individual services
   npm run dev:api      # Start API gateway
   npm run dev:web      # Start web frontend
   npm run dev:quiz-gen # Start quiz generator
   ```

## 🔧 Development Commands

The project includes comprehensive scripts for development:

```bash
# Development
npm run dev:api          # Start API gateway
npm run dev:web          # Start web frontend
npm run dev:quiz-gen     # Start quiz generator

# Building
npm run build:all        # Build all applications
npm run build:api        # Build API gateway
npm run build:web        # Build web frontend
npm run build:quiz-gen   # Build quiz generator

# Testing
npm run test:all         # Run all tests
npm run test:api         # Test API gateway
npm run test:web         # Test web frontend
npm run test:quiz-gen    # Test quiz generator

# Linting
npm run lint:all         # Lint all code
npm run lint:api         # Lint API gateway
npm run lint:web         # Lint web frontend
npm run lint:quiz-gen    # Lint quiz generator
```

## 📚 Documentation

### Architecture Decisions

All major architectural decisions are documented in [Architectural Decision Records (ADRs)](docs/adr/):

- **[ADR-001](docs/adr/001-project-restructuring.md)**: Project Restructuring to Modular Architecture
- **[ADR-002](docs/adr/002-monorepo-with-npm-workspaces.md)**: Monorepo with npm Workspaces
- **[ADR-003](docs/adr/003-shared-library-organization.md)**: Shared Library Organization
- **[ADR-004](docs/adr/004-infrastructure-as-code.md)**: Infrastructure as Code Approach
- **[ADR-005](docs/adr/005-database-schema-management-with-prisma.md)**: Database Schema Management with Prisma
- **[ADR-006](docs/adr/006-oauth-authentication-implementation.md)**: OAuth Authentication Implementation

### Project Structure

For detailed information about the project structure and organization, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

### API Documentation

- **API Gateway (Port 3000)**
  - `GET /api/health` - Health check
  - `POST /api/auth/login` - User authentication
  - `GET /api/auth/profile` - User profile
  - `POST /api/quiz` - Create quiz
  - `GET /api/quiz/:id` - Get quiz details

- **Quiz Generator (Port 3001)**
  - `GET /health` - Health check
  - `POST /generate` - Generate quiz from prompt
  - `GET /quiz/:id/status` - Get generation status

- **Socket Service (Port 5000)**
  - `GET /health` - Health check
  - `POST /room` - Create quiz room
  - `GET /room/:id` - Get room details

### WebSocket Events

- **Client → Server**
  - `join` - Join a quiz room
  - `answer` - Submit an answer
  - `leave` - Leave the room

- **Server → Client**
  - `player_joined` - New player joined
  - `player_left` - Player left
  - `question_start` - Question started
  - `question_end` - Question ended
  - `score_update` - Score updated

## 🗄️ Data Models

### Redis Data Structure

#### Quizzes

```javascript
{
  "quiz:roomId:room": {
    "id": "room-uuid",
    "quizId": "quiz-uuid",
    "status": "waiting|active|finished",
    "players": ["player1", "player2"],
    "currentQuestion": 0,
    "scores": {
      "player1": 100,
      "player2": 150
    }
  }
}
```

#### Users

```javascript
{
  "user:userId:session": {
    "id": "user-uuid",
    "name": "Player Name",
    "roomId": "room-uuid",
    "lastSeen": "timestamp"
  }
}
```

### Redis Key Patterns

- `quiz:{roomId}:room` - Room information
- `quiz:{roomId}:state` - Quiz state
- `user:{userId}:session` - User session data
- `room:{roomId}:players` - Room player list

## 🚀 Deployment

### Docker Deployment

1. Build all images:

   ```bash
   make build
   ```

2. Start services:

   ```bash
   docker-compose up -d
   ```

3. Check service health:

   ```bash
   make health
   ```

### Environment Variables

Required environment variables for each service:

- **API Gateway**: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`
- **Quiz Generator**: `OPENAI_API_KEY`, `MONGODB_URI`, `REDIS_URL`
- **Socket Service**: `REDIS_URL`, `PORT`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Quizzing! 🎉**

For more information, check out the [Architectural Decision Records](docs/adr/) and [Project Structure](PROJECT_STRUCTURE.md) documentation.

quiz-maker/
├── frontend/ # Vue.js/React frontend
├── api/ # Node.js API (Express)
├── quiz-generator/ # Node.js AI Quiz Generation service
├── socket/ # Golang WebSocket service
├── shared/ # Shared types, utilities, configs
│ ├── types/ # TypeScript interfaces/types
│ ├── utils/ # Common utilities
│ └── configs/ # Shared configuration files
├── database/ # Database schemas and migrations
│ ├── mongodb/ # MongoDB schemas
│ └── migrations/ # Database migrations
├── docker/ # Docker configurations
│ ├── docker-compose.yml
│ ├── Dockerfile.frontend
│ ├── Dockerfile.api
│ ├── Dockerfile.quiz-generator
│ └── Dockerfile.socket
├── scripts/ # Deployment and utility scripts
├── docs/ # Additional documentation
├── .env.example # Environment variables template
├── README.md # Project documentation
└── Makefile # Build and deployment commands
