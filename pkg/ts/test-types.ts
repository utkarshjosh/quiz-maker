/**
 * Test file to verify TypeScript types work correctly
 */

import {
  Message,
  JoinMessage,
  AnswerMessage,
  StateMessage,
  QuestionMessage,
  MessageType,
  RoomState,
  ErrorCode,
  createJoinMessage,
  createAnswerMessage,
  createPingMessage,
  QuizWebSocket,
  isJoinMessage,
  isAnswerMessage,
  isStateMessage,
  isQuestionMessage,
  isRevealMessage,
  isErrorMessage,
} from "./index";

// Test message creation
const joinMsg = createJoinMessage("123456", "Test User");
console.log("Join message:", joinMsg);

const answerMsg = createAnswerMessage(0, "A");
console.log("Answer message:", answerMsg);

const pingMsg = createPingMessage();
console.log("Ping message:", pingMsg);

// Test type guards
const testData1 = { pin: "123456", display_name: "Test User" };
console.log("Is join message:", isJoinMessage(testData1));

const testData2 = { question_index: 0, choice: "A" };
console.log("Is answer message:", isAnswerMessage(testData2));

// Test WebSocket class
const ws = new QuizWebSocket(
  { url: "ws://localhost:8080/ws" },
  {
    onOpen: (event) => console.log("WebSocket opened"),
    onMessage: (message) => console.log("Message received:", message),
    onError: (error) => console.error("WebSocket error:", error),
    onClose: (event) => console.log("WebSocket closed"),
  }
);

console.log("WebSocket ready state:", ws.readyState);

// Test constants
console.log("Message types:", MessageType);
console.log("Room states:", RoomState);
console.log("Error codes:", ErrorCode);

export {};
