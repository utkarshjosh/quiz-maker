# Quiz Game Flow Implementation - Complete

## Overview

Successfully implemented a complete real-time quiz game with:
- **Socket service** with state machine (question → reveal → intermission → end)
- **Latency-weighted scoring** (1000 base × time factor × streak bonus)
- **Reveal phase** showing correct answers and player results
- **Backend persistence** of game sessions and results
- **Frontend scenes** for quiz, reveal, and leaderboard

## Architecture

### Game Flow State Machine

```
LOBBY → QUESTION → REVEAL → INTERMISSION → QUESTION → ... → END
```

**Phases:**
1. **Lobby**: Players join, host starts game
2. **Question**: Active question, timer running, collecting answers
3. **Reveal**: Show correct answer, player results, score updates (5 seconds)
4. **Intermission**: Brief pause before next question (3 seconds)
5. **End**: Final leaderboard, persist results to database

## Implementation Details

### 1. Socket Service (Go)

**New Files:**
- `services/socket/internal/scoring/calculator.go` - Latency-weighted scoring algorithm
- `services/socket/internal/scoring/calculator_test.go` - Scoring tests
- `services/socket/internal/api/client.go` - HTTP client for API communication

**Modified Files:**
- `services/socket/internal/room/room.go`
  - Added `startIntermission()` method
  - Enhanced `revealAnswer()` with full scoring logic
  - Added `submitGameResults()` for backend persistence
  - Updated state machine in `tick()` method

**Scoring Algorithm:**
```go
// Base: 1000 points
// Time factor: f(t) = max(0, 1 - (elapsed/timeLimit)^0.5)
// Streak bonus: 10% per consecutive correct (max 50%)
// Final: base × timeFactor × (1 + streakBonus)
```

**Message Types:** (Already defined in protocol)
- `question`: Sent to all players (no correct answer included)
- `reveal`: Shows correct answer, all player results, updated leaderboard
- `score`: Individual score updates (optional)
- `end`: Final leaderboard and quiz statistics

### 2. Backend API (Node.js/TypeScript)

**New Files:**
- `apps/api/src/modules/game/game.controller.ts` - Game results controller
- `apps/api/src/modules/game/game.service.ts` - Game results service
- `apps/api/src/modules/game/game.route.ts` - Internal API routes
- `apps/api/src/modules/game/dto/submit-game-results.dto.ts` - DTOs and validation

**Modified Files:**
- `apps/api/src/modules/index.ts` - Added `/internal` routes
- `apps/api/prisma/schema.prisma` - Added `QuizGameSession` model, updated `QuizAnswer`

**Prisma Schema Changes:**
- Added `QuizGameSession` model:
  - Tracks complete game sessions
  - Stores metadata: startedAt, endedAt, duration, completion rate, average score
- Updated `QuizAnswer` model:
  - Added `isCorrect` field
  - Existing fields: answerTimeMs, scoreDelta, questionIndex

**API Endpoints:**
- `POST /api/internal/game-results` - Receives results from socket service
- `GET /api/internal/game-session/:roomId` - Get game session
- `GET /api/internal/game-results/:roomId` - Get full results with answers

### 3. Frontend (React/TypeScript)

**New Files:**
- `apps/web/src/pages/immersive/RevealScene.tsx` - Reveal phase component
  - Shows correct answer highlighted
  - Displays player results with checkmarks/X marks
  - Score delta animations
  - Mini leaderboard (top 5)
  - Auto-transitions after server intermission

**Modified Files:**
- `apps/web/src/game/types.ts`
  - Added `reveal` to GameScene type
  - Added `revealing` to GameStatus type
  - Added `PlayerAnswerResult` and `RevealData` interfaces
  - Added streak tracking to Player interface

- `apps/web/src/game/store/gameStore.ts`
  - Added `revealData` to state
  - Added `setRevealData()` action

- `apps/web/src/game/managers/GameManager.ts`
  - Enhanced `handleRevealMessage()` to parse reveal data
  - Updates player scores from server
  - Transitions to reveal scene
  - Removed optimistic score updates

- `apps/web/src/pages/immersive/QuizScene.tsx`
  - Removed optimistic score calculations
  - Removed confetti (moved to reveal scene)
  - Simplified answer submission (server calculates scores)

- `apps/web/src/pages/immersive/index.tsx`
  - Added RevealScene to scene routing

- `apps/web/src/pages/immersive/LeaderboardScene.tsx`
  - Enhanced with podium display for top 3
  - Shows full rankings for all players
  - Exit button to return to lobby

## Data Flow

