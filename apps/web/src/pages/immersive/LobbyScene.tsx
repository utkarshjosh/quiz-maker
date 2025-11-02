/**
 * Lobby Scene - Refactored with clean architecture
 * Unity-style: Scene component that uses centralized game state
 */

import React, { useEffect, useState, useRef } from "react";
import { QRCode } from "react-qrcode-logo";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  useGameStore,
  useRoomPin,
  usePlayers,
  useIsHost,
} from "@/game/store/gameStore";
import { useGameActions } from "@/game/hooks/useGameManager";
import SettingsModal from "@/components/immersive/SettingsModal";
import PlayerCard from "@/components/immersive/PlayerCard";
import {
  getWebSocketService,
  destroyWebSocketService,
} from "@/game/services/WebSocketService";
import { destroyGameManager } from "@/game/managers/GameManager";

export default function LobbyScene() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Game State (from Zustand)
  const players = usePlayers();
  const roomPin = useRoomPin();
  const isHost = useIsHost(); // This is now dynamic - updates on host transfer!
  const status = useGameStore((state) => state.status);
  const room = useGameStore((state) => state.room);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);

  // Debug: Log when isHost changes (helps verify host transfer)
  useEffect(() => {
    console.log(
      "LobbyScene: isHost status changed:",
      isHost,
      "currentPlayerId:",
      currentPlayerId
    );
  }, [isHost, currentPlayerId]);

  // Game Actions (includes sound methods)
  const { createRoom, joinRoom, startQuiz, leaveRoom, playSound } =
    useGameActions();

  // Local UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [joinPin, setJoinPin] = useState<string>("");

  // WebSocket connection status
  const wsService = getWebSocketService();
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onStatusChange((status) => {
      setIsConnected(status === "connected");
    });

    return unsubscribe;
  }, [wsService]);

  // Track initialization to prevent multiple room creation
  const isInitializedRef = useRef(false);
  const lastQuizIdRef = useRef<string>("");
  const hasCreatedRoom = useRef(false);

  // Initialize lobby on mount
  useEffect(() => {
    const isHostUser =
      location.pathname.includes("/host/") ||
      location.pathname.includes("/play/host/");

    const quizId = params.quizId || "default-quiz";
    const initKey = `${isHostUser}-${quizId}`;

    // Prevent duplicate initialization
    if (isInitializedRef.current && lastQuizIdRef.current === initKey) {
      console.log("LobbyScene: Already initialized - skipping");
      return;
    }

    // Extra guard: prevent multiple room creations
    if (isHostUser && hasCreatedRoom.current) {
      console.log("LobbyScene: Room already created - skipping");
      return;
    }

    isInitializedRef.current = true;
    lastQuizIdRef.current = initKey;

    if (isHostUser) {
      // Host: Create new room (only once!)
      // Wait for connection to be established
      if (!isConnected) {
        console.log("LobbyScene: Waiting for connection before creating room");
        return;
      }

      console.log("LobbyScene: Host creating room for quiz:", quizId);
      hasCreatedRoom.current = true;

      // Small delay to ensure GameManager is fully initialized
      setTimeout(() => {
        createRoom(quizId);
      }, 100);
    } else {
      // Participant: Check for PIN in URL
      const searchParams = new URLSearchParams(window.location.search);
      const pinFromUrl = searchParams.get("pin");

      if (pinFromUrl) {
        setJoinPin(pinFromUrl);
        console.log("LobbyScene: Found PIN in URL:", pinFromUrl);
      }
    }
  }, [location.pathname, params.quizId, createRoom, isConnected]);

  // Update URL when room PIN is available
  useEffect(() => {
    if (roomPin) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("pin") !== roomPin) {
        url.searchParams.set("pin", roomPin);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [roomPin]);

  const joinUrl = roomPin
    ? `${window.location.origin}/play/join?pin=${roomPin}`
    : "";

  const handleJoinWithPin = () => {
    if (joinPin.trim() && isConnected) {
      console.log("LobbyScene: Joining room with PIN:", joinPin);
      playSound("CLICK");
      joinRoom(joinPin, "Participant"); // TODO: Get actual player name
    }
  };

  const handleStartGame = () => {
    if (!isHost || players.length < 2) return;

    playSound("CLICK");
    console.log("LobbyScene: Starting quiz");
    startQuiz();
  };

  const handleLeaveRoom = () => {
    playSound("CLICK");
    console.log("LobbyScene: Leaving room and cleaning up");

    // Send leave message to server
    leaveRoom();

    // Clean up game system completely
    setTimeout(() => {
      const wsService = getWebSocketService();

      // Destroy game manager first
      destroyGameManager();

      // Then disconnect and destroy WebSocket
      wsService.disconnect();
      destroyWebSocketService();

      console.log(
        "LobbyScene: Game system and WebSocket completely cleaned up"
      );

      // Navigate back to home
      navigate("/");
    }, 500); // Wait for leave message to be sent
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="absolute top-4 right-4 flex gap-2">
        {room && (
          <button
            onClick={handleLeaveRoom}
            className="btn btn-ghost btn-sm text-red-400 hover:text-red-300">
            Leave Room
          </button>
        )}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-ghost btn-sm">
          Settings
        </button>
      </div>

      {isHost ? (
        // ==================== Host View ====================
        <>
          <h1 className="text-2xl font-bold text-gray-400 tracking-widest uppercase">
            Hosting Game
          </h1>

          <div className="my-8 bg-black/30 backdrop-blur-md rounded-2xl p-8 flex items-center gap-8 shadow-lg border border-white/10">
            <div>
              <p className="text-lg font-semibold text-gray-300">Game PIN:</p>
              {roomPin ? (
                <p className="text-7xl font-bold tracking-widest text-white animate-pulse">
                  {roomPin}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="text-lg">Creating room...</span>
                </div>
              )}
            </div>
            {roomPin && (
              <div className="bg-white p-2 rounded-lg">
                <QRCode value={joinUrl} size={128} />
              </div>
            )}
          </div>

          <div className="flex-grow flex flex-wrap items-center justify-center gap-4">
            {players.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                size="md"
                showScore={false}
                animationDelay={index * 100}
              />
            ))}
          </div>

          <button
            onClick={handleStartGame}
            className="btn btn-primary btn-lg mt-8 animate-pulse"
            disabled={players.length < 2 || status === "playing"}>
            Start Game ({players.length} players)
          </button>
        </>
      ) : (
        // ==================== Participant View ====================
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
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleJoinWithPin();
                    }
                  }}
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
            {players.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                size="md"
                showScore={false}
                animationDelay={index * 100}
              />
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

      {/* Status indicator */}
      {status === "waiting" && players.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-green-500/80 text-white px-3 py-1 rounded-full text-sm">
          {players.length} player{players.length !== 1 ? "s" : ""} ready
        </div>
      )}
    </div>
  );
}
