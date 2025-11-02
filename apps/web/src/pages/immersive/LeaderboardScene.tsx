/**
 * Leaderboard Scene - Final results after quiz completion
 * Shows podium for top 3 and full rankings
 */
import React, { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/game/store/gameStore";
import { useGameActions } from "@/game/hooks/useGameManager";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { Trophy, Medal, Award, Home } from "lucide-react";

const formatPercentage = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
};

const formatDuration = (ms?: number) => {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    return "—";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export default function LeaderboardScene() {
  const players = useGameStore((state) => state.players);
  const finalLeaderboard = useGameStore((state) => state.finalLeaderboard);
  const quizStats = useGameStore((state) => state.quizStats);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const totalQuestionsFallback = useGameStore((state) => state.totalQuestions);
  const { leaveRoom } = useGameActions();
  const navigate = useNavigate();

  const [showConfetti, setShowConfetti] = useState(false);

  const leaderboardEntries = useMemo(() => {
    if (finalLeaderboard.length > 0) {
      return finalLeaderboard;
    }

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return sortedPlayers.map((player, index) => ({
      userId: player.id,
      displayName: player.name,
      score: player.score,
      rank: index + 1,
      correctAnswers: player.streak ?? 0,
      totalAnswered: 0,
    }));
  }, [finalLeaderboard, players]);

  useEffect(() => {
    let timeout: number | undefined;

    if (currentPlayerId) {
      const playerRank = leaderboardEntries.findIndex(
        (entry) => entry.userId === currentPlayerId
      );

      if (playerRank >= 0 && playerRank < 3) {
        setShowConfetti(true);
        timeout = window.setTimeout(() => setShowConfetti(false), 8000);
      } else {
        setShowConfetti(false);
      }
    } else {
      setShowConfetti(false);
    }

    return () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [currentPlayerId, leaderboardEntries]);

  const handleExit = () => {
    leaveRoom();
    navigate("/immersive");
  };

  const topThree = leaderboardEntries.slice(0, 3);
  const restOfPlayers = leaderboardEntries.slice(3);
  const hasDetailedStats = finalLeaderboard.length > 0;

  const totalQuestions =
    quizStats?.totalQuestions ?? (totalQuestionsFallback > 0 ? totalQuestionsFallback : 0);
  const totalParticipants = quizStats?.totalParticipants ?? leaderboardEntries.length;
  const averageScoreValue =
    quizStats?.averageScore ??
    (leaderboardEntries.length
      ? leaderboardEntries.reduce((sum, entry) => sum + entry.score, 0) /
        leaderboardEntries.length
      : 0);
  const completionRate = quizStats?.completionRate;
  const durationDisplay = formatDuration(quizStats?.durationMs);

  const averageScoreDisplay = Number.isFinite(averageScoreValue)
    ? Math.round(averageScoreValue)
    : "—";
  const totalQuestionsDisplay = totalQuestions > 0 ? totalQuestions : "—";
  const totalParticipantsDisplay = totalParticipants > 0 ? totalParticipants : "—";

  return (
    <div className="h-screen w-screen flex flex-col items-center p-8 gap-8 overflow-y-auto">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {/* Title */}
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">Quiz Complete!</h1>
        <p className="text-xl opacity-80">Final Results</p>
      </div>

      {/* Stats Summary */}
      <div className="w-full max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide opacity-60">Questions</div>
            <div className="text-2xl font-semibold mt-1">{totalQuestionsDisplay}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide opacity-60">Players</div>
            <div className="text-2xl font-semibold mt-1">{totalParticipantsDisplay}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide opacity-60">Average Score</div>
            <div className="text-2xl font-semibold mt-1">{averageScoreDisplay}</div>
          </div>
          <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide opacity-60">Completion Rate</div>
            <div className="text-2xl font-semibold mt-1">{formatPercentage(completionRate)}</div>
          </div>
        </div>
        <p className="text-center text-xs opacity-60 mt-3">
          Session duration {durationDisplay}
        </p>
      </div>

      {/* Podium Display - Top 3 */}
      {topThree.length > 0 && (
        <div className="w-full max-w-4xl">
          <div className="flex items-end justify-center gap-4 h-80">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-center mb-2">
                  <Medal size={36} className="text-gray-300" />
                  <div className="font-semibold text-lg mt-1">
                    {topThree[1].displayName}
                  </div>
                  <div className="text-3xl font-bold text-gray-300">
                    {topThree[1].score}
                  </div>
                  {hasDetailedStats && (
                    <div className="text-xs opacity-70 mt-1">
                      {topThree[1].correctAnswers} correct • {topThree[1].totalAnswered} answered
                    </div>
                  )}
                </div>
                <div className="h-48 bg-gradient-to-t from-gray-500 to-gray-300 w-full rounded-t-lg flex items-center justify-center text-4xl font-bold text-white">
                  2
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-center mb-2">
                  <Trophy size={40} className="text-yellow-300" />
                  <div className="font-bold text-xl mt-1">
                    {topThree[0].displayName}
                  </div>
                  <div className="text-4xl font-bold text-yellow-300">
                    {topThree[0].score}
                  </div>
                  {hasDetailedStats && (
                    <div className="text-xs opacity-70 mt-1">
                      {topThree[0].correctAnswers} correct • {topThree[0].totalAnswered} answered
                    </div>
                  )}
                </div>
                <div className="h-64 bg-gradient-to-t from-yellow-600 to-yellow-400 w-full rounded-t-lg flex items-center justify-center text-5xl font-bold text-white shadow-2xl">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="text-center mb-2">
                  <Award size={32} className="text-orange-400" />
                  <div className="font-semibold text-lg mt-1">
                    {topThree[2].displayName}
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {topThree[2].score}
                  </div>
                  {hasDetailedStats && (
                    <div className="text-xs opacity-70 mt-1">
                      {topThree[2].correctAnswers} correct • {topThree[2].totalAnswered} answered
                    </div>
                  )}
                </div>
                <div className="h-40 bg-gradient-to-t from-orange-700 to-orange-500 w-full rounded-t-lg flex items-center justify-center text-3xl font-bold text-white">
                  3
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rest of Players */}
      {restOfPlayers.length > 0 && (
        <div className="w-full max-w-2xl">
          <h3 className="text-xl font-semibold mb-4 text-center">Other Players</h3>
          <div className="bg-black/20 rounded-lg p-4 space-y-2">
            {restOfPlayers.map((player) => (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-3 rounded ${
                  player.userId === currentPlayerId
                    ? "bg-blue-500/30 border border-blue-400"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold w-8">#{player.rank}</span>
                  <div>
                    <div className="font-semibold">{player.displayName}</div>
                    {hasDetailedStats && (
                      <div className="text-xs opacity-70">
                        {player.correctAnswers} correct • {player.totalAnswered} answered
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xl font-bold">{player.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleExit}
          className="btn btn-lg gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Home size={20} />
          Exit to Lobby
        </button>
      </div>
    </div>
  );
}
