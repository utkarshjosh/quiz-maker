import React, { useEffect, useState } from "react";
import { useGameStore } from "@/hooks/immersive/useGameStore";
import { useSound } from "@/hooks/immersive/useSound";
import { useWebSocketService } from "@/services/websocket";
import { useNavigate } from "react-router-dom";

const podiumStyles = [
  { color: "gold", size: "w-32 h-32", order: "order-2" },
  { color: "silver", size: "w-28 h-28", order: "order-1" },
  { color: "#cd7f32", size: "w-24 h-24", order: "order-3" }, // Bronze
];

export default function LeaderboardScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const { isConnected } = useWebSocketService();
  const navigate = useNavigate();

  const [sortedPlayers, setSortedPlayers] = useState(
    [...gameState.players].sort((a, b) => b.score - a.score)
  );
  const [showConfetti, setShowConfetti] = useState(false);

  // Update sorted players when game state changes
  useEffect(() => {
    setSortedPlayers([...gameState.players].sort((a, b) => b.score - a.score));
  }, [gameState.players]);

  // Show confetti for top 3 players
  useEffect(() => {
    if (sortedPlayers.length > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sortedPlayers]);

  const podiumPlayers = sortedPlayers.slice(0, 3);
  const otherPlayers = sortedPlayers.slice(3);

  const handlePlayAgain = () => {
    playSound("click.mp3");

    // Reset game state
    setGameState((state) => ({
      ...state,
      scene: "lobby",
      players: [],
      currentQuestionIndex: 0,
      roomId: null,
    }));

    // Navigate back to lobby
    navigate("/play");
  };

  const handleNewGame = () => {
    playSound("click.mp3");

    // Reset game state
    setGameState((state) => ({
      ...state,
      scene: "lobby",
      players: [],
      currentQuestionIndex: 0,
      roomId: null,
    }));

    // Navigate to host page
    navigate("/play/host/default-quiz");
  };

  const handleExit = () => {
    playSound("click.mp3");

    // Reset game state
    setGameState((state) => ({
      ...state,
      scene: "lobby",
      players: [],
      currentQuestionIndex: 0,
      roomId: null,
    }));

    // Navigate to home
    navigate("/");
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {/* Simple confetti effect */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 animate-bounce"
              style={{
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
      <div className="flex items-end justify-center gap-4 mb-12">
        {podiumPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex flex-col items-center ${podiumStyles[index].order}`}>
            <p
              className="text-2xl font-bold"
              style={{ color: podiumStyles[index].color }}>
              {index + 1}
            </p>
            <img
              src={player.avatar}
              alt={player.name}
              className={`${podiumStyles[index].size} rounded-full border-4 mb-2 transition-transform hover:scale-110`}
              style={{ borderColor: podiumStyles[index].color }}
            />
            <p className="font-semibold text-xl text-white">{player.name}</p>
            <p className="text-lg" style={{ color: podiumStyles[index].color }}>
              {player.score} pts
            </p>
          </div>
        ))}
      </div>

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
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-12 h-12 rounded-full"
                />
                <p className="font-semibold text-white">{player.name}</p>
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
      <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-md rounded-lg p-3 text-left">
        <p className="text-sm text-gray-300">
          Total Players: {gameState.players.length}
        </p>
        <p className="text-sm text-gray-300">
          Questions: {gameState.currentQuestionIndex}
        </p>
        <p className="text-sm text-gray-300">Room: {gameState.roomId}</p>
      </div>
    </div>
  );
}
