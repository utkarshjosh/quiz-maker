# Game Architecture - Unity-Style Clean Code

This directory contains the core game system for the quiz application, following Unity-style patterns for clean game development.

## 🎯 Design Philosophy

1. **Single Source of Truth**: One centralized game state (Zustand)
2. **Decoupled Services**: WebSocket logic separated from React components
3. **Manager Pattern**: Game Manager orchestrates business logic
4. **Clean Components**: UI components only handle presentation

## 📁 Directory Structure

```
game/
├── types.ts                    # All game-related TypeScript types
├── store/
│   └── gameStore.ts           # Zustand store (single game state)
├── services/
│   └── WebSocketService.ts   # Pure WebSocket service (no React)
├── managers/
│   └── GameManager.ts         # Business logic & state synchronization
├── hooks/
│   └── useGameManager.ts      # React integration hooks
└── index.ts                    # Public API exports
```

## 🏗️ Architecture Layers

### Layer 1: Types (`types.ts`)
- **Purpose**: Define all game data structures
- **Contains**: Player, Question, GameState, Events, etc.
- **Unity Analogy**: Like Unity's `MonoBehaviour` base classes

### Layer 2: Store (`store/gameStore.ts`)
- **Purpose**: Centralized state management using Zustand
- **Why Zustand**: 
  - Lightweight (perfect for games)
  - No provider hell
  - DevTools integration
  - Better than TanStack Query for client-side game state
- **Unity Analogy**: Like Unity's `GameManager` singleton

### Layer 3: Services (`services/WebSocketService.ts`)
- **Purpose**: Pure TypeScript WebSocket communication
- **Key Features**:
  - Singleton pattern
  - No React dependencies
  - Observable pattern (subscribe to messages/status)
  - Auto-reconnection with exponential backoff
  - Ping/pong keep-alive
- **Unity Analogy**: Like Unity's `NetworkManager`

### Layer 4: Managers (`managers/GameManager.ts`)
- **Purpose**: Bridge between WebSocket and Game State
- **Responsibilities**:
  - Handle WebSocket messages
  - Update game state
  - Implement game business logic
  - Coordinate scene transitions
- **Unity Analogy**: Like Unity's game controllers/managers

### Layer 5: Hooks (`hooks/useGameManager.ts`)
- **Purpose**: React integration layer
- **Hooks**:
  - `useGameManager()` - Initialize game system
  - `useGameActions()` - Access game actions
- **Unity Analogy**: Like Unity's component interface

## 🎮 Usage Guide

### Initialize the Game System

In your root component (e.g., `pages/immersive/index.tsx`):

```tsx
import { useGameManager } from '@/game';

function ImmersiveCanvas() {
  // Initialize game system (call once at root)
  useGameManager();
  
  // Your component code...
}
```

### Access Game State

Use Zustand selectors for optimal performance:

```tsx
import { useGameStore, usePlayers, useRoomPin } from '@/game';

function MyComponent() {
  // Get specific data (prevents unnecessary re-renders)
  const players = usePlayers();
  const roomPin = useRoomPin();
  
  // Or use the full store
  const { currentScene, status } = useGameStore((state) => ({
    currentScene: state.currentScene,
    status: state.status,
  }));
}
```

### Perform Game Actions

```tsx
import { useGameActions } from '@/game';

function LobbyComponent() {
  const { createRoom, joinRoom, startQuiz } = useGameActions();
  
  const handleCreate = () => {
    createRoom('quiz-123');
  };
  
  const handleJoin = () => {
    joinRoom('ABC123', 'PlayerName');
  };
  
  const handleStart = () => {
    startQuiz();
  };
}
```

### Subscribe to WebSocket Events

For advanced use cases:

```tsx
import { getWebSocketService } from '@/game';

function MyComponent() {
  const wsService = getWebSocketService();
  
  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = wsService.onStatusChange((status) => {
      console.log('Connection status:', status);
    });
    
    return unsubscribe;
  }, []);
}
```

## 🔄 Data Flow

```
User Action
    ↓
Component calls useGameActions()
    ↓
GameManager method
    ↓
WebSocketService.send()
    ↓
Server
    ↓
WebSocketService receives message
    ↓
GameManager.handleMessage()
    ↓
useGameStore.setState()
    ↓
Components re-render (via Zustand)
```

