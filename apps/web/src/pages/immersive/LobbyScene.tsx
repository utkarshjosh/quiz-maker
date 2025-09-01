import React, { useEffect, useMemo, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { useGameStore, Player } from '@/hooks/immersive/useGameStore';
import { useSound } from '@/hooks/immersive/useSound';
import SettingsModal from '@/components/immersive/SettingsModal';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const generatePIN = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateAvatar = async (seed: string): Promise<string> => {
  return createAvatar(avataaars, { seed }).toDataUri();
};

export default function LobbyScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize lobby state on mount
  useEffect(() => {
    const initializeLobby = async () => {
      const roomId = gameState.roomId || generatePIN();
      const hostAvatar = await generateAvatar('host');
      const hostPlayer: Player = {
        id: 'host',
        name: 'You',
        avatar: hostAvatar,
        score: 0,
      };

      setGameState(state => ({
        ...state,
        scene: 'lobby',
        roomId,
        players: [hostPlayer],
        currentQuestionIndex: 0,
      }));
    };

    initializeLobby();

    // Simulate new players joining
    const joinInterval = setInterval(() => {
      setGameState(state => {
        if (state.players.length >= 8) {
          clearInterval(joinInterval);
          return state;
        }

        const playerId = `player-${state.players.length + 1}`;
        generateAvatar(playerId).then(avatarUri => {
          const newPlayer: Player = {
            id: playerId,
            name: `Player ${state.players.length + 1}`,
            avatar: avatarUri,
            score: 0,
          };
          // Use functional update to get the latest state
          setGameState(currentState => ({ ...currentState, players: [...currentState.players, newPlayer] }));
        });

        return state; // Return current state, the update is async
      });
    }, 2000);

    return () => clearInterval(joinInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinUrl = useMemo(() => {
    return `${window.location.origin}/immersive/join?roomId=${gameState.roomId}`;
  }, [gameState.roomId]);

    const startGame = () => {
    playSound('click.mp3');
    setGameState(state => ({ ...state, scene: 'quiz' }));
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="absolute top-4 right-4">
        <button onClick={() => setIsSettingsOpen(true)} className="btn btn-ghost">
          Settings
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-400 tracking-widest uppercase">Join the Game</h1>
      
      <div className="my-8 bg-black/30 backdrop-blur-md rounded-2xl p-8 flex items-center gap-8 shadow-lg border border-white/10">
        <div>
          <p className="text-lg font-semibold text-gray-300">Game PIN:</p>
          <p className="text-7xl font-bold tracking-widest text-white animate-pulse">
            {gameState.roomId}
          </p>
        </div>
        <div className="bg-white p-2 rounded-lg">
          <QRCode value={joinUrl} size={128} />
        </div>
      </div>

      <div className="flex-grow flex flex-wrap items-center justify-center gap-4">
        {gameState.players.map((player, index) => (
          <div key={player.id} className="flex flex-col items-center animate-pop-in" style={{ animationDelay: `${index * 100}ms` }}>
            <img src={player.avatar} alt={player.name} className="w-20 h-20 rounded-full bg-purple-400/20 mb-2" />
            <p className="font-semibold text-white bg-black/20 px-3 py-1 rounded-full">{player.name}</p>
          </div>
        ))}
      </div>

      <button onClick={startGame} className="btn btn-primary btn-lg mt-8 animate-pulse">
        Start Game
      </button>
    </div>
  );
}
