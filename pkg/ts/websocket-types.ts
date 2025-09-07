/**
 * WebSocket Protocol Types for Quiz Realtime Service
 * Generated from Go structs using quicktype
 */

// WebSocket types are available from DOM lib

// Message Types
export const MessageType = {
  // Client to Server
  JOIN: "join",
  CREATE_ROOM: "create_room",
  START: "start",
  ANSWER: "answer",
  KICK: "kick",
  LEAVE: "leave",
  PING: "ping",

  // Server to Client
  STATE: "state",
  QUESTION: "question",
  REVEAL: "reveal",
  SCORE: "score",
  END: "end",
  ERROR: "error",
  PONG: "pong",
  JOINED: "joined",
  LEFT: "left",
  KICKED: "kicked",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// Room States
export const RoomState = {
  LOBBY: "lobby",
  QUESTION: "question",
  REVEAL: "reveal",
  INTERMISSION: "intermission",
  ENDED: "ended",
} as const;

export type RoomStateType = (typeof RoomState)[keyof typeof RoomState];

// Error Codes
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT",
  VALIDATION: "VALIDATION",
  STATE: "STATE",
  ROOM_FULL: "ROOM_FULL",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// Base Message Envelope
export interface Message {
  v: number;
  type: string;
  msg_id: string;
  room_id?: string;
  data: any;
}

// Client Messages
export interface JoinMessage {
  pin: string;
  display_name: string;
}

export interface CreateRoomMessage {
  quiz_id: string;
  settings: QuizSettings;
}

export interface StartMessage {
  // Empty - host starts the quiz
}

export interface AnswerMessage {
  question_index: number;
  choice: string;
}

export interface KickMessage {
  user_id: string;
  reason?: string;
}

export interface LeaveMessage {
  // Empty - user leaves the room
}

export interface PingMessage {
  timestamp: number;
}

// Server Messages
export interface StateMessage {
  phase: string;
  room_id: string;
  pin: string;
  host_id: string;
  question_index: number;
  total_questions: number;
  phase_deadline_ms?: number;
  members: Member[];
  settings: QuizSettings;
}

export interface QuestionMessage {
  index: number;
  question: string;
  options: string[];
  deadline_ms: number;
  duration_ms: number;
}

export interface RevealMessage {
  index: number;
  correct_choice: string;
  correct_index: number;
  explanation?: string;
  user_stats: UserStat[];
  leaderboard: LeaderEntry[];
}

export interface ScoreMessage {
  user_id: string;
  score: number;
  score_delta: number;
  rank: number;
}

export interface EndMessage {
  final_leaderboard: LeaderEntry[];
  quiz_stats: QuizStats;
}

export interface ErrorMessage {
  code: string;
  msg: string;
  details?: string;
}

export interface PongMessage {
  timestamp: number;
}

export interface JoinedMessage {
  user: Member;
}

export interface LeftMessage {
  user_id: string;
  reason?: string;
}

export interface KickedMessage {
  user_id: string;
  reason: string;
}

// Supporting Types
export interface Member {
  id: string;
  display_name: string;
  role: "host" | "player";
  score: number;
  is_online: boolean;
  joined_at: number;
}

export interface UserStat {
  user_id: string;
  display_name: string;
  answer?: string;
  is_correct: boolean;
  time_taken_ms: number;
  score_delta: number;
}

export interface LeaderEntry {
  user_id: string;
  display_name: string;
  score: number;
  rank: number;
  correct_answers: number;
  total_answered: number;
}

export interface QuizSettings {
  question_duration_ms: number;
  show_correctness: boolean;
  show_leaderboard: boolean;
  allow_reconnect: boolean;
}

export interface QuizStats {
  total_questions: number;
  total_participants: number;
  average_score: number;
  completion_rate: number;
  duration_ms: number;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
}

// Room Types
export interface RoomStateData {
  phase: string;
  question_index: number;
  phase_deadline_ms?: number;
  start_time: string;
  user_scores: Record<string, number>;
  user_stats: Record<string, UserStats>;
}

export interface QuizData {
  id: string;
  title: string;
  questions: Question[];
}

export interface Question {
  index: number;
  question: string;
  options: string[];
  correct_answer: string;
  correct_index: number;
  explanation?: string;
}

// Scoring Types
export interface UserStats {
  correct_answers: number;
  total_answered: number;
  average_response_time_ms: number;
  current_streak: number;
  max_streak: number;
}

export interface QuizStatistics {
  total_questions: number;
  total_participants: number;
  average_score: number;
  completion_rate: number;
  duration_ms: number;
}

// Type Guards
export function isJoinMessage(data: any): data is JoinMessage {
  return (
    data &&
    typeof data.pin === "string" &&
    typeof data.display_name === "string"
  );
}

export function isAnswerMessage(data: any): data is AnswerMessage {
  return (
    data &&
    typeof data.question_index === "number" &&
    typeof data.choice === "string"
  );
}

export function isStateMessage(data: any): data is StateMessage {
  return (
    data && typeof data.phase === "string" && typeof data.room_id === "string"
  );
}

export function isQuestionMessage(data: any): data is QuestionMessage {
  return (
    data && typeof data.index === "number" && typeof data.question === "string"
  );
}

export function isRevealMessage(data: any): data is RevealMessage {
  return (
    data &&
    typeof data.index === "number" &&
    typeof data.correct_choice === "string"
  );
}

export function isErrorMessage(data: any): data is ErrorMessage {
  return data && typeof data.code === "string" && typeof data.msg === "string";
}

// Message Factory Functions
export function createJoinMessage(pin: string, displayName: string): Message {
  return {
    v: 1,
    type: MessageType.JOIN,
    msg_id: generateMessageId(),
    data: { pin, display_name: displayName },
  };
}

export function createAnswerMessage(
  questionIndex: number,
  choice: string
): Message {
  return {
    v: 1,
    type: MessageType.ANSWER,
    msg_id: generateMessageId(),
    data: { question_index: questionIndex, choice },
  };
}

export function createPingMessage(): Message {
  return {
    v: 1,
    type: MessageType.PING,
    msg_id: generateMessageId(),
    data: { timestamp: Date.now() },
  };
}

export function createStartMessage(): Message {
  return {
    v: 1,
    type: MessageType.START,
    msg_id: generateMessageId(),
    data: {},
  };
}

export function createLeaveMessage(): Message {
  return {
    v: 1,
    type: MessageType.LEAVE,
    msg_id: generateMessageId(),
    data: {},
  };
}

// Utility Functions
function generateMessageId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// WebSocket Connection Types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  token?: string;
}

