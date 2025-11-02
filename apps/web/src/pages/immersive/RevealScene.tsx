/**
 * Reveal Scene - Shows correct answer and player results
 * Displays after each question ends
 */

import React, { useEffect, useState } from "react";
import { useGameStore } from "@/game/store/gameStore";
import Confetti from "react-confetti";
import { CheckCircle, XCircle } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function RevealScene() {
  const revealData = useGameStore((state) => state.revealData);
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const currentQuestionIndex = useGameStore(
    (state) => state.currentQuestionIndex
  );
  const totalQuestions = useGameStore((state) => state.totalQuestions);

  const [showConfetti, setShowConfetti] = useState(false);

  // Check if current player got it right
  useEffect(() => {
    if (revealData && currentPlayerId) {
      const myResult = revealData.playerResults.find(
        (r) => r.userId === currentPlayerId
      );
      if (myResult?.isCorrect) {
        setShowConfetti(true);
        // Stop confetti after 4 seconds
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
  }, [revealData, currentPlayerId]);

  if (!revealData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  const progress =
    totalQuestions > 0
      ? ((currentQuestionIndex + 1) / totalQuestions) * 100
      : 0;

  // Get current player's result
  const myResult = currentPlayerId
    ? revealData.playerResults.find((r) => r.userId === currentPlayerId)
    : null;

  // Sort players by score for mini leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 gap-8">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {/* Progress Bar */}
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-grow bg-black/30 rounded-full h-6 overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-lg font-semibold">
            {currentQuestionIndex + 1} / {totalQuestions}
          </div>
        </div>
      </div>

      {/* Correct Answer Section */}
      <div className="text-center max-w-4xl">
        <h2 className="text-2xl font-semibold mb-4 text-green-400">
          Correct Answer
        </h2>
        <div
          className="btn btn-lg h-32 text-2xl cursor-default btn-success"
          style={{
            backgroundColor: COLORS[revealData.correctIndex] || COLORS[1],
            border: "4px solid #10B981",
          }}>
          {revealData.correctAnswer}
        </div>
        {revealData.explanation && (
          <p className="mt-4 text-lg opacity-80">{revealData.explanation}</p>
        )}
      </div>

      {/* Current Player Result */}
      {myResult && (
        <div className="text-center">
          {myResult.isCorrect ? (
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle size={32} />
              <span className="text-3xl font-bold">
                +{myResult.scoreDelta} points
              </span>
              <CheckCircle size={32} />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-red-400">
              <XCircle size={32} />
              <span className="text-2xl font-semibold">Incorrect</span>
              <XCircle size={32} />
            </div>
          )}
          <p className="text-sm opacity-70 mt-2">
            Answered in {(myResult.timeTakenMs / 1000).toFixed(1)}s
          </p>
        </div>
      )}

      {/* Mini Leaderboard */}
      <div className="w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Current Standings
        </h3>
        <div className="bg-black/20 rounded-lg p-4 max-h-64 overflow-y-auto">
          {sortedPlayers.slice(0, 5).map((player, index) => {
            const playerResult = revealData.playerResults.find(
              (r) => r.userId === player.id
            );
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded ${
                  player.id === currentPlayerId
                    ? "bg-blue-500/30 border border-blue-400"
                    : "hover:bg-white/5"
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold w-8">#{index + 1}</span>
                  <div>
                    <div className="font-semibold">{player.name}</div>
                    {playerResult && (
                      <div className="text-xs opacity-70">
                        {playerResult.isCorrect ? (
                          <span className="text-green-400">
                            ✓ +{playerResult.scoreDelta}
                          </span>
                        ) : (
                          <span className="text-red-400">✗ 0 points</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-bold">{player.score}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Question Indicator */}
      <div className="text-center opacity-70">
        <p className="text-sm">
          {currentQuestionIndex + 1 < totalQuestions
            ? "Next question coming up..."
            : "Final results loading..."}
        </p>
      </div>
    </div>
  );
}


