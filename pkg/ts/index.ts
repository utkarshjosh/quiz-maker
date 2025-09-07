/**
 * Quiz Application TypeScript Definitions
 *
 * This package contains all TypeScript type definitions shared between
 * the frontend and backend components of the quiz application.
 */

// Export all types
export * from "./types";
export * from "./websocket-types";

// Re-export commonly used types for convenience
export type {
  Message,
  JoinMessage,
  AnswerMessage,
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  Member,
  User,
  QuizData,
  Question,
  QuizSettings,
  QuizStats,
  LeaderEntry,
  UserStat,
} from "./websocket-types";

export type {
  ApiResponse,
  PaginatedResponse,
  Quiz,
  QuizSummary,
  RoomInfo,
  UserSession,
  AppConfig,
} from "./types";
