import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWebSocketService } from "@/services/websocket";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useAuth } from "@/auth/AuthContext";
import type { StateMessage, ErrorMessage } from "@quiz-maker/ts";

export default function JoinWithPin() {
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinRoom } = useWebSocketService();
  const { state } = useWebSocket();
  const { user } = useAuth();

  // Set display name from user data
  useEffect(() => {
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user]);

  // Set PIN from URL parameters
  useEffect(() => {
    const pinFromUrl = searchParams.get("pin");
    if (pinFromUrl) {
      setPin(pinFromUrl.replace(/[^0-9]/g, "").slice(0, 6));
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!state.isConnected) {
      setError("WebSocket not connected. Please wait...");
      setLoading(false);
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter your display name");
      setLoading(false);
      return;
    }

    // Join room via WebSocket
    joinRoom(pin, displayName.trim());
  };

  // Handle WebSocket messages
  useEffect(() => {
    if (!state.lastMessage) return;

    const message = state.lastMessage;

    if (message.type === "state") {
      const stateData = message.data as StateMessage;
      setLoading(false);
      // Navigate to the room
      navigate(`/play/room/${stateData.room_id}?pin=${stateData.pin}`, {
        replace: true,
      });
    } else if (message.type === "error") {
      const errorData = message.data as ErrorMessage;
      setError(errorData.msg || "Failed to join room");
      setLoading(false);
    }
  }, [state.lastMessage, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Join with PIN</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            className="w-full rounded-md border px-4 py-3"
            required
          />
        </div>
        <div>
          <label htmlFor="pin" className="block text-sm font-medium mb-1">
            Room PIN
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            placeholder="Enter 6-digit PIN"
            className="w-full rounded-md border px-4 py-3"
            inputMode="numeric"
            autoFocus
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={
            loading ||
            pin.length !== 6 ||
            !displayName.trim() ||
            !state.isConnected
          }
          className="w-full rounded-md bg-primary text-white py-3 disabled:opacity-50">
          {loading ? "Joining..." : "Join Game"}
        </button>
        {!state.isConnected && (
          <p className="text-yellow-600 text-sm text-center">
            Connecting to server...
          </p>
        )}
      </form>
    </div>
  );
}
