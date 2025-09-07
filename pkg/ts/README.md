# Quiz Maker TypeScript Types

This package contains TypeScript type definitions and utilities for the Quiz Maker application, generated from Go structs using quicktype.

## Files

- `websocket-types.ts` - WebSocket protocol types and utilities
- `types.ts` - Additional common types for the application
- `index.ts` - Main export file
- `quiz.ts` - Legacy quiz types (existing)

## Usage

### Basic Import

```typescript
import { Message, JoinMessage, AnswerMessage } from "@quiz-maker/ts";
```

### WebSocket Types

```typescript
import {
  MessageType,
  RoomState,
  ErrorCode,
  createJoinMessage,
  createAnswerMessage,
  QuizWebSocket,
} from "@quiz-maker/ts";

// Create messages
const joinMsg = createJoinMessage("123456", "Test User");
const answerMsg = createAnswerMessage(0, "A");

// Use WebSocket client
const ws = new QuizWebSocket(
  { url: "ws://localhost:8080/ws" },
  {
    onMessage: (message) => {
      console.log("Received:", message);
    },
  }
);
```

### Type Guards

```typescript
import { isJoinMessage, isAnswerMessage } from "@quiz-maker/ts";

if (isJoinMessage(data)) {
  // data is now typed as JoinMessage
  console.log(data.pin, data.display_name);
}
```

## Generated Types

### Message Types

- `Message` - Base message envelope
- `JoinMessage` - Join room request
- `AnswerMessage` - Answer submission
- `StateMessage` - Room state update
- `QuestionMessage` - Question broadcast
- `RevealMessage` - Answer reveal
- `ErrorMessage` - Error response

### Supporting Types

- `Member` - Room participant
- `User` - User information
- `QuizData` - Quiz structure
- `Question` - Individual question
- `QuizSettings` - Quiz configuration
- `LeaderEntry` - Leaderboard entry

### Constants

- `MessageType` - Message type constants
- `RoomState` - Room state constants
- `ErrorCode` - Error code constants

## Building

```bash
npm run build
```

This will compile TypeScript to JavaScript and generate declaration files in the `dist/` directory.

## Development

```bash
npm run dev  # Watch mode compilation
npm run lint # Lint TypeScript files
```

## Integration

These types are designed to be shared between:

- Frontend React/TypeScript applications
- Backend Node.js services
- WebSocket clients and servers

The types ensure type safety across the entire application stack.
