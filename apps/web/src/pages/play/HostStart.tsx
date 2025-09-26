import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWebSocketService } from "@/services/websocket";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type { StateMessage, ErrorMessage } from "@quiz-maker/ts";

export default function HostStart() {
  const { quizId = "" } = useParams();
  const navigate = useNavigate();
  const { createRoom } = useWebSocketService();
  const { state } = useWebSocket();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.isConnected) {
      setError("WebSocket not connected. Please wait...");
      return;
    }

    if (quizId) {
      // Default quiz settings
      const settings = {
        question_duration_ms: 30000,
        show_correctness: true,
        show_leaderboard: true,
        allow_reconnect: true,
      };

      // Create room via WebSocket
      createRoom(quizId, settings);
    }
  }, [quizId, state.isConnected, createRoom]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!state.lastMessage) return;

    const message = state.lastMessage;

    if (message.type === "state") {
      const stateData = message.data as StateMessage;
      // Navigate to the room with the PIN
      navigate(`/play/room/${stateData.room_id}?pin=${stateData.pin}`, {
        replace: true,
      });
    } else if (message.type === "error") {
      const errorData = message.data as ErrorMessage;
      setError(errorData.msg || "Failed to create room");
    }
  }, [state.lastMessage, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-6xl mb-6">❌</div>
        <h1 className="text-2xl font-bold mb-2 text-red-600">Error</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => navigate("/play", { replace: true })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎮</div>
      <h1 className="text-2xl font-bold mb-2">Starting your game…</h1>
      <p className="text-gray-600">
        {state.isConnecting
          ? "Connecting..."
          : "Creating a private room for this quiz."}
      </p>
    </div>
  );
}
