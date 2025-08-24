import React from 'react';
import { useGameStore } from '@/hooks/immersive/useGameStore';
import { useSound } from '@/hooks/immersive/useSound';

const podiumStyles = [
  { color: 'gold', size: 'w-32 h-32', order: 'order-2' },
  { color: 'silver', size: 'w-28 h-28', order: 'order-1' },
  { color: '#cd7f32', size: 'w-24 h-24', order: 'order-3' }, // Bronze
];

export default function LeaderboardScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  const podiumPlayers = sortedPlayers.slice(0, 3);
  const otherPlayers = sortedPlayers.slice(3);

    const handlePlayAgain = () => {
    playSound('click.mp3');
    setGameState(state => ({
      ...state,
      scene: 'lobby',
      players: [],
      currentQuestionIndex: 0,
      roomId: null, // Generate a new room
    }));
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold text-white mb-8 animate-pulse">Leaderboard</h1>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 mb-12">
        {podiumPlayers.map((player, index) => (
          <div key={player.id} className={`flex flex-col items-center ${podiumStyles[index].order}`}>
            <p className="text-2xl font-bold" style={{ color: podiumStyles[index].color }}>{index + 1}</p>
            <img src={player.avatar} alt={player.name} className={`${podiumStyles[index].size} rounded-full border-4 mb-2`} style={{ borderColor: podiumStyles[index].color }} />
            <p className="font-semibold text-xl text-white">{player.name}</p>
            <p className="text-lg" style={{ color: podiumStyles[index].color }}>{player.score} pts</p>
          </div>
        ))}
      </div>

      {/* Other Players */}
      <div className="w-full max-w-md bg-black/30 backdrop-blur-md rounded-2xl p-4">
        {otherPlayers.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between p-2 border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-gray-400">{index + 4}</span>
              <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full" />
              <p className="font-semibold text-white">{player.name}</p>
            </div>
            <p className="font-bold text-lg text-white">{player.score} pts</p>
          </div>
        ))}
      </div>

      <button onClick={handlePlayAgain} className="btn btn-primary btn-lg mt-12">
        Play Again
      </button>
    </div>
  );
}
