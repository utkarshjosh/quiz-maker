# Quiz Maker - Game Architecture Documentation

## 🎮 Overview

This document describes the clean, Unity-style architecture implemented for the quiz game frontend. The architecture emphasizes decoupling, testability, and maintainability.

## 🏗️ Architecture Principles

### 1. **Single Source of Truth**
- All game state is managed by a single Zustand store
- No scattered state across multiple components
- Predictable data flow

### 2. **Separation of Concerns**
- **State Management**: Zustand store (`/game/store`)
- **Communication**: WebSocket service (`/game/services`)
- **Business Logic**: Game Manager (`/game/managers`)
- **UI**: React components (`/pages/immersive`)

### 3. **Dependency Inversion**
- Components depend on abstractions (hooks), not implementations
- WebSocket service is independent of React
- Easy to test and mock

## 📂 Directory Structure

```
apps/web/src/
├── game/                          # Core game system (NEW)
│   ├── types.ts                   # All game types
│   ├── store/
│   │   └── gameStore.ts          # Zustand state management
│   ├── services/
│   │   └── WebSocketService.ts   # WebSocket communication
│   ├── managers/
│   │   └── GameManager.ts        # Game business logic
│   ├── hooks/
│   │   └── useGameManager.ts     # React integration
│   ├── index.ts                   # Public API
│   └── README.md                  # Detailed documentation
│
├── pages/immersive/               # Game scenes (REFACTORED)
│   ├── index.tsx                  # Main game container
│   ├── LobbyScene.tsx            # Lobby UI
│   ├── QuizScene.tsx             # Quiz UI
│   └── LeaderboardScene.tsx      # Leaderboard UI
│
├── hooks/immersive/               # Legacy (TO BE REMOVED)
│   └── useGameStore.ts           # Old TanStack Query version
│
├── services/                      # Legacy (TO BE REMOVED)
│   └── websocket.ts              # Old WebSocket hook
│
└── contexts/                      # Legacy (TO BE REMOVED)
    └── WebSocketContext.tsx      # Old WebSocket context
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Action                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     React Component                          │
│                  (LobbyScene, QuizScene)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    useGameActions()                          │
│              (createRoom, joinRoom, etc.)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      GameManager                             │
│                  (Business Logic Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   WebSocketService                           │
│                 (Communication Layer)                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Server (Go)                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                        (Response)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   WebSocketService                           │
│              (Receives & Parses Message)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      GameManager                             │
│              (Processes & Updates State)                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Zustand Store                             │
│                   (State Updated)                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  React Components                            │
│                   (Auto Re-render)                           │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Component Responsibilities

### 1. **Game Store** (`game/store/gameStore.ts`)
**What it does**:
- Manages all game state (players, room, questions, etc.)
- Provides selectors for optimal re-rendering
- Persists user settings

**What it doesn't do**:
- ❌ Handle WebSocket communication
- ❌ Contain business logic
- ❌ Make API calls

**Example**:
```tsx
const players = usePlayers();
const roomPin = useRoomPin();
useGameStore.getState().setPlayers([...]);
```

### 2. **WebSocket Service** (`game/services/WebSocketService.ts`)
**What it does**:
- Manages WebSocket connection lifecycle
- Sends and receives messages
- Handles reconnection with exponential backoff
- Implements ping/pong keep-alive
- Provides observable pattern for subscriptions

**What it doesn't do**:
- ❌ Update game state directly
- ❌ Contain React code
- ❌ Handle game business logic

**Example**:
```tsx
const wsService = getWebSocketService();
wsService.send(message);
wsService.onMessage((msg) => console.log(msg));
```

### 3. **Game Manager** (`game/managers/GameManager.ts`)
**What it does**:
- Bridges WebSocket and game state
- Processes incoming WebSocket messages
- Updates Zustand store based on messages
- Implements game business logic
- Manages scene transitions

**What it doesn't do**:
- ❌ Render UI
- ❌ Contain React hooks
- ❌ Handle user input directly

**Example**:
```tsx
const manager = getGameManager();
manager.createRoom('quiz-123');
```

### 4. **React Components** (`pages/immersive/`)
**What they do**:
- Render UI
- Handle user interactions
- Subscribe to relevant game state
- Call game actions via hooks

**What they don't do**:
- ❌ Manage WebSocket connections
- ❌ Process game logic
- ❌ Update state directly (except local UI state)

**Example**:
```tsx
function LobbyScene() {
  const players = usePlayers();
  const { createRoom } = useGameActions();
  
  return <div>{/* UI */}</div>;
}
```

## 🔌 WebSocket Integration

### Old Architecture (DEPRECATED)
```tsx
// ❌ Complex provider hell
<WebSocketProvider>
  <Component />
</WebSocketProvider>

// ❌ Tightly coupled
const { sendMessage } = useWebSocket();
sendMessage({ type: 'join', data: {...} });
```

### New Architecture (CURRENT)
```tsx
// ✅ No providers needed
<Component />

// ✅ Clean abstraction
const { joinRoom } = useGameActions();
joinRoom(pin, name);
```

## 📊 State Management Comparison

### Old Architecture (DEPRECATED)
```tsx
// Using TanStack Query (wrong tool for the job)
const { data: gameState } = useQuery({
  queryKey: ['game-state'],
  queryFn: () => defaultState,
  staleTime: Infinity,
});

