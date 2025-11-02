/**
 * Sound Configuration
 * Defines all sounds used in the game with their paths and settings
 */

export interface SoundDefinition {
  key: string;
  path: string;
  volume?: number; // 0.0 to 1.0
  loop?: boolean;
}

export const SOUND_CONFIG: Record<string, SoundDefinition> = {
  // UI Sounds
  CLICK: {
    key: "click",
    path: "/src/assets/sounds/click.wav",
    volume: 0.5,
  },

  // Room Events
  ROOM_JOIN: {
    key: "room-join",
    path: "/src/assets/sounds/room-join.wav",
    volume: 0.6,
  },

  ROOM_LEAVE: {
    key: "room-leave",
    path: "/src/assets/sounds/room-leave.mp3",
    volume: 0.5,
  },

  GAME_START: {
    key: "game-start",
    path: "/src/assets/sounds/game-start.mp3",
    volume: 0.8,
  },

  // Game Sounds
  CORRECT: {
    key: "correct",
    path: "/src/assets/sounds/correct.mp3",
    volume: 0.7,
  },

  INCORRECT: {
    key: "incorrect",
    path: "/src/assets/sounds/incorrect.mp3",
    volume: 0.7,
  },
} as const;

export type SoundKey = keyof typeof SOUND_CONFIG;

// Master volume control
export const MASTER_VOLUME = 1.0;
