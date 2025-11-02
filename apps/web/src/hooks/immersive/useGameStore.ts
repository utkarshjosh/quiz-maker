import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export type Player = {
  id: string;
  name: string;
  avatar: string;
  score: number;
};

export type GameSettings = {
  sound: boolean;
  music: boolean;
};

export type GameState = {
  scene: 'lobby' | 'quiz' | 'leaderboard';
  roomId: string | null;
  players: Player[];
  settings: GameSettings;
  currentQuestionIndex: number;
};

const GAME_STATE_KEY = ['immersive-game-state'];

const defaultState: GameState = {
  scene: 'lobby',
  roomId: null,
  players: [],
  settings: {
    sound: true,
    music: true,
  },
  currentQuestionIndex: 0,
};

export const useGameStore = () => {
  const queryClient = useQueryClient();

  const { data: gameState } = useQuery({
    queryKey: GAME_STATE_KEY,
    queryFn: () => defaultState,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Memoize setGameState to prevent infinite re-renders
  const setGameState = useCallback((updater: (oldState: GameState) => GameState) => {
    queryClient.setQueryData<GameState>(GAME_STATE_KEY, updater);
  }, [queryClient]);

  return { gameState: gameState ?? defaultState, setGameState };
};
