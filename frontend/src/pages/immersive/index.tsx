import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/hooks/immersive/useGameStore';
import LobbyScene from './LobbyScene.tsx';
import QuizScene from './QuizScene.tsx';
import LeaderboardScene from './LeaderboardScene.tsx';
import FloatingShapes from '@/components/immersive/FloatingShapes';

const sceneComponents = {
  lobby: LobbyScene,
  quiz: QuizScene,
  leaderboard: LeaderboardScene,
};

export default function ImmersiveCanvas() {
  const { gameState } = useGameStore();
  const [currentScene, setCurrentScene] = useState(gameState.scene);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (gameState.scene !== currentScene) {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentScene(gameState.scene);
        setIsExiting(false);
      }, 500); // Match CSS animation duration
    }
  }, [gameState.scene, currentScene]);

  const CurrentSceneComponent = sceneComponents[currentScene];

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans relative overflow-hidden">
      <FloatingShapes />

      <div
        key={currentScene} // Force re-render on scene change to trigger animation
        className={`relative z-10 ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}`}>
        <CurrentSceneComponent />
      </div>
    </div>
  );
}
