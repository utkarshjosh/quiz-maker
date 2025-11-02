# Quiz Game Flow - Visual Diagram

## Complete Game Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          LOBBY PHASE                             │
│  • Players join via PIN                                          │
│  • Host sees all connected players                               │
│  • Host clicks "Start Quiz"                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUESTION PHASE                              │
│  Socket: Broadcasts question (without answer)                   │
│  Frontend: Shows question + timer + 4 options                    │
│  Players: Click answers                                          │
│  Timer: Counts down (30 seconds)                                 │
│  Socket: Collects all answers + timestamps                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Timer expires
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       REVEAL PHASE (5s)                          │
│  Socket:                                                         │
│   • Calculates scores using latency-weighted algorithm          │
│   • Updates player streaks                                       │
│   • Generates leaderboard                                        │
│   • Broadcasts 'reveal' message                                  │
│                                                                  │
│  Frontend:                                                       │
│   • Highlights correct answer (green)                            │
│   • Shows ✓ or ✗ for each player                                │
│   • Animates score deltas (+850, +420, etc.)                    │
│   • Updates leaderboard                                          │
│   • Shows confetti for correct answers                           │
│   • Displays mini leaderboard (top 5)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ After 5 seconds
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTERMISSION PHASE (3s)                       │
│  Socket: Brief pause before next question                        │
│  Frontend: Shows "Next question coming up..."                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    More questions?
                         │
                ┌────────┴────────┐
                │ YES             │ NO
                ▼                 ▼
        Go to QUESTION      Go to END
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         END PHASE                                │
│  Socket:                                                         │
│   • Generates final leaderboard                                  │
│   • Calculates quiz statistics                                   │
│   • Broadcasts 'end' message                                     │
│   • POSTs results to API backend (async)                         │
│                                                                  │
│  API Backend:                                                    │
│   • Creates QuizGameSession record                               │
│   • Saves all QuizAnswer records                                 │
│   • Updates room status to "ended"                               │
│                                                                  │
│  Frontend:                                                       │
│   • Shows final leaderboard                                      │
│   • Podium for top 3 players                                     │
│   • Full rankings for all players                                │
│   • Confetti for winners                                         │
│   • "Exit to Lobby" button                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Score Calculation Example

```
Player A answers Question 1 in 2 seconds (out of 30s)
Current streak: 0

1. Calculate time factor:
   timeFraction = 2000ms / 30000ms = 0.0667
   timeFactor = 1 - (0.0667)^0.5 = 1 - 0.258 = 0.742

2. Calculate streak bonus:
   streakBonus = 0 × 0.10 = 0
   
3. Calculate final score:
   score = 1000 × 0.742 × (1 + 0) = 742 points
   newStreak = 1

Player A answers Question 2 in 3 seconds
Current streak: 1

1. Time factor = 0.687 (slightly slower)
2. Streak bonus = 1 × 0.10 = 0.10 (10%)
3. Score = 1000 × 0.687 × (1 + 0.10) = 756 points
4. New streak = 2

Player A answers Question 3 incorrectly
1. Score = 0
2. Streak = 0 (reset)
```

## Message Sequence Diagram

```
Host          Socket          API           Player 1      Player 2
  │              │              │               │             │
  │─CREATE_ROOM─>│              │               │             │
  │<──STATE─────┤              │               │             │
  │              │              │               │             │
  │              │<────JOIN────────────────────┤             │
  │<──STATE─────┤              │               │             │
  │<──JOINED────┤              │               │             │
  │              │<────JOIN─────────────────────────────────┤
  │<──STATE─────┤              │               │             │
  │<──JOINED────┤              │               │             │
  │              │              │               │             │
  │───START────>│              │               │             │
  │<──QUESTION──┤──────────────────────────────>│             │
  │              │<─────────────────────────────>             │
  │              │              │               │             │
  │              │<───ANSWER───────────────────┤             │
  │              │<───ANSWER────────────────────────────────┤
  │              │              │               │             │
  │              │ (Timer expires, calculate scores)          │
  │              │              │               │             │
  │<───REVEAL───┤──────────────────────────────>│             │
  │              │<─────────────────────────────>             │
  │              │              │               │             │
  │              │ (5s reveal, then 3s intermission)          │
  │              │              │               │             │
  │<─QUESTION───┤──────────────────────────────>│             │
  │              │<─────────────────────────────>             │
  │              │              │               │             │
  │              │ (Repeat for all questions)                 │
  │              │              │               │             │
  │<────END─────┤──────────────────────────────>│             │
  │              │<─────────────────────────────>             │
  │              │              │               │             │
  │              │─POST RESULTS>│               │             │
  │              │<─201 Created─┤               │             │
```

## Database Schema

```sql
-- New table for game sessions
CREATE TABLE quiz_game_sessions (
  id UUID PRIMARY KEY,
  room_id UUID UNIQUE,
  quiz_id UUID,
  host_id UUID,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_ms BIGINT,
  total_questions INTEGER,
  total_players INTEGER,
  completion_rate FLOAT,
  average_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Updated quiz_answers table
ALTER TABLE quiz_answers 
ADD COLUMN is_correct BOOLEAN DEFAULT FALSE;
```

## Frontend Scene Hierarchy

```
ImmersiveCanvas (Main Router)
├── LobbyScene
│   ├── PlayerCard (for each player)
│   ├── QR Code
│   └── Start Quiz Button (host only)
│
├── QuizScene
│   ├── Timer Display
│   ├── Progress Bar
│   ├── Question Text
│   └── Answer Buttons (4 options)
│
├── RevealScene (NEW!)
│   ├── Correct Answer Highlight
│   ├── Current Player Result (✓ or ✗)
│   ├── Score Delta Animation
│   ├── Mini Leaderboard (top 5)
│   └── Auto-progress Indicator
│
└── LeaderboardScene (ENHANCED!)
    ├── Confetti (for winners)
    ├── Podium Display (top 3)
    │   ├── 1st Place (gold, tallest)
    │   ├── 2nd Place (silver)
    │   └── 3rd Place (bronze)
    ├── Full Rankings (rest of players)
    └── Exit Button
```

## Key Design Decisions

1. **Server-Authoritative Scoring** - Frontend doesn't calculate scores, waits for server
2. **Automatic Progression** - Timer-based state transitions, no manual control
3. **Reveal Phase** - 5 seconds to see results, builds anticipation
4. **Intermission** - 3 second pause prevents fatigue, allows scores to sink in
5. **Streak System** - Rewards consistency, adds strategic element
6. **Time-based Scoring** - Fast answers worth more, encourages engagement
7. **Async Backend Persistence** - Non-blocking, game continues even if API fails

## Performance Characteristics

- **Score Calculation**: O(n) where n = number of players
- **Leaderboard Sort**: O(n log n) using Go's efficient sorting
- **Database Writes**: Batch transaction for atomicity
- **Message Broadcasting**: Concurrent delivery to all players
- **Timer Accuracy**: ±100ms (acceptable for quiz games)

## Next Enhancements

1. **Add answer statistics** (% who got it right)
2. **Show streak indicators** on player cards
3. **Add reveal sound effects**
4. **Add score delta per question** (not cumulative)
5. **Add question difficulty tags**
6. **Add player avatars/emojis**
7. **Add chat/reactions** during reveal
8. **Add game replays**


