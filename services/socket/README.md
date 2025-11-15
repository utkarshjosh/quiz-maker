# Quiz Realtime WebSocket Service

A standalone Go WebSocket service that powers real-time quiz sessions with minimal REST dependencies. Integrates with the existing Node.js API gateway and shared PostgreSQL database.

## Features

- **Real-time Quiz Sessions**: WebSocket-based quiz hosting with live scoring
- **JWT Authentication**: Verifies internal JWT tokens created by the API gateway
- **State Machine**: Lobby → Question → Reveal → End flow
- **Latency-weighted Scoring**: Faster answers get higher scores
- **Redis Integration**: Caching, presence tracking, and pub/sub
- **Room Management**: PIN-based joining, host controls, member management
- **Health Monitoring**: Health checks and basic metrics endpoints

## Architecture

```
[Client (Web/App)]
   ↕︎ WebSocket (wss)
[Go WebSocket Service]
   ├─ Gateway: auth handshake, rate limits, protocol upgrade
   ├─ Hub: rooms registry and routing
   ├─ Room: state machine, game logic, scoring
   ├─ Store: Redis for hot state, PostgreSQL for persistence
   └─ Admin API: health checks, room management
```

## Project Structure

```
services/socket/
├── cmd/
│   └── main.go                 # Application entry point
├── internal/
│   ├── auth/
│   │   └── auth0.go           # Auth0 authentication
│   ├── config/
│   │   └── config.go          # Configuration management
│   ├── gateway/
│   │   └── websocket.go       # WebSocket gateway and hub
│   ├── protocol/
│   │   └── messages.go        # WebSocket message definitions
│   ├── room/
│   │   └── room.go           # Room state machine and logic
│   ├── scoring/
│   │   └── calculator.go      # Scoring algorithms
│   ├── server/
│   │   └── server.go         # HTTP server and routes
│   ├── store/
│   │   └── redis.go          # Redis operations
│   └── telemetry/
│       └── logger.go         # Structured logging
├── migrations/
│   └── 001_create_quiz_rooms.sql
├── .env.example
├── go.mod
└── README.md
```

## Setup

### Prerequisites

- Go 1.22+
- PostgreSQL (shared with API gateway)
- Redis
- Node.js API gateway running

### Installation

1. **Clone and navigate to the service directory**:

   ```bash
   cd services/socket
   ```

2. **Install dependencies**:

   ```bash
   go mod tidy
   ```

3. **Set up environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**:

   ```bash
   # Apply the migration to your PostgreSQL database
   psql -d quiz_maker -f migrations/001_create_quiz_rooms.sql
   ```

5. **Start Redis** (if not already running):

   ```bash
   redis-server
   ```

6. **Run the service**:
   ```bash
   go run cmd/main.go
   ```

## Configuration

Key environment variables:

| Variable                 | Description                  | Default          |
| ------------------------ | ---------------------------- | ---------------- |
| `SERVER_ADDRESS`         | Server bind address          | `:8080`          |
| `DATABASE_URL`           | PostgreSQL connection string | Required         |
| `REDIS_ADDRESS`          | Redis server address         | `localhost:6379` |
| `AUTH0_DOMAIN`           | Auth0 domain                 | Required         |
| `AUTH0_CLIENT_ID`        | Auth0 client ID              | Required         |
| `AUTH0_CLIENT_SECRET`    | Auth0 client secret          | Required         |
| `AUTH0_AUDIENCE`         | Auth0 audience               | Required         |
| `QUIZ_QUESTION_DURATION` | Default question duration    | `30s`            |
| `QUIZ_MAX_ROOM_SIZE`     | Maximum players per room     | `50`             |

## WebSocket Protocol

### Connection

Connect to: `ws://localhost:5000/ws?token=<jwt_token>`

The JWT token must be a valid internal token created by the API gateway using the same JWT_SECRET.

### Message Format

```json
{
  "v": 1,
  "type": "message_type",
  "msg_id": "uuid",
  "room_id": "uuid-optional",
  "data": {
    /* type-specific data */
  }
}
```

### Message Types

#### Client → Server

