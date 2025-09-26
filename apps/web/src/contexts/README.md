# WebSocket Integration

This directory contains the WebSocket integration for the React frontend, using shared types from the `@quiz-maker/ts` package.

## Files

- `WebSocketContext.tsx` - Main WebSocket context provider
- `README.md` - This documentation

## Usage

### 1. Basic Setup

#### Option A: With Authentication (Recommended)

Use the `AuthenticatedWebSocketProvider` for automatic JWT handling:

```tsx
import { AuthenticatedWebSocketProvider } from "@/contexts/AuthenticatedWebSocketProvider";

function App() {
  return (
    <AuthenticatedWebSocketProvider url="ws://localhost:5000/ws">
      {/* Your app components */}
    </AuthenticatedWebSocketProvider>
  );
}
```

#### Option B: Manual Authentication

Use the base `WebSocketProvider` directly (requires Auth0 authentication):

```tsx
import { WebSocketProvider } from "@/contexts/WebSocketContext";

function App() {
  return (
    <WebSocketProvider url="ws://localhost:5000/ws">
      {/* Your app components */}
    </WebSocketProvider>
  );
}
```

### 2. Using the WebSocket Context

```tsx
import { useWebSocket } from "@/contexts/WebSocketContext";

function MyComponent() {
  const { state, joinRoom, sendAnswer, startQuiz, leaveRoom, ping } =
    useWebSocket();

  const handleJoin = () => {
    joinRoom("123456", "Player Name");
  };

  const handleAnswer = () => {
    sendAnswer(0, "Option A");
  };

  return (
    <div>
      <p>Status: {state.isConnected ? "Connected" : "Disconnected"}</p>
      <button onClick={handleJoin}>Join Room</button>
      <button onClick={handleAnswer}>Send Answer</button>
    </div>
  );
}
```

### 3. Type-Safe Message Handling

Use the `useWebSocketMessages` hook for type-safe message handling:

```tsx
import { useWebSocketMessages } from "@/hooks/useWebSocketMessages";
import type {
  StateMessage,
  QuestionMessage,
  ErrorMessage,
} from "@quiz-maker/ts";

function QuizComponent() {
  const messageHandlers = {
    onState: (message: StateMessage) => {
      console.log("Room state:", message);
    },
    onQuestion: (message: QuestionMessage) => {
      console.log("New question:", message);
    },
    onError: (message: ErrorMessage) => {
      console.error("Error:", message.msg);
    },
  };

  const { isConnected, error } = useWebSocketMessages(messageHandlers);

  return (
    <div>
      {isConnected ? "Connected" : "Disconnected"}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## Available Methods

### WebSocket Context Methods

- `joinRoom(pin: string, displayName: string)` - Join a quiz room
- `sendAnswer(questionIndex: number, choice: string)` - Send an answer
- `startQuiz()` - Start the quiz (host only)
- `leaveRoom()` - Leave the current room
- `ping()` - Send a ping message
- `sendMessage(message: Message)` - Send a custom message
- `connect()` - Manually connect
- `disconnect()` - Manually disconnect

### Message Handlers

The `useWebSocketMessages` hook supports these message handlers:

- `onState` - Room state updates
- `onQuestion` - New question received
- `onReveal` - Answer revealed
- `onError` - Error messages
- `onJoined` - User joined room
- `onLeft` - User left room
- `onKicked` - User kicked from room
- `onScore` - Score updates
- `onEnd` - Quiz ended
- `onPong` - Ping response
- `onUnknown` - Unknown message types

## Message Types

All message types are imported from `@quiz-maker/ts`:

```tsx
import type {
  Message,
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  JoinMessage,
  AnswerMessage,
  // ... other types
} from "@quiz-maker/ts";
```

## Authentication

The WebSocket service requires Auth0 authentication for all connections. The authentication is handled automatically via the `appSession` cookie set by the Express API.

### Auth0 Authentication Flow

1. User authenticates with Auth0 via the Express API
2. Express API sets `appSession` cookie with Auth0 session data
3. WebSocket connection automatically uses the `appSession` cookie
4. Go service verifies the Auth0 session and extracts user information

### Authentication Integration

The WebSocket context integrates with the Auth0 context:

```tsx
import { useAuth } from "@/auth/AuthContext";

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();

  // Check authentication status
  // Use login() to authenticate with Auth0
  // Use logout() to sign out
}
```

## Configuration

The WebSocketProvider accepts these props:

- `url` - WebSocket URL (default: "ws://localhost:5000/ws")
- `children` - React children

The AuthenticatedWebSocketProvider accepts these props:

- `url` - WebSocket URL (default: "ws://localhost:5000/ws")
- `requireAuth` - Whether authentication is required (default: true)
- `children` - React children

## Error Handling

The context automatically handles:

- Connection errors
- Reconnection attempts (up to 5 times with exponential backoff)
- Message parsing errors
- Send failures

## Example Component

See `WebSocketExample.tsx` for a complete example of how to use the WebSocket integration.

## Type Safety

All WebSocket messages are fully typed using the shared types from `@quiz-maker/ts`. This ensures:

- Compile-time type checking
- IntelliSense support
- Runtime type guards for message validation
- Consistent types between frontend and backend