const setGameState = useCallback((updater) => {
  queryClient.setQueryData(['game-state'], updater);
}, [queryClient]);
```

**Problems**:
- TanStack Query is for server state, not client state
- Unnecessary complexity
- Poor performance for real-time updates
- Requires query client provider

### New Architecture (CURRENT)
```tsx
// Using Zustand (perfect for games)
const players = usePlayers();
useGameStore.getState().setPlayers([...]);
```

**Benefits**:
- ✅ Designed for client state
- ✅ Minimal boilerplate
- ✅ Excellent performance
- ✅ No provider needed
- ✅ DevTools integration
- ✅ Built-in persistence

## 🎨 Scene Management

### Scene Types
1. **Lobby** - Players join and wait
2. **Quiz** - Active gameplay
3. **Leaderboard** - Results display

### Scene Transitions
```tsx
// Automatic via WebSocket messages
handleStartMessage() → setScene('quiz')
handleEndMessage() → setScene('leaderboard')

// Or manual
useGameStore.getState().setScene('lobby');
```

### Scene Components
Each scene is a self-contained React component that:
- Reads from game store
- Uses game actions for interactions
- Handles its own UI state (animations, etc.)

## 🚀 Performance Optimizations

### 1. **Zustand Selectors**
```tsx
// ❌ BAD - Re-renders on any state change
const gameState = useGameStore();

// ✅ GOOD - Only re-renders when players change
const players = useGameStore((state) => state.players);

// ✅ BEST - Use provided selector
const players = usePlayers();
```

### 2. **Component Memoization**
```tsx
// Memoize expensive child components
const PlayerCard = React.memo(({ player }) => {
  return <div>{player.name}</div>;
});
```

### 3. **WebSocket Batching**
The WebSocket service automatically handles message queuing and batching.

## 🧪 Testing Strategy

### Unit Tests
```tsx
// Test pure functions
describe('GameManager', () => {
  it('should handle player join', () => {
    const manager = new GameManager();
    manager.handleJoinedMessage(mockData);
    expect(useGameStore.getState().players).toHaveLength(1);
  });
});
```

### Integration Tests
```tsx
// Test component integration
describe('LobbyScene', () => {
  it('should display players', () => {
    useGameStore.setState({ players: mockPlayers });
    render(<LobbyScene />);
    expect(screen.getByText('Player 1')).toBeInTheDocument();
  });
});
```

### E2E Tests
```tsx
// Test full user flows
describe('Quiz Flow', () => {
  it('should complete quiz successfully', async () => {
    // Create room → Join → Start → Answer → View results
  });
});
```

## 🐛 Debugging Guide

### 1. **Zustand DevTools**
Open Redux DevTools to see:
- Current state
- Action history
- Time-travel debugging

### 2. **Console Logs**
All logs are prefixed:
- `[WebSocket]` - Connection/message logs
- `[GameManager]` - Business logic logs
- `[useGameManager]` - Initialization logs

### 3. **React DevTools**
Use Component Inspector to:
- View props/state
- Track re-renders
- Profile performance

## 🔄 Migration Checklist

### Phase 1: Core System ✅
- [x] Create game types
- [x] Implement Zustand store
- [x] Create WebSocket service
- [x] Implement Game Manager
- [x] Create React hooks

### Phase 2: Component Refactoring ✅
- [x] Refactor LobbyScene
- [x] Refactor QuizScene
- [x] Update immersive index
- [x] Add documentation

### Phase 3: Cleanup 🚧
- [ ] Remove old useGameStore (TanStack Query)
- [ ] Remove old WebSocketContext
- [ ] Remove old websocket.ts service
- [ ] Update all remaining components
- [ ] Remove old imports

### Phase 4: Testing 📝
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Performance testing

## 📚 Key Files

### Must Read
1. `/game/README.md` - Detailed architecture guide
2. `/game/types.ts` - All type definitions
3. `/game/store/gameStore.ts` - State management
4. `/game/managers/GameManager.ts` - Business logic

### Reference
1. `/game/services/WebSocketService.ts` - WebSocket impl
2. `/game/hooks/useGameManager.ts` - React integration
3. `/pages/immersive/LobbyScene.tsx` - Example usage

## 🎓 Learning Resources

### Zustand
- [Official Docs](https://docs.pmnd.rs/zustand)
- [Recipes](https://docs.pmnd.rs/zustand/guides/recipes)
- [TypeScript Guide](https://docs.pmnd.rs/zustand/guides/typescript)

### Unity Patterns
- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Unity Design Patterns](https://unity.com/how-to/design-patterns)

### WebSocket
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [WebSocket Best Practices](https://www.html5rocks.com/en/tutorials/websockets/basics/)

## 🤝 Contributing

When adding new features:

1. **Add types** to `game/types.ts`
2. **Add state** to `game/store/gameStore.ts`
3. **Add actions** to `game/managers/GameManager.ts`
4. **Add hooks** if needed in `game/hooks/`
5. **Update components** to use new functionality

## 📋 TODO / Future Improvements

### High Priority
- [ ] Add error boundary for game system
- [ ] Implement offline queue for messages
- [ ] Add connection quality indicator
- [ ] Implement reconnection with state recovery

### Medium Priority
- [ ] Add analytics tracking
- [ ] Implement replay system
- [ ] Add spectator mode
- [ ] Performance monitoring

### Low Priority
- [ ] Add sound manager
- [ ] Implement theme system
- [ ] Add accessibility features
- [ ] Internationalization (i18n)

---

**Last Updated**: November 2025  
**Architecture**: Unity-style clean game development  
**Status**: ✅ Core implementation complete, cleanup in progress