## 🎨 Key Benefits

### 1. **No More Provider Hell**
```tsx
// ❌ OLD WAY - Provider hell
<AuthProvider>
  <WebSocketProvider>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </WebSocketProvider>
</AuthProvider>

// ✅ NEW WAY - Clean
<App />
```

### 2. **Single Source of Truth**
```tsx
// ❌ OLD WAY - State scattered everywhere
const [players, setPlayers] = useState([]);
const { data: gameState } = useQuery(...);
const { wsState } = useWebSocket();

// ✅ NEW WAY - One place
const { players, room, status } = useGameStore();
```

### 3. **Decoupled Logic**
```tsx
// ❌ OLD WAY - Tightly coupled
function Component() {
  const { sendMessage } = useWebSocket();
  
  const handleAction = () => {
    // Component knows about WebSocket details
    sendMessage({
      type: 'join',
      data: { ... }
    });
  };
}

// ✅ NEW WAY - Clean abstraction
function Component() {
  const { joinRoom } = useGameActions();
  
  const handleAction = () => {
    // Component doesn't care about WebSocket
    joinRoom(pin, name);
  };
}
```

### 4. **Testable Code**
```tsx
// Pure service - easy to test
const wsService = new WebSocketService(config);
wsService.onMessage((msg) => console.log(msg));

// Manager - easy to test
const manager = new GameManager();
manager.createRoom('quiz-123');
```

## 🚀 Performance Optimizations

### Zustand Selectors
Prevent unnecessary re-renders by selecting only what you need:

```tsx
// ❌ BAD - Re-renders on ANY state change
const gameState = useGameStore();

// ✅ GOOD - Re-renders only when players change
const players = useGameStore((state) => state.players);

// ✅ EVEN BETTER - Use provided selectors
const players = usePlayers();
```

### Memoization
Game actions are automatically memoized in the manager.

### WebSocket Batching
The service automatically batches messages when needed.

## 🔧 Debugging

### Zustand DevTools
Open Redux DevTools in Chrome to see state changes:
- Time-travel debugging
- State inspection
- Action history

### WebSocket Logs
All WebSocket events are logged with `[WebSocket]` prefix.

### Game Manager Logs
All game logic is logged with `[GameManager]` prefix.

## 📝 Migration Guide

### From Old Architecture

1. **Remove old hooks**:
   - Delete `hooks/immersive/useGameStore.ts` (TanStack Query version)
   - Keep only the new `/game` directory

2. **Update imports**:
   ```tsx
   // ❌ OLD
   import { useGameStore } from '@/hooks/immersive/useGameStore';
   import { useWebSocketService } from '@/services/websocket';
   
   // ✅ NEW
   import { useGameStore, useGameActions } from '@/game';
   ```

3. **Update state usage**:
   ```tsx
   // ❌ OLD
   const { gameState, setGameState } = useGameStore();
   setGameState((prev) => ({ ...prev, players: [...] }));
   
   // ✅ NEW
   const players = usePlayers();
   useGameStore.getState().setPlayers([...]);
   // Or better: let GameManager handle it
   ```

4. **Initialize game system**:
   ```tsx
   // Add to your root immersive component
   useGameManager();
   ```

## 🎯 Best Practices

1. **State Updates**: Let GameManager handle state updates from WebSocket
2. **Component Actions**: Use `useGameActions()` for user-triggered actions
3. **Selectors**: Always use selectors to prevent unnecessary re-renders
4. **Type Safety**: Import types from `@/game/types`
5. **Logging**: Use consistent log prefixes for debugging

## 🐛 Common Issues

### WebSocket Not Connecting
- Ensure `useGameManager()` is called in root component
- Check authentication status
- Verify WebSocket URL in service configuration

### State Not Updating
- Check if GameManager is initialized
- Verify WebSocket messages are being received
- Check Zustand DevTools for state changes

### Performance Issues
- Use selectors instead of full state
- Check if you're subscribing to too much state
- Verify unnecessary re-renders with React DevTools

## 📚 Further Reading

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Unity Design Patterns](https://unity.com/how-to/design-patterns)
- [WebSocket Best Practices](https://www.html5rocks.com/en/tutorials/websockets/basics/)

---

**Created**: November 2025
**Architecture**: Unity-style clean game development
**State Management**: Zustand
**Communication**: WebSocket Service


