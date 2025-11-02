# Integration Fixes Needed

Before running the game, these integrations need to be completed:

## 1. Socket Service - Update Room Creation Calls

The `NewRoom()` function signature was updated to include `apiClient`:

```go
func NewRoom(quizID, hostID string, quiz *QuizData, settings *QuizSettings, 
             store *store.RedisStore, apiClient *api.Client, logger *zap.Logger) (*Room, error)
```

**Files to update:**

### `services/socket/internal/gateway/websocket.go`

Find where `NewRoom()` is called and add the API client parameter.

**Example:**
```go
// In handleStart or handleCreateRoom:
apiClient := api.NewClient("http://localhost:3000", os.Getenv("JWT_SECRET"), logger)
room, err := room.NewRoom(quizID, hostID, quiz, settings, store, apiClient, logger)
```

### `services/socket/internal/server/server.go` or main initialization

Ensure the API client is created and passed to room creation:

```go
// Create API client (add to server initialization)
apiClient := api.NewClient(
    os.Getenv("API_BASE_URL"), // Default: http://localhost:3000
    os.Getenv("JWT_SECRET"),
    logger,
)
```

## 2. Socket Service - Handler Integration

The old `internal/handlers/quiz.go` has compilation errors because it uses legacy models.

**Options:**
- **A)** Remove `internal/handlers/quiz.go` if not used (recommended)
- **B)** Update it to use the new room package and models

**To remove:**
```bash
cd services/socket
rm internal/handlers/quiz.go
```

## 3. Frontend - WebSocket Service Start Message

Ensure the WebSocketService has a `startQuiz()` method:

**In `apps/web/src/game/services/WebSocketService.ts`:**
```typescript
startQuiz(): void {
  this.send({
    v: 1,
    type: MessageType.START,
    msg_id: this.generateMessageId(),
    data: {},
  });
}
```

## 4. Socket Service - Quiz Data Loading

When a room is created, the socket service needs to load quiz data from the API.

**In `services/socket/internal/gateway/websocket.go`:**

```go
// In handleCreateRoom, after validating quizID:
quiz, err := c.roomRepo.GetQuiz(createMsg.QuizID)
if err != nil {
    c.sendError(protocol.ErrorCodeNotFound, "Quiz not found")
    return
}

// Convert to room.QuizData format
roomQuiz := &room.QuizData{
    ID:        quiz.ID,
    Title:     quiz.Title,
    Questions: convertQuestions(quiz), // Need to implement conversion
}

// Then create room with quiz data
room, err := room.NewRoom(createMsg.QuizID, c.userID, roomQuiz, settings, store, apiClient, c.logger)
```

## 5. Database Migration Application

Apply the Prisma migration:

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

This will create the `quiz_game_sessions` table and add the `is_correct` column to `quiz_answers`.

## 6. Environment Variables

Ensure these environment variables are set:

**Socket Service (`.env` in `services/socket/`):**
```env
API_BASE_URL=http://localhost:3000
JWT_SECRET=your-shared-jwt-secret
```

**API Backend (`.env` in `apps/api/`):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/quiz_maker_db
JWT_SECRET=your-shared-jwt-secret
```

## Quick Fix Commands

```bash
# 1. Remove legacy handlers
cd /home/ongraph/CODE/quiz-maker/services/socket
rm -f internal/handlers/quiz.go

# 2. Apply database migration
cd /home/ongraph/CODE/quiz-maker/apps/api
npx prisma migrate dev
npx prisma generate

# 3. Rebuild socket service
cd /home/ongraph/CODE/quiz-maker/services/socket
go build ./cmd/main.go

# 4. Restart services
# Terminal 1:
cd services/socket && go run cmd/main.go

# Terminal 2:
cd apps/api && npm run dev

# Terminal 3:
cd apps/web && npm run dev
```

## Testing After Fixes

1. Navigate to `http://localhost:5173/play/host/{quiz-id}`
2. Open second browser: `http://localhost:5173/play?pin={PIN}`
3. Host clicks "Start Quiz"
4. Both players answer questions
5. Verify:
   - Questions appear one at a time
   - Timer counts down
   - Reveal phase shows after timer expires
   - Scores update correctly
   - Final leaderboard displays

## Next Steps

1. Add score delta calculation per question (not cumulative)
2. Add proper internal service authentication
3. Add more sound effects for reveal phase
4. Add answer statistics (% who got it right)
5. Add question difficulty indicators
6. Add player streak indicators on UI