/**
 * WebSocket Authentication Requirements:
 *
 * The Go WebSocket service requires Auth0 authentication for all connections.
 * Authentication is handled via the appSession cookie set by the Express API.
 *
 * Authentication Flow:
 * 1. User authenticates with Auth0 via the Express API
 * 2. Express API sets appSession cookie with Auth0 session data
 * 3. WebSocket connection uses the appSession cookie for authentication
 * 4. Go service verifies the Auth0 session and extracts user information
 *
 * Connection URL:
 * - ws://localhost:8081/ws (uses appSession cookie automatically)
 *
 * Error Responses:
 * - 401 Unauthorized: Invalid or missing Auth0 session
 * - 400 Bad Request: Invalid session format
 */

export interface WebSocketEventHandlers {
  onOpen?: (event: Event) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export class QuizWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: WebSocketEventHandlers;

  constructor(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = config;
    this.handlers = handlers;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.config.token
          ? `${this.config.url}?token=${this.config.token}`
          : this.config.url;

        this.ws = new WebSocket(
          url,
          this.config.protocols || ["quiz-protocol"]
        );

        this.ws.onopen = (event: Event) => {
          this.handlers.onOpen?.(event);
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: Message = JSON.parse(event.data);
            this.handlers.onMessage?.(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onerror = (error: Event) => {
          this.handlers.onError?.(error);
          reject(error);
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.handlers.onClose?.(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message: Message): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}
