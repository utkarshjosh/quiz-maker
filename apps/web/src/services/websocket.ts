import { useWebSocket } from "@/contexts/WebSocketContext";
import { MessageType } from "@quiz-maker/ts";
import type {
  Message,
  QuizSettings,
  CreateRoomMessage,
  JoinMessage,
  AnswerMessage,
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  Member,
  LeaderEntry,
} from "@quiz-maker/ts";

// Use the official message types from @quiz-maker/ts
export { MessageType } from "@quiz-maker/ts";

// Re-export types from the shared package
export type {
  CreateRoomMessage,
  JoinMessage as JoinRoomMessage,
  AnswerMessage as QuizAnswerMessage,
  StateMessage as RoomState,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  Member as User,
  QuizSettings,
} from "@quiz-maker/ts";

// WebSocket Service Hook
export const useWebSocketService = () => {
  const { state, sendMessage } = useWebSocket();

  const createRoom = (quizId: string, settings: QuizSettings) => {
    console.log("Creating room for quiz", quizId, settings);
    const message: Message = {
      v: 1,
      type: MessageType.CREATE_ROOM,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: { quiz_id: quizId, settings },
    };
    sendMessage(message);
  };

  const joinRoom = (pin: string, displayName: string) => {
    const message: Message = {
      v: 1,
      type: MessageType.JOIN,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: { pin, display_name: displayName },
    };
    sendMessage(message);
  };

  const leaveRoom = () => {
    const message: Message = {
      v: 1,
      type: MessageType.LEAVE,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const startQuiz = () => {
    const message: Message = {
      v: 1,
      type: MessageType.START,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const submitAnswer = (questionIndex: number, choice: string) => {
    const message: Message = {
      v: 1,
      type: MessageType.ANSWER,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: { question_index: questionIndex, choice },
    };
    sendMessage(message);
  };

  const endQuiz = () => {
    const message: Message = {
      v: 1,
      type: MessageType.END,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const sendPing = () => {
    const message: Message = {
      v: 1,
      type: MessageType.PING,
      msg_id: Math.random().toString(36).substr(2, 9),
      data: { timestamp: Date.now() },
    };
    sendMessage(message);
  };

  return {
    // Connection state
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastMessage: state.lastMessage,

    // Room actions
    createRoom,
    joinRoom,
    leaveRoom,

    // Quiz actions
    startQuiz,
    submitAnswer,
    endQuiz,

    // Utility
    sendPing,
  };
};

// Message parsing utilities
export const parseMessage = (message: Message): unknown => {
  try {
    return message.data;
  } catch (error) {
    console.error("Failed to parse message data:", error);
    return null;
  }
};

export const isRoomMessage = (message: Message): boolean => {
  return message.type.startsWith("room:");
};

export const isQuizMessage = (message: Message): boolean => {
  return message.type.startsWith("quiz:");
};

export const isUserMessage = (message: Message): boolean => {
  return message.type.startsWith("user:");
};

export const isScoreMessage = (message: Message): boolean => {
  return (
    message.type.startsWith("score:") || message.type.startsWith("leaderboard:")
  );
};
