/**
 * Immersive Canvas - Main game container
 * Unity-style: Root game component that initializes the game system
 */

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGameStore } from "@/game/store/gameStore";
import { useGameManager } from "@/game/hooks/useGameManager";
import { getWebSocketService } from "@/game/services/WebSocketService";
import LobbyScene from "./LobbyScene";
import QuizScene from "./QuizScene";
import RevealScene from "./RevealScene";
import LeaderboardScene from "./LeaderboardScene";
import FloatingShapes from "@/components/immersive/FloatingShapes";
import JoinWithPin from "../play/JoinWithPin";
import type { GameScene } from "@/game/types";

const sceneComponents: Record<GameScene, React.ComponentType> = {
  lobby: LobbyScene,
  quiz: QuizScene,
  reveal: RevealScene,
  leaderboard: LeaderboardScene,
};

export default function ImmersiveCanvas() {
  // Initialize game system (WebSocket + Game Manager)
  useGameManager();

  // Game State
  const currentScene = useGameStore((state) => state.currentScene);
  const error = useGameStore((state) => state.error);

  // Local UI State
  const [isExiting, setIsExiting] = useState(false);
  const [displayScene, setDisplayScene] = useState(currentScene);

  // WebSocket connection status
  const wsService = getWebSocketService();
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  // Location for route detection
  const location = useLocation();

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });

    return unsubscribe;
  }, [wsService]);

  // Handle scene transitions with animation
  useEffect(() => {
    if (currentScene !== displayScene) {
      setIsExiting(true);
      setTimeout(() => {
        setDisplayScene(currentScene);
        setIsExiting(false);
      }, 500); // Match CSS animation duration
    }
  }, [currentScene, displayScene]);

  const CurrentSceneComponent =
    sceneComponents[displayScene] ?? LobbyScene;

  useEffect(() => {
    if (!sceneComponents[displayScene]) {
      console.warn(
        `[ImmersiveCanvas] Unknown scene "${displayScene}" – falling back to lobby`
      );
    }
  }, [displayScene]);

  // Show connection status while connecting
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Connecting to quiz server...</p>
          {error && <p className="text-red-400 mt-2">Error: {error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans relative overflow-hidden">
      <FloatingShapes />

      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Current Scene */}
      <div
        key={displayScene}
        className={`relative z-10 ${
          isExiting ? "animate-fade-out" : "animate-fade-in"
        }`}>
        <CurrentSceneComponent />
      </div>
    </div>
  );
}
