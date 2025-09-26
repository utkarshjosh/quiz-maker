import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  Message,
  MessageType,
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  JoinMessage,
  AnswerMessage,
  StartMessage,
  LeaveMessage,
  PingMessage,
} from "@quiz-maker/ts";
import {
  createJoinMessage,
  createAnswerMessage,
  createStartMessage,
  createLeaveMessage,
  createPingMessage,
} from "@quiz-maker/ts";
import { useAuth } from "@/auth/AuthContext";
import authService from "@/services/authService";

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: Message | null;
  isAuthenticated: boolean;
  userId: string | null;
}

interface WebSocketContextType {
  state: WebSocketState;
  sendMessage: (message: Message) => void;
  connect: () => void;
  disconnect: () => void;
  resetConnection: () => void;
  // Convenience methods for common message types
  joinRoom: (pin: string, displayName: string) => void;
  sendAnswer: (questionIndex: number, choice: string) => void;
  startQuiz: () => void;
  leaveRoom: () => void;
  ping: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = "ws://localhost:5000/ws",
}) => {
  const { isAuthenticated, user } = useAuth();

  // Core state - only essential values
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  // Refs for stable values that don't trigger re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isManualDisconnect = useRef(false);
  const lastConnectAttempt = useRef<number>(0);
  const shouldConnect = useRef(false);

  // Memoized state object to prevent unnecessary re-renders
  const state = useMemo<WebSocketState>(
    () => ({
      isConnected,
      isConnecting,
      error,
      lastMessage,
      isAuthenticated: isAuthenticated && !!user,
      userId: user?.id || null,
    }),
    [isConnected, isConnecting, error, lastMessage, isAuthenticated, user]
  );

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnected || isConnecting) return;

    // Prevent rapid reconnection attempts
    const now = Date.now();
    if (now - lastConnectAttempt.current < 1000) {
      return;
    }
    lastConnectAttempt.current = now;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      setError("Authentication required for WebSocket connection");
      setIsConnecting(false);
      return;
    }

    // Check if we've exceeded max reconnection attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError(
        `Connection failed after ${maxReconnectAttempts} attempts. Please refresh the page.`
      );
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get JWT token from API
      const getWebSocketToken = async () => {
        try {
          console.log("Fetching WebSocket JWT token from API...");
          const tokenData = await authService.getWebSocketToken();
          console.log("WebSocket token received:", {
            hasToken: !!tokenData.token,
            expiresIn: tokenData.expiresIn,
            user: tokenData.user,
          });
          return tokenData.token;
        } catch (error) {
          console.error("Failed to get WebSocket token:", error);
          return null;
        }
      };

      // Connect with token as query parameter
      getWebSocketToken()
        .then((token) => {
          if (!token) {
            setError("Failed to get authentication token");
            setIsConnecting(false);
            return;
          }

          const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
          const ws = new WebSocket(wsUrl, ["quiz-protocol"]);
          wsRef.current = ws;

          ws.onopen = () => {
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
            reconnectAttempts.current = 0;
            isManualDisconnect.current = false;
            console.log(
              "WebSocket connected and authenticated for user:",
              user?.email
            );
          };

          ws.onmessage = (event) => {
            try {
              const message: Message = JSON.parse(event.data);
              setLastMessage(message);
            } catch (error) {
              console.error("Failed to parse WebSocket message:", error);
            }
          };

          ws.onclose = (event) => {
            setIsConnected(false);
            setIsConnecting(false);

            // Don't attempt to reconnect if this was a manual disconnect
            if (isManualDisconnect.current) {
              return;
            }

            // Handle authentication errors
            if (
              event.code === 1008 ||
              event.code === 1002 ||
              event.code === 1003
            ) {
              setError("Authentication failed. Please log in again.");
              return; // Don't attempt to reconnect on auth errors
            }

            // Handle other close codes
            if (event.code === 1006) {
              setError("Connection lost. Attempting to reconnect...");
            }

            // Attempt to reconnect if not a normal closure and not an auth error
            if (
              event.code !== 1000 &&
              event.code !== 1008 &&
              event.code !== 1002 &&
              event.code !== 1003 &&
              reconnectAttempts.current < maxReconnectAttempts &&
              shouldConnect.current
            ) {
              const delay = Math.min(
                1000 * Math.pow(2, reconnectAttempts.current),
                30000 // Max delay of 30 seconds
              );

              setError(
                `Reconnecting in ${Math.round(delay / 1000)} seconds... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`
              );

              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttempts.current++;
                connect();
              }, delay);
            } else if (reconnectAttempts.current >= maxReconnectAttempts) {
              setError(
                `Connection failed after ${maxReconnectAttempts} attempts. Please refresh the page.`
              );
            }
          };

          ws.onerror = (error) => {
            setError("WebSocket connection error");
            setIsConnecting(false);
            console.error("WebSocket error:", error);
          };
        })
        .catch((error) => {
          setError("Failed to get authentication token");
          setIsConnecting(false);
          console.error("Token retrieval error:", error);
        });
    } catch (error) {
      setError("Failed to create WebSocket connection");
      setIsConnecting(false);
      console.error("Failed to create WebSocket:", error);
    }
  }, [url, isAuthenticated, user, isConnected, isConnecting]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    shouldConnect.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    (message: Message) => {
      if (wsRef.current && isConnected) {
        try {
          wsRef.current.send(JSON.stringify(message));
        } catch (error) {
          console.error("Failed to send message:", error);
          setError("Failed to send message");
        }
      } else {
        console.warn("WebSocket not connected, cannot send message");
      }
    },
    [isConnected]
  );

  // Convenience methods for common message types
  const joinRoom = useCallback(
    (pin: string, displayName: string) => {
      const message = createJoinMessage(pin, displayName);
      sendMessage(message);
    },
    [sendMessage]
  );

  const sendAnswer = useCallback(
    (questionIndex: number, choice: string) => {
      const message = createAnswerMessage(questionIndex, choice);
      sendMessage(message);
    },
    [sendMessage]
  );

  const startQuiz = useCallback(() => {
    const message = createStartMessage();
    sendMessage(message);
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    const message = createLeaveMessage();
    sendMessage(message);
  }, [sendMessage]);

  const ping = useCallback(() => {
    const message = createPingMessage();
    sendMessage(message);
  }, [sendMessage]);

  const resetConnection = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    isManualDisconnect.current = false;
    lastConnectAttempt.current = 0;
    shouldConnect.current = true;
    setError(null);
  }, [disconnect]);

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      shouldConnect.current = true;
      if (!isConnected && !isConnecting) {
        connect();
      }
    } else {
      shouldConnect.current = false;
      if (isConnected || isConnecting) {
        disconnect();
      }
    }
  }, [isAuthenticated, user, isConnected, isConnecting, connect, disconnect]); // Include all dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = {
    state,
    sendMessage,
    connect,
    disconnect,
    resetConnection,
    joinRoom,
    sendAnswer,
    startQuiz,
    leaveRoom,
    ping,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
