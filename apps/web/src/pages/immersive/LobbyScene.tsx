import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { QRCode } from "react-qrcode-logo";
import { useParams, useLocation } from "react-router-dom";
import { useGameStore, Player } from "@/hooks/immersive/useGameStore";
import { useSound } from "@/hooks/immersive/useSound";
import { useWebSocketService } from "@/services/websocket";
import SettingsModal from "@/components/immersive/SettingsModal";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

const generatePIN = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateAvatar = async (seed: string): Promise<string> => {
  return createAvatar(avataaars, { seed }).toDataUri();
};

export default function LobbyScene() {
  const { gameState, setGameState } = useGameStore();
  const { playSound } = useSound();
  const { createRoom, joinRoom, isConnected } = useWebSocketService();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomPin, setRoomPin] = useState<string>("");
  const [joinPin, setJoinPin] = useState<string>("");

  // Get URL parameters
  const params = useParams();
  const location = useLocation();

  // Track initialization to prevent multiple calls
  const isInitializedRef = useRef(false);
  const lastParamsRef = useRef<string>("");

  // Initialize lobby state on mount
  useEffect(() => {
    const currentParams = `${location.pathname}-${params.quizId}-${params.roomId}-${params.sessionId}`;

    // Only initialize if params changed or not yet initialized
    if (isInitializedRef.current && lastParamsRef.current === currentParams) {
      return;
    }

    isInitializedRef.current = true;
    lastParamsRef.current = currentParams;

    const initializeLobby = async () => {
      // Determine if user is host or participant based on URL
      const isHostUser =
        location.pathname.includes("/host/") ||
        location.pathname.includes("/play/host/");
      setIsHost(isHostUser);

      if (isHostUser) {
        // Host: Create new room
        const quizId = params.quizId || "default-quiz";
        const newRoomPin = generatePIN();
        setRoomPin(newRoomPin);

        // Create room via WebSocket
        if (isConnected) {
          createRoom({
            quiz_id: quizId,
            settings: {
              question_duration_ms: 30000, // 30 seconds
              show_correctness: true,
              show_leaderboard: true,
              allow_reconnect: true,
            },
          });
        }

        const hostAvatar = await generateAvatar("host");
        const hostPlayer: Player = {
          id: "host",
          name: "You (Host)",
          avatar: hostAvatar,
          score: 0,
        };

        setGameState((state) => ({
          ...state,
          scene: "lobby",
          roomId: newRoomPin,
          players: [hostPlayer],
          currentQuestionIndex: 0,
        }));
      } else {
        // Participant: Join existing room
        const roomId = params.roomId || params.sessionId;
        if (roomId) {
          setRoomPin(roomId);
          setJoinPin(roomId);

          // Join room via WebSocket
          if (isConnected) {
            joinRoom({
              pin: roomId,
              display_name: "Participant",
            });
          }
        }

        const playerAvatar = await generateAvatar("participant");
        const player: Player = {
          id: "participant",
          name: "You",
          avatar: playerAvatar,
          score: 0,
        };

        setGameState((state) => ({
          ...state,
          scene: "lobby",
          roomId,
          players: [player],
          currentQuestionIndex: 0,
        }));
      }
    };

    if (isConnected) {
      initializeLobby();
    }
  }, [
    isConnected,
    location.pathname,
    params.quizId,
    params.roomId,
    params.sessionId,
  ]);

  const joinUrl = useMemo(() => {
    return `${window.location.origin}/play/join?roomId=${roomPin}`;
  }, [roomPin]);

  const handleJoinRoom = useCallback(() => {
    if (joinPin.trim()) {
      if (isConnected) {
        joinRoom({
          pin: joinPin,
          display_name: "Participant",
        });
        setRoomPin(joinPin);
      }
    }
  }, [joinPin, isConnected, joinRoom]);

  const startGame = () => {
    if (!isHost) return; // Only host can start game

    playSound("click.mp3");
    // The WebSocket service will handle starting the quiz
    // Scene change will be handled by WebSocket message
  };

  const handleJoinWithPin = () => {
    if (joinPin.trim()) {
      handleJoinRoom();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-ghost">
          Settings
        </button>
      </div>

      {isHost ? (
        // Host View
        <>
          <h1 className="text-2xl font-bold text-gray-400 tracking-widest uppercase">
            Hosting Game
          </h1>

          <div className="my-8 bg-black/30 backdrop-blur-md rounded-2xl p-8 flex items-center gap-8 shadow-lg border border-white/10">
            <div>
              <p className="text-lg font-semibold text-gray-300">Game PIN:</p>
              <p className="text-7xl font-bold tracking-widest text-white animate-pulse">
                {roomPin}
              </p>
            </div>
            <div className="bg-white p-2 rounded-lg">
              <QRCode value={joinUrl} size={128} />
            </div>
          </div>

          <div className="flex-grow flex flex-wrap items-center justify-center gap-4">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className="flex flex-col items-center animate-pop-in"
                style={{ animationDelay: `${index * 100}ms` }}>
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 rounded-full bg-purple-400/20 mb-2"
                />
                <p className="font-semibold text-white bg-black/20 px-3 py-1 rounded-full">
                  {player.name}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="btn btn-primary btn-lg mt-8 animate-pulse"
            disabled={gameState.players.length < 2}>
            Start Game ({gameState.players.length} players)
          </button>
        </>
      ) : (
        // Participant View
        <>
          <h1 className="text-2xl font-bold text-gray-400 tracking-widest uppercase">
            Join Game
          </h1>

          {!roomPin ? (
            // Join with PIN
            <div className="my-8 bg-black/30 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-white/10">
              <p className="text-lg font-semibold text-gray-300 mb-4">
                Enter Game PIN:
              </p>
              <div className="flex gap-4 items-center justify-center">
                <input
                  type="text"
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  placeholder="Enter PIN"
                  className="input input-bordered text-center text-2xl font-mono w-32"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinWithPin}
                  className="btn btn-primary"
                  disabled={!joinPin.trim() || !isConnected}>
                  Join
                </button>
              </div>
            </div>
          ) : (
            // Waiting in room
            <div className="my-8 bg-black/30 backdrop-blur-md rounded-2xl p-8 flex items-center gap-8 shadow-lg border border-white/10">
              <div>
                <p className="text-lg font-semibold text-gray-300">Game PIN:</p>
                <p className="text-7xl font-bold tracking-widest text-white">
                  {roomPin}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg text-gray-300">
                  Waiting for host to start...
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mt-2"></div>
              </div>
            </div>
          )}

          <div className="flex-grow flex flex-wrap items-center justify-center gap-4">
            {gameState.players.map((player, index) => (
              <div
                key={player.id}
                className="flex flex-col items-center animate-pop-in"
                style={{ animationDelay: `${index * 100}ms` }}>
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-20 h-20 rounded-full bg-purple-400/20 mb-2"
                />
                <p className="font-semibold text-white bg-black/20 px-3 py-1 rounded-full">
                  {player.name}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="absolute bottom-4 left-4 bg-red-500/80 text-white px-3 py-1 rounded-full text-sm">
          Disconnected
        </div>
      )}
    </div>
  );
}
