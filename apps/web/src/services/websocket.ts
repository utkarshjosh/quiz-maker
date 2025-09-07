import { useWebSocket } from "@/contexts/WebSocketContext";
import type { Message, MessageType, QuizSettings } from "@quiz-maker/ts";

// Use the official message types from @quiz-maker/ts
export { MessageType } from "@quiz-maker/ts";

// Message Interfaces - using official types
export interface CreateRoomMessage {
  quiz_id: string;
  settings: QuizSettings;
}

export interface JoinRoomMessage {
  pin: string;
  display_name: string;
}

export interface QuizAnswerMessage {
  question_index: number;
  choice: string;
}

export interface RoomState {
  id: string;
  pin: string;
  hostId: string;
  quizId: string;
  phase: "waiting" | "playing" | "finished";
  questionIndex: number;
  phaseDeadline?: number;
  startTime?: string;
  userScores: Record<string, number>;
  userStats: Record<string, unknown>;
}

export interface User {
  id: string;
  displayName: string;
  role: "host" | "participant";
  joinedAt: string;
  isOnline: boolean;
  score: number;
}

export interface QuizData {
  id: string;
  title: string;
  questions: Array<{
    index: number;
    question: string;
    options: string[];
    correctAnswer: string;
    correctIndex: number;
    explanation?: string;
  }>;
}

// WebSocket Service Hook
export const useWebSocketService = () => {
  const { state, sendMessage } = useWebSocket();

  const createRoom = (data: CreateRoomMessage) => {
    const message: Message = {
      v: 1,
      type: "create_room",
      msg_id: Math.random().toString(36).substr(2, 9),
      data,
    };
    sendMessage(message);
  };

  const joinRoom = (data: JoinRoomMessage) => {
    const message: Message = {
      v: 1,
      type: "join",
      msg_id: Math.random().toString(36).substr(2, 9),
      data,
    };
    sendMessage(message);
  };

  const leaveRoom = () => {
    const message: Message = {
      v: 1,
      type: "leave",
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const startQuiz = () => {
    const message: Message = {
      v: 1,
      type: "start",
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const submitAnswer = (data: QuizAnswerMessage) => {
    const message: Message = {
      v: 1,
      type: "answer",
      msg_id: Math.random().toString(36).substr(2, 9),
      data,
    };
    sendMessage(message);
  };

  const endQuiz = () => {
    const message: Message = {
      v: 1,
      type: "end",
      msg_id: Math.random().toString(36).substr(2, 9),
      data: {},
    };
    sendMessage(message);
  };

  const sendPing = () => {
    const message: Message = {
      v: 1,
      type: "ping",
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
