/**
 * Leaderboard Scene - Refactored with clean architecture
 * Unity-style: Scene component that uses centralized game state
 */

import React, { useEffect, useState } from "react";
import { useGameStore, usePlayers } from "@/game/store/gameStore";
import { useGameActions } from "@/game/hooks/useGameManager";
import { useNavigate } from "react-router-dom";
import PlayerCard from "@/components/immersive/PlayerCard";
import { getWebSocketService, destroyWebSocketService } from "@/game/services/WebSocketService";
import { destroyGameManager } from "@/game/managers/GameManager";

const podiumStyles = [
  { color: "gold", size: "w-32 h-32", order: "order-2" },
  { color: "silver", size: "w-28 h-28", order: "order-1" },
  { color: "#cd7f32", size: "w-24 h-24", order: "order-3" }, // Bronze
];

export default function LeaderboardScene() {
  const navigate = useNavigate();
  const { leaveRoom, playSound } = useGameActions();

  // Game State
  const players = usePlayers();
  const room = useGameStore((state) => state.room);
  const totalQuestions = useGameStore((state) => state.totalQuestions);

  // Local UI State
  const [sortedPlayers, setSortedPlayers] = useState(
    [...players].sort((a, b) => b.score - a.score)
  );
  const [showConfetti, setShowConfetti] = useState(false);

  // WebSocket connection status
  const wsService = getWebSocketService();
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });

    return unsubscribe;
  }, [wsService]);

  // Update sorted players when game state changes
  useEffect(() => {
    setSortedPlayers([...players].sort((a, b) => b.score - a.score));
  }, [players]);

  // Show confetti for top 3 players
  useEffect(() => {
    if (sortedPlayers.length > 0) {
      setShowConfetti(true);
      // TODO: Add victory sound when available
      // playSound("VICTORY");
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [sortedPlayers]);

  const podiumPlayers = sortedPlayers.slice(0, 3);
  const otherPlayers = sortedPlayers.slice(3);

  const handlePlayAgain = () => {
    playSound("CLICK");
    
    // Reset game state and return to lobby
    useGameStore.getState().resetQuiz();
    useGameStore.getState().setScene('lobby');
    
    // Navigate back to lobby
    navigate("/play");
  };

  const handleNewGame = () => {
    playSound("CLICK");
    
    // Leave current room
    leaveRoom();
    
    // Reset game completely
    useGameStore.getState().resetGame();
    
    // Navigate to host page
    navigate("/play/host/default-quiz");
  };

  const handleExit = () => {
    playSound("CLICK");
    
    // Leave room and reset
    leaveRoom();
    useGameStore.getState().resetGame();
    
    // Clean up game system completely
    setTimeout(() => {
      const wsService = getWebSocketService();
      
      // Destroy game manager first
      destroyGameManager();
      
      // Then disconnect and destroy WebSocket
      wsService.disconnect();
      destroyWebSocketService();
      
      console.log("LeaderboardScene: Game system and WebSocket completely cleaned up");
      
      // Navigate to home
      navigate("/");
    }, 500);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* Simple confetti effect */}
          {[...Array(100)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-bounce"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][
                  Math.floor(Math.random() * 5)
                ],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <h1 className="text-6xl font-bold text-white mb-8 animate-pulse">
        Final Results
      </h1>

      {/* Winner Announcement */}
      {podiumPlayers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-yellow-400 mb-2">
            🏆 {podiumPlayers[0]?.name} Wins! 🏆
          </h2>
          <p className="text-xl text-gray-300">
            Final Score: {podiumPlayers[0]?.score} points
          </p>
        </div>
      )}

      {/* Podium */}
      {podiumPlayers.length > 0 && (
        <div className="flex items-end justify-center gap-4 mb-12">
          {podiumPlayers.map((player, index) => (
            <div key={player.id} className={podiumStyles[index].order}>
              <p
                className="text-2xl font-bold text-center mb-2"
                style={{ color: podiumStyles[index].color }}>
                {index + 1}
              </p>
              <PlayerCard
                player={player}
                size={index === 0 ? "lg" : index === 1 ? "md" : "md"}
                showScore={true}
                variant="podium"
                podiumColor={podiumStyles[index].color}
              />
            </div>
          ))}
        </div>
      )}

      {/* Other Players */}
      {otherPlayers.length > 0 && (
        <div className="w-full max-w-md bg-black/30 backdrop-blur-md rounded-2xl p-4 mb-8">
          <h3 className="text-xl font-semibold text-gray-300 mb-4">
            Other Participants
          </h3>
          {otherPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2 border-b border-white/10 last:border-b-0">
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg text-gray-400">
                  {index + 4}
                </span>
                <div className="flex items-center gap-2">
                  <PlayerCard
                    player={player}
                    size="sm"
                    showScore={false}
                    animationDelay={0}
                  />
                </div>
              </div>
              <p className="font-bold text-lg text-white">{player.score} pts</p>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button onClick={handlePlayAgain} className="btn btn-primary btn-lg">
          Play Again
        </button>
        <button onClick={handleNewGame} className="btn btn-secondary btn-lg">
          New Game
        </button>
        <button onClick={handleExit} className="btn btn-ghost btn-lg">
          Exit
        </button>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute bottom-4 left-4 bg-red-500/80 text-white px-3 py-1 rounded-full text-sm">
          Disconnected
        </div>
      )}

      {/* Game Stats */}
      <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md rounded-lg p-3 text-left">
        <p className="text-sm text-gray-300">
          Total Players: {players.length}
        </p>
        <p className="text-sm text-gray-300">
          Questions: {totalQuestions}
        </p>
        <p className="text-sm text-gray-300">
          Room: {room?.pin || 'N/A'}
        </p>
      </div>
    </div>
  );
}
