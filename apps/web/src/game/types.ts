/**
 * Game Types - Core type definitions for the quiz game
 * Unity-style: All game types in one place for easy reference
 */

export type GameScene = "lobby" | "quiz" | "leaderboard";

export type GameStatus = "idle" | "waiting" | "playing" | "finished";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost?: boolean;
  isReady?: boolean;
  role?: "host" | "player"; // Role from backend
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  answer: string;
  timeLimit: number;
}

export interface QuizSettings {
  questionDurationMs: number;
  showCorrectness: boolean;
  showLeaderboard: boolean;
  allowReconnect: boolean;
}

export interface GameSettings {
  sound: boolean;
  music: boolean;
  volume: number;
}

export interface RoomInfo {
  id: string;
  pin: string;
  quizId: string;
  hostId: string;
  settings: QuizSettings;
}

/**
 * Main Game State - Single source of truth for the entire game
 * This replaces the scattered state across multiple files
 */
export interface GameState {
  // Scene Management
  currentScene: GameScene;
  status: GameStatus;

  // Room & Connection
  room: RoomInfo | null;
  isHost: boolean;

  // Players
  players: Player[];
  currentPlayerId: string | null;

  // Quiz Progress
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  answers: Map<number, string>; // questionIndex -> selected answer

  // UI State
  settings: GameSettings;
  isLoading: boolean;
  error: string | null;

  // Timing
  questionStartTime: number | null;
  timeRemaining: number;
}

/**
 * Game Events - Events that can be emitted by the game system
 */
export enum GameEvent {
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  QUIZ_STARTED = "quiz_started",
  QUESTION_STARTED = "question_started",
  ANSWER_SUBMITTED = "answer_submitted",
  QUESTION_ENDED = "question_ended",
  QUIZ_ENDED = "quiz_ended",
  ERROR_OCCURRED = "error_occurred",
}

export interface GameEventPayload {
  [GameEvent.PLAYER_JOINED]: { player: Player };
  [GameEvent.PLAYER_LEFT]: { playerId: string };
  [GameEvent.QUIZ_STARTED]: { questionCount: number };
  [GameEvent.QUESTION_STARTED]: { question: Question; index: number };
  [GameEvent.ANSWER_SUBMITTED]: { playerId: string; answer: string };
  [GameEvent.QUESTION_ENDED]: { correctAnswer: string };
  [GameEvent.QUIZ_ENDED]: { finalScores: Player[] };
  [GameEvent.ERROR_OCCURRED]: { message: string; code?: string };
}
