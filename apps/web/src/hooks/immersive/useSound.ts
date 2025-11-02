/**
 * @deprecated This hook is deprecated. Use the sound engine from GameManager instead:
 * 
 * ```typescript
 * import { useGameActions } from '@/game/hooks/useGameManager';
 * 
 * function MyComponent() {
 *   const { playSound } = useGameActions();
 *   
 *   const handleClick = () => {
 *     playSound('CLICK'); // Use sound keys from SOUND_CONFIG
 *   };
 * }
 * ```
 * 
 * The new sound engine provides:
 * - Preloaded sounds (no loading delay)
 * - Web Audio API (better performance, no HTTP 416 errors)
 * - Volume control
 * - Proper error handling
 * 
 * @see /src/game/managers/SoundEngine.ts
 * @see /src/game/managers/README.md for usage guide
 */

import { useGameStore } from './useGameStore';

export const useSound = () => {
  const { gameState } = useGameStore();

  const playSound = (soundFile: string) => {
    console.warn('[useSound] This hook is deprecated. Use sound engine from GameManager instead.');
    
    if (gameState.settings.sound) {
      // Vite requires using new URL() for dynamic asset paths in the src directory.
      const soundUrl = new URL(`../../assets/sounds/${soundFile}`, import.meta.url).href;
      const audio = new Audio(soundUrl);
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  return { playSound };
};