- `join`: Join room by PIN
- `create_room`: Create new quiz room (host only)
- `start`: Start quiz (host only)
- `answer`: Submit answer to current question
- `kick`: Kick user from room (host only)
- `leave`: Leave room
- `ping`: Heartbeat

#### Server → Client

- `state`: Room state update
- `question`: New question broadcast
- `reveal`: Answer reveal with scores
- `score`: Score update
- `end`: Quiz completion
- `error`: Error message
- `joined`/`left`/`kicked`: Member updates

### Example Flow

1. **Host creates room**:

   ```json
   {
     "v": 1,
     "type": "create_room",
     "msg_id": "uuid",
     "data": {
       "quiz_id": "quiz-uuid",
       "settings": { "question_duration_ms": 30000 }
     }
   }
   ```

2. **Player joins by PIN**:

   ```json
   {
     "v": 1,
     "type": "join",
     "msg_id": "uuid",
     "data": {
       "pin": "123456",
       "display_name": "Player1"
     }
   }
   ```

3. **Host starts quiz**:

   ```json
   {
     "v": 1,
     "type": "start",
     "msg_id": "uuid",
     "data": {}
   }
   ```

4. **Server broadcasts question**:
   ```json
   {
     "v": 1,
     "type": "question",
     "room_id": "room-uuid",
     "data": {
       "index": 0,
       "question": "What is 2+2?",
       "options": ["3", "4", "5", "6"],
       "deadline_ms": 1640995200000
     }
   }
   ```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /readyz` - Readiness check (includes Redis connectivity)
- `GET /metrics` - Basic metrics (Prometheus format)

### Admin Endpoints (Authenticated)

- `POST /internal/rooms/{roomID}/close` - Force close room
- `POST /internal/rooms/{roomID}/kick` - Kick user from room
- `GET /internal/rooms` - List active rooms

## Scoring System

The service uses latency-weighted scoring:

- **Base Points**: 1000 points per correct answer
- **Time Factor**: `f(t) = max(0, 1 - t^α)` where `t` is time fraction
- **Streak Bonus**: 10% bonus per consecutive correct answer
- **Final Score**: `base_points × time_factor × (1 + streak_bonus)`

## Redis Keys

- `pin:{PIN}` → `room_id` (PIN to room mapping)
- `room:{room_id}:state` → Room state JSON
- `room:{room_id}:presence` → Set of online user IDs
- `room:{room_id}:answers:{question_index}` → User answers hash
- `ws:room:{room_id}` → Pub/Sub channel for room events

## Database Schema

The service extends the existing Prisma schema with:

- `quiz_rooms` - Room metadata and state
- `quiz_room_members` - Room membership tracking
- `quiz_answers` - Real-time answer storage
- `quiz_room_scores` - Leaderboard data
- `quiz_room_events` - Audit trail (optional)

## Development

### Running Tests

```bash
go test ./...
```

### Building

```bash
go build -o bin/realtime-service cmd/main.go
```

### Docker

```bash
   docker build -f ../../infra/Dockerfile.socket -t quiz-socket .
```

## Integration with Frontend

The frontend can connect to this service for real-time quiz functionality:

```javascript
const ws = new WebSocket(`ws://localhost:5000/ws?token=${jwtToken}`);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};

// Join room
ws.send(
  JSON.stringify({
    v: 1,
    type: "join",
    msg_id: generateUUID(),
    data: {
      pin: "123456",
      display_name: "Player1",
    },
  })
);
```

## Monitoring

The service provides basic monitoring through:

- Structured logging with Zap
- Health check endpoints
- Basic metrics endpoint
- Request tracing with request IDs

For production, integrate with:

- Prometheus for metrics
- Grafana for dashboards
- ELK stack for log aggregation

## Security

- JWT token validation using shared JWT_SECRET with API gateway
- Token expiration verification
- Rate limiting per user/room
- Input validation on all messages
- CORS configuration
- WebSocket origin validation
- Automatic cleanup of expired rooms

## Performance

- In-memory room state with Redis backup
- Efficient message broadcasting
- Connection pooling for database
- Goroutine-per-room architecture
- Configurable timeouts and limits
