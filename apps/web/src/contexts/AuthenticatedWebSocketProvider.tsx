import React from "react";
import { WebSocketProvider } from "./WebSocketContext";
import { useAuth } from "@/auth/AuthContext";
import { config } from "@/config/env";

interface AuthenticatedWebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  requireAuth?: boolean;
}

/**
 * Enhanced WebSocket provider that automatically handles JWT authentication
 * Integrates with the auth token hook to provide seamless authentication
 */
export const AuthenticatedWebSocketProvider: React.FC<
  AuthenticatedWebSocketProviderProps
> = ({ children, url = config.socketUrl, requireAuth = true }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't render WebSocket provider if auth is required but not available
  if (requireAuth && !isLoading && !isAuthenticated) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="text-red-800 font-semibold">Authentication Required</h3>
        <p className="text-red-600 text-sm mt-1">
          Please log in to connect to the WebSocket service.
        </p>
      </div>
    );
  }

  return <WebSocketProvider url={url}>{children}</WebSocketProvider>;
};
