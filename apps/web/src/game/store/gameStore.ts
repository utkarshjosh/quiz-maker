/**
 * Game Store - Zustand-based state management
 * Unity-style: Single centralized store for all game state
 * 
 * This replaces the TanStack Query hack and provides clean,
 * performant state management for real-time game data.
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  GameState,
  Player,
  Question,
  RoomInfo,
  GameScene,
  GameStatus,
  FinalLeaderboardEntry,
  QuizSummaryStats,
} from '../types';

interface GameActions {
  // Scene Management
  setScene: (scene: GameScene) => void;
  setStatus: (status: GameStatus) => void;

  // Room Management
  setRoom: (room: RoomInfo | null) => void;
  setIsHost: (isHost: boolean) => void;

  // Player Management
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setCurrentPlayerId: (playerId: string | null) => void;
  setCurrentQuestionIndex: (index: number) => void;

  // Quiz Management
  setQuestion: (question: Question | null, index: number) => void;
  setTotalQuestions: (total: number) => void;
  submitAnswer: (questionIndex: number, answer: string) => void;
  setTimeRemaining: (seconds: number) => void;
  
  // Reveal Phase
  setRevealData: (data: import('../types').RevealData | null) => void;
  setFinalLeaderboard: (entries: FinalLeaderboardEntry[]) => void;
  setQuizStats: (stats: QuizSummaryStats | null) => void;

  // UI State
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<GameState['settings']>) => void;

  // Utility Actions
  resetGame: () => void;
  resetQuiz: () => void;
}

const initialState: GameState = {
  // Scene Management
  currentScene: 'lobby',
  status: 'idle',

  // Room & Connection
  room: null,
  isHost: false,

  // Players
  players: [],
  currentPlayerId: null,

  // Quiz Progress
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  answers: new Map(),
  
  // Reveal Phase
  revealData: null,
  finalLeaderboard: [],
  quizStats: null,

  // UI State
  settings: {
    sound: true,
    music: true,
    volume: 0.7,
  },
  isLoading: false,
  error: null,

  // Timing
  questionStartTime: null,
  timeRemaining: 30,
};

/**
 * Main Game Store
 * Use this hook in any component to access/modify game state
 */
export const useGameStore = create<GameState & GameActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Scene Management
        setScene: (scene) =>
          set({ currentScene: scene }, false, 'setScene'),

        setStatus: (status) =>
          set({ status }, false, 'setStatus'),

        // Room Management
        setRoom: (room) =>
          set({ room }, false, 'setRoom'),

        setIsHost: (isHost) =>
          set({ isHost }, false, 'setIsHost'),

        // Player Management
        setPlayers: (players) =>
          set({ players }, false, 'setPlayers'),

        addPlayer: (player) =>
          set(
            (state) => ({
              players: [...state.players, player],
            }),
            false,
            'addPlayer'
          ),

        removePlayer: (playerId) =>
          set(
            (state) => ({
              players: state.players.filter((p) => p.id !== playerId),
            }),
            false,
            'removePlayer'
          ),

        updatePlayer: (playerId, updates) =>
          set(
            (state) => ({
              players: state.players.map((p) =>
                p.id === playerId ? { ...p, ...updates } : p
              ),
            }),
            false,
            'updatePlayer'
          ),

        setCurrentPlayerId: (playerId) =>
          set({ currentPlayerId: playerId }, false, 'setCurrentPlayerId'),

        setCurrentQuestionIndex: (index) =>
          set({ currentQuestionIndex: index }, false, 'setCurrentQuestionIndex'),

        // Quiz Management
        setQuestion: (question, index) =>
          set(
            {
              currentQuestion: question,
              currentQuestionIndex: index,
              questionStartTime: question ? Date.now() : null,
              timeRemaining: question?.timeLimit || 30,
            },
            false,
            'setQuestion'
          ),

        setTotalQuestions: (total) =>
          set({ totalQuestions: total }, false, 'setTotalQuestions'),

        submitAnswer: (questionIndex, answer) =>
          set(
            (state) => {
              const newAnswers = new Map(state.answers);
              newAnswers.set(questionIndex, answer);
              return { answers: newAnswers };
            },
            false,
            'submitAnswer'
          ),

        setTimeRemaining: (seconds) =>
          set({ timeRemaining: seconds }, false, 'setTimeRemaining'),
        
        // Reveal Phase
        setRevealData: (data) =>
          set({ revealData: data }, false, 'setRevealData'),
        setFinalLeaderboard: (entries) =>
          set({ finalLeaderboard: entries }, false, 'setFinalLeaderboard'),
        setQuizStats: (stats) =>
          set({ quizStats: stats }, false, 'setQuizStats'),

        // UI State
        setLoading: (isLoading) =>
          set({ isLoading }, false, 'setLoading'),

        setError: (error) =>
          set({ error }, false, 'setError'),

        updateSettings: (settings) =>
          set(
            (state) => ({
              settings: { ...state.settings, ...settings },
            }),
            false,
            'updateSettings'
          ),

        // Utility Actions
        resetGame: () =>
          set(
            {
              ...initialState,
              settings: get().settings, // Preserve user settings
            },
            false,
            'resetGame'
          ),

        resetQuiz: () =>
          set(
            {
              currentQuestion: null,
              currentQuestionIndex: 0,
              answers: new Map(),
              questionStartTime: null,
              timeRemaining: 30,
              revealData: null,
              finalLeaderboard: [],
              quizStats: null,
            },
            false,
            'resetQuiz'
          ),
      }),
      {
        name: 'quiz-game-state',
        // Only persist user settings, not the entire game state
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    { name: 'QuizGame' }
  )
);

/**
 * Selector Hooks - Optimized selectors for specific data
 * Use these to prevent unnecessary re-renders
 */
export const useCurrentPlayer = () =>
  useGameStore((state) => {
    const playerId = state.currentPlayerId;
    return playerId ? state.players.find((p) => p.id === playerId) : null;
  });

/**
 * Check if current user is the host
 * This is dynamic - updates when host role is transferred
 */
export const useIsHost = () =>
  useGameStore((state) => {
    const currentPlayerId = state.currentPlayerId;
    if (!currentPlayerId) return state.isHost; // Fallback to initial value
    
    // Find current player and check their role
    const currentPlayer = state.players.find((p) => p.id === currentPlayerId);
    return currentPlayer?.role === 'host' || currentPlayer?.isHost || false;
  });

export const useRoomPin = () =>
  useGameStore((state) => state.room?.pin ?? null);

export const usePlayers = () =>
  useGameStore((state) => state.players);

export const useCurrentQuestion = () => {
  const question = useGameStore((state) => state.currentQuestion);
  const index = useGameStore((state) => state.currentQuestionIndex);
  const total = useGameStore((state) => state.totalQuestions);
  const timeRemaining = useGameStore((state) => state.timeRemaining);

  return useMemo(
    () => ({
      question,
      index,
      total,
      timeRemaining,
    }),
    [question, index, total, timeRemaining]
  );
};

export const useGameSettings = () =>
  useGameStore((state) => state.settings);

