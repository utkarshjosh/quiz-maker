// Shared TypeScript types for the Quiz AI System

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: Question[];
  totalQuestions: number;
  createdAt: Date;
  createdBy?: string;
  tags: string[];
}

export interface Question {
  id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
}

export interface QuizRoom {
  id: string;
  quizId: string;
  hostId: string;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  createdAt: Date;
  players: Player[];
}

export interface Player {
  id: string;
  name: string;
  sessionId: string;
  score: number;
  joinedAt: Date;
  answers: Record<string, Answer>;
  isConnected: boolean;
}

export interface Answer {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  answeredAt: Date;
  timeTaken: number; // in seconds
}

export interface QuizState {
  roomId: string;
  currentQuestion: number;
  totalQuestions: number;
  timeLeft: number;
  status: 'waiting' | 'question' | 'results' | 'finished';
  questionStarted: Date;
  questionTimeLimit: number;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: Date;
  playerId?: string;
}

export type WebSocketMessageType = 
  | 'join'
  | 'leave'
  | 'player_joined'
  | 'player_left'
  | 'quiz_started'
  | 'new_question'
  | 'answer'
  | 'question_result'
  | 'leaderboard'
  | 'quiz_finished'
  | 'error'
  | 'room_deleted';

export interface Leaderboard {
  players: LeaderboardEntry[];
  roomId: string;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageTime: number;
  position: number;
}

export interface QuizGenerationRequest {
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
  timeLimit: number;
}

export interface QuizGenerationResponse {
  success: boolean;
  quiz?: Quiz;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  role: 'user' | 'admin';
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Redis Key Patterns
export const REDIS_KEYS = {
  QUIZ_ROOM: (roomId: string) => `quiz:${roomId}:room`,
  QUIZ_STATE: (roomId: string) => `quiz:${roomId}:state`,
  QUIZ_DATA: (quizId: string) => `quiz:${quizId}:data`,
  PLAYER_ANSWERS: (roomId: string, playerId: string) => `player:${roomId}:${playerId}:answers`,
  PLAYER_SCORES: (roomId: string) => `quiz:${roomId}:scores`,
  QUIZ_CHANNEL: (roomId: string) => `quiz_channel:${roomId}`,
} as const;

// Environment Variables
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  REDIS_URL: string;
  MONGODB_URI: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  API_GATEWAY_URL: string;
  QUIZ_GENERATOR_URL: string;
  REALTIME_SERVICE_URL: string;
}

// Service URLs
export const SERVICE_URLS = {
  API_GATEWAY: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  QUIZ_GENERATOR: process.env.QUIZ_GENERATOR_URL || 'http://localhost:3001',
  REALTIME_SERVICE: process.env.REALTIME_SERVICE_URL || 'http://localhost:8080',
} as const; 