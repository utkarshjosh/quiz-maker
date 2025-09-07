import React, { useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

export const WebSocketTest: React.FC = () => {
  const { state, connect, disconnect, resetConnection, joinRoom } =
    useWebSocket();

  useEffect(() => {
    console.log("WebSocket state changed:", state);
  }, [state]);

  const handleJoinRoom = () => {
    console.log("Attempting to join room...");
    joinRoom("1234", "Test User");
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">WebSocket Test</h3>

      <div className="space-y-2 mb-4">
        <div>
          Status:{" "}
          {state.isConnected
            ? "Connected"
            : state.isConnecting
              ? "Connecting"
              : "Disconnected"}
        </div>
        <div>Authenticated: {state.isAuthenticated ? "Yes" : "No"}</div>
        <div>User ID: {state.userId || "None"}</div>
        {state.error && (
          <div className="text-red-600">Error: {state.error}</div>
        )}
        {state.lastMessage && (
          <div className="text-sm text-gray-600">
            Last Message: {JSON.stringify(state.lastMessage)}
          </div>
        )}
      </div>

      <div className="space-x-2">
        <button
          onClick={connect}
          disabled={state.isConnected || state.isConnecting}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300">
          Connect
        </button>

        <button
          onClick={disconnect}
          disabled={!state.isConnected}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:bg-gray-300">
          Disconnect
        </button>

        <button
          onClick={resetConnection}
          className="px-3 py-1 bg-yellow-500 text-white rounded">
          Reset
        </button>

        <button
          onClick={handleJoinRoom}
          disabled={!state.isConnected}
          className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-gray-300">
          Join Room
        </button>
      </div>
    </div>
  );
};
