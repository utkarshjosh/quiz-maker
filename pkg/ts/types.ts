/**
 * Basic Type Definitions for Quiz Application
 * Shared between frontend and backend
 */

// Import WebSocket types first
import type { Question, QuizSettings, User } from "./websocket-types";

// Re-export WebSocket types
export * from "./websocket-types";

// Additional common types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Quiz-specific types
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface QuizSummary {
  id: string;
  title: string;
  description?: string;
  question_count: number;
  created_at: string;
  created_by: string;
}

// Room management types
export interface RoomInfo {
  id: string;
  pin: string;
  quiz_id: string;
  host_id: string;
  status: "waiting" | "active" | "finished";
  participant_count: number;
  created_at: string;
}

// User session types
export interface UserSession {
  user: User;
  token: string;
  refresh_token: string;
  expires_at: string;
}

// Configuration types
export interface AppConfig {
  api_url: string;
  websocket_url: string;
  environment: "development" | "staging" | "production";
  features: {
    realtime_quizzes: boolean;
    user_registration: boolean;
    quiz_creation: boolean;
  };
}
