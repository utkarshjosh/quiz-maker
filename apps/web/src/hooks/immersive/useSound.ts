import { useGameStore } from './useGameStore';

export const useSound = () => {
  const { gameState } = useGameStore();

  const playSound = (soundFile: string) => {
    if (gameState.settings.sound) {
            // Vite requires using new URL() for dynamic asset paths in the src directory.
      const soundUrl = new URL(`../../assets/sounds/${soundFile}`, import.meta.url).href;
      const audio = new Audio(soundUrl);
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  };

  return { playSound };
};