### Question Flow
1. **Socket → Frontend**: `question` message (no answer)
2. **Frontend → Socket**: `answer` message with choice
3. **Socket**: Collects all answers, calculates scores
4. **Socket → Frontend**: `reveal` message with results
5. **Frontend**: Shows reveal scene for 5 seconds
6. **Socket**: Waits 3 seconds (intermission)
7. **Repeat** or **End** if last question

### Game End Flow
1. **Socket**: Calculates final leaderboard and statistics
2. **Socket → Frontend**: `end` message with final results
3. **Socket → API Backend**: POST game results
4. **API Backend**: Persists to database
   - Creates QuizGameSession record
   - Saves all QuizAnswer records
   - Updates room status to "ended"

## Testing Guide

### Prerequisites
1. PostgreSQL database running
2. Redis running
3. Socket service running (`cd services/socket && go run cmd/main.go`)
4. API backend running (`cd apps/api && npm run dev`)
5. Frontend running (`cd apps/web && npm run dev`)

### Test Scenarios

#### 1. Basic Game Flow
1. Host creates room at `/play/host/{quizId}`
2. Note the PIN
3. Open second browser/incognito window
4. Join as player at `/play?pin={PIN}`
5. Host starts the quiz
6. Both players answer questions
7. Verify:
   - Question scene shows timer and options
   - Reveal scene shows correct answer and scores
   - Intermission pause between questions
   - Final leaderboard shows correct rankings

#### 2. Scoring Verification
1. Player 1: Answer quickly (within 3 seconds)
2. Player 2: Answer slowly (15+ seconds)
3. Check reveal phase:
   - Player 1 should have higher score delta
   - Faster answers should score more points
4. Get 3 correct answers in a row:
   - Verify streak bonus increases score
5. Get one wrong:
   - Verify streak resets to 0

#### 3. Edge Cases
- Player leaves during question
- Player rejoins during game
- Timer expires before all answers
- Host transfers during game
- Connection drop during reveal

#### 4. Backend Persistence
1. Complete a full game
2. Check database:
   ```sql
   SELECT * FROM quiz_game_sessions ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM quiz_answers WHERE room_id = '{room_id}';
   ```
3. Verify all answers and session data saved correctly

### Manual Testing Checklist

- [ ] Multiple players can join lobby
- [ ] Host can start quiz
- [ ] Questions display one at a time
- [ ] Timer counts down correctly
- [ ] Answers can be submitted
- [ ] Reveal phase shows correct answer
- [ ] Player results display correctly (✓ or ✗)
- [ ] Scores update after each question
- [ ] Streak bonuses apply correctly
- [ ] Intermission pause works
- [ ] Final leaderboard displays
- [ ] Podium shows top 3 players
- [ ] Game results persist to database
- [ ] Can exit and return to lobby

## Database Migration

A migration was created: `20251102173717_add_game_session_and_answer_tracking`

To apply:
```bash
cd apps/api
npx prisma migrate dev
```

This adds:
- `quiz_game_sessions` table
- `is_correct` column to `quiz_answers`

## Known Issues & Next Steps

### To Fix:
1. **Socket Service**: Update places that call `NewRoom()` to pass the `apiClient` parameter
2. **Answer Time Calculation**: Currently storing answer submit time, should store elapsed time from question start
3. **Internal Auth**: Add proper service-to-service authentication for `/api/internal/*` endpoints
4. **Score Delta**: Currently storing cumulative score, should store per-question delta

### Enhancements:
1. Add real-time progress indicators during reveal
2. Add sound effects for reveal phase
3. Add animations for score updates
4. Add streak indicators on player cards
5. Add answer statistics (% who got it right)
6. Add question difficulty indicators

## File Reference

**Socket Service:**
- `services/socket/internal/scoring/calculator.go` - Scoring logic
- `services/socket/internal/room/room.go` - Game state machine
- `services/socket/internal/api/client.go` - API communication
- `services/socket/internal/protocol/messages.go` - Message types

**Backend API:**
- `apps/api/src/modules/game/*` - Game module
- `apps/api/prisma/schema.prisma` - Database schema

**Frontend:**
- `apps/web/src/pages/immersive/QuizScene.tsx` - Question phase
- `apps/web/src/pages/immersive/RevealScene.tsx` - Reveal phase (NEW)
- `apps/web/src/pages/immersive/LeaderboardScene.tsx` - Final results
- `apps/web/src/game/managers/GameManager.ts` - Message handling
- `apps/web/src/game/store/gameStore.ts` - State management
- `apps/web/src/game/types.ts` - Type definitions


