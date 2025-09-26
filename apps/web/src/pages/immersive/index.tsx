import React, { useState, useEffect } from "react";
import {
  useParams,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useGameStore } from "@/hooks/immersive/useGameStore";
import { useWebSocketService } from "@/services/websocket";
import LobbyScene from "./LobbyScene.tsx";
import QuizScene from "./QuizScene.tsx";
import LeaderboardScene from "./LeaderboardScene.tsx";
import FloatingShapes from "@/components/immersive/FloatingShapes";
import JoinWithPin from "../play/JoinWithPin";

const sceneComponents = {
  lobby: LobbyScene,
  quiz: QuizScene,
  leaderboard: LeaderboardScene,
};

export default function ImmersiveCanvas() {
  const { gameState, setGameState } = useGameStore();
  const { isConnected, error, lastMessage } = useWebSocketService();
  const [currentScene, setCurrentScene] = useState(gameState.scene);
  const [isExiting, setIsExiting] = useState(false);

  // Get URL parameters to determine initial state
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle join route - show JoinWithPin component
    if (location.pathname.includes("/join")) {
      setCurrentScene("join");
      return;
    }

    // Determine initial scene based on URL
    let initialScene = "lobby";

    if (location.pathname.includes("/quiz/")) {
      initialScene = "quiz";
    } else if (location.pathname.includes("/leaderboard/")) {
      initialScene = "leaderboard";
    } else if (location.pathname.includes("/host/")) {
      initialScene = "lobby";
    } else if (location.pathname.includes("/room/")) {
      initialScene = "lobby";
    }

    // Update game state based on URL
    setGameState((prev) => ({
      ...prev,
      scene: initialScene,
      roomId: params.roomId || params.sessionId || null,
    }));

    setCurrentScene(initialScene);
  }, [location.pathname, params, setGameState]);

  useEffect(() => {
    if (gameState.scene !== currentScene) {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentScene(gameState.scene);
        setIsExiting(false);
      }, 500); // Match CSS animation duration
    }
  }, [gameState.scene, currentScene]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case "room:update":
        // Update room state
        break;
      case "quiz:start":
        setGameState((prev) => ({ ...prev, scene: "quiz" }));
        break;
      case "quiz:end":
        setGameState((prev) => ({ ...prev, scene: "leaderboard" }));
        break;
      case "user:join":
      case "user:leave":
        // Update player list
        break;
      case "score:update":
        // Update scores
        break;
      default:
        break;
    }
  };

  // Handle join scene separately
  if (currentScene === "join") {
    return <JoinWithPin />;
  }

  const CurrentSceneComponent = sceneComponents[currentScene];

  // Show connection status
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
      <div className="absolute top-4 right-4 z-20">
        <div
          className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
      </div>

      <div
        key={currentScene} // Force re-render on scene change to trigger animation
        className={`relative z-10 ${isExiting ? "animate-fade-out" : "animate-fade-in"}`}>
        <CurrentSceneComponent />
      </div>
    </div>
  );
}
