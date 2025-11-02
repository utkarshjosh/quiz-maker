/**
 * Game Module - Main exports
 * Unity-style: Single entry point for all game-related code
 */

// Types
export * from './types';

// Store
export * from './store/gameStore';

// Services
export * from './services/WebSocketService';

// Managers
export * from './managers/GameManager';
export * from './managers/SoundEngine';

// Configuration
export { SOUND_CONFIG, MASTER_VOLUME } from './config/soundConfig';
export type { SoundKey, SoundDefinition } from './config/soundConfig';

// Hooks
export * from './hooks/useGameManager';

// Cleanup utilities
export { destroyWebSocketService } from './services/WebSocketService';
export { destroyGameManager } from './managers/GameManager';
export { resetGameManagerFlags } from './hooks/useGameManager';

