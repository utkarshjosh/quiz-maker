import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useWebSocketService } from "@/services/websocket";
import { useAuth } from "@/auth/AuthContext";
import { gameService, RoomInfo } from "@/lib/game/service";
import type { StateMessage, ErrorMessage } from "@quiz-maker/ts";

export default function WaitingRoom() {
  const { roomId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const pin = searchParams.get("pin");
  const navigate = useNavigate();
  const { state } = useWebSocket();
  const { startQuiz } = useWebSocketService();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  // Handle WebSocket messages
  useEffect(() => {
    if (!state.lastMessage) return;

    const message = state.lastMessage;

    if (message.type === "state") {
      const stateData = message.data as StateMessage;
      const roomInfo = gameService.parseStateMessage(stateData);
      setRoom(roomInfo);
      setIsHost(stateData.host_id === user?.id);
      setError(null);
    } else if (message.type === "error") {
      const errorData = message.data as ErrorMessage;
      setError(errorData.msg || "An error occurred");
    }
  }, [state.lastMessage, user?.id]);

  const start = () => {
    if (!room) return;
    startQuiz();
    // The WebSocket will handle the quiz start and navigation will be handled by the quiz component
  };

  if (!state.isConnected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h1 className="text-2xl font-bold mb-2">Connecting...</h1>
          <p className="text-gray-600">
            Please wait while we connect to the server.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2 text-red-600">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/play", { replace: true })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold mb-2">Loading room...</h1>
          <p className="text-gray-600">
            Please wait while we load the room information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Waiting Room</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-blue-800 mb-2">Room Information</h2>
        <div className="text-blue-700">
          <p>
            <strong>Room ID:</strong>{" "}
            <code className="bg-blue-100 px-2 py-1 rounded">{room.roomId}</code>
          </p>
          {pin && (
            <p>
              <strong>PIN:</strong>{" "}
              <code className="bg-blue-100 px-2 py-1 rounded text-lg font-mono">
                {pin}
              </code>
            </p>
          )}
          <p>
            <strong>Status:</strong>{" "}
            <span className="capitalize">{room.status}</span>
          </p>
          <p>
            <strong>Players:</strong> {room.players.length}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-3">Players ({room.players.length})</h2>
        <div className="space-y-2">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`rounded-md border px-3 py-2 flex items-center justify-between ${
                player.role === "host"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-gray-50"
              }`}>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{player.name}</span>
                {player.role === "host" && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Host
                  </span>
                )}
                {!player.isOnline && (
                  <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                    Offline
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">Score: {player.score}</div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="text-center">
          <button
            onClick={start}
            className="rounded-md bg-green-600 text-white px-6 py-3 text-lg font-semibold hover:bg-green-700 transition-colors">
            Start Game
          </button>
          <p className="text-sm text-gray-600 mt-2">
            You are the host. Click to start the quiz when everyone is ready.
          </p>
        </div>
      )}

      {!isHost && (
        <div className="text-center text-gray-600">
          <p>Waiting for the host to start the game...</p>
        </div>
      )}
    </div>
  );
}
