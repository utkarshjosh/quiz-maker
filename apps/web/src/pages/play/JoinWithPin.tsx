import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useGameManager, useGameActions } from "@/game/hooks/useGameManager";
import { getWebSocketService } from "@/game/services/WebSocketService";
import { MessageType } from "@quiz-maker/ts";
import type { Message, StateMessage, ErrorMessage } from "@quiz-maker/ts";
import { useAuth } from "@/auth/AuthContext";

export default function JoinWithPin() {
  // CRITICAL: Initialize game system (WebSocket + GameManager)
  useGameManager();

  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { joinRoom } = useGameActions();
  const { user } = useAuth();
  const hasJoinedRef = useRef(false);
  const hasAutoJoinedRef = useRef(false);
  
  // Get WebSocket service for status checking
  const wsService = getWebSocketService();
  const [isConnected, setIsConnected] = useState(wsService.isConnected());

  // Monitor WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onStatusChange((status) => {
      setIsConnected(status === 'connected');
    });
    return unsubscribe;
  }, [wsService]);

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

  // Auto-submit if PIN is already in URL
  useEffect(() => {
    const pinFromUrl = searchParams.get("pin");
    
    // Wait for connection before auto-joining
    if (!isConnected) {
      console.log("JoinWithPin: Waiting for connection before auto-join");
      return;
    }
    
    if (pinFromUrl && user?.name && !hasJoinedRef.current && !hasAutoJoinedRef.current) {
      console.log("JoinWithPin: Auto-joining with PIN", pinFromUrl, {
        isConnected,
        userName: user.name
      });
      hasAutoJoinedRef.current = true;
      setLoading(true);
      
      // Small delay to ensure GameManager is fully initialized
      setTimeout(() => {
        joinRoom(pinFromUrl, user.name);
      }, 100);
      // Don't set hasJoinedRef here - wait for successful state message
    }
  }, [searchParams, user?.name, isConnected, joinRoom]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!isConnected) {
      setError("WebSocket not connected. Please wait...");
      setLoading(false);
      return;
    }

    if (!displayName.trim()) {
      setError("Please enter your display name");
      setLoading(false);
      return;
    }

    if (!pin.trim()) {
      setError("Please enter a PIN");
      setLoading(false);
      return;
    }

    // Join room via game manager
    joinRoom(pin, displayName.trim());
  };

  // Handle WebSocket messages via new game system
  useEffect(() => {
    const handleMessage = (message: Message) => {
      if (hasJoinedRef.current) return;

      console.log("JoinWithPin: Processing message", {
        type: message.type,
        msgId: message.msg_id,
      });

      if (message.type === MessageType.STATE) {
        const stateData = message.data as StateMessage;
        console.log("JoinWithPin: State message received", {
          roomId: stateData.room_id,
          pin: stateData.pin,
          memberCount: stateData.members?.length || 0,
        });
        setLoading(false);
        setError(null);
        hasJoinedRef.current = true;
        setHasJoined(true);
        // Navigate to immersive lobby - WebSocket connection will persist
        navigate(`/play/room/${stateData.room_id}?pin=${stateData.pin}`, { replace: true });
      } else if (message.type === MessageType.ERROR) {
        const errorData = message.data as ErrorMessage;
        console.log("JoinWithPin: Error message received", errorData);
        setError(errorData.msg || "Failed to join room");
        setLoading(false);
        hasJoinedRef.current = false;
        hasAutoJoinedRef.current = false; // Reset so user can retry
      }
    };

    const unsubscribe = wsService.onMessage(handleMessage);
    return unsubscribe;
  }, [wsService, navigate]);

  // Otherwise show the join form with immersive UI
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex items-center justify-center relative overflow-hidden">
      {/* Floating Shapes Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-40 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-40 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-md px-6 py-12 w-full">
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-white/10">
          <h1 className="text-3xl font-bold mb-2 text-center">Join Game</h1>
          <p className="text-gray-400 text-center mb-8">Enter your PIN to join a private room</p>
          
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium mb-2 text-gray-300">
                Display Name
              </label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label htmlFor="pin" className="block text-sm font-medium mb-2 text-gray-300">
                Room PIN
              </label>
              <input
                id="pin"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                placeholder="000 000"
                className="w-full rounded-lg bg-white/10 border border-white/20 text-white px-4 py-3 text-center text-2xl tracking-widest placeholder:text-gray-600 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                inputMode="numeric"
                autoFocus
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={
                loading ||
                !pin.trim() ||
                !displayName.trim() ||
                !isConnected
              }
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg">
              {loading ? "Joining..." : "Join Game"}
            </button>
            
            {!isConnected && (
              <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                <span>Connecting to server...</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
