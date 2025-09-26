import React, { useState, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useWebSocketService } from "@/services/websocket";
import type {
  StateMessage,
  ErrorMessage,
  QuestionMessage,
  RevealMessage,
} from "@quiz-maker/ts";

const WebSocketTest: React.FC = () => {
  const { state } = useWebSocket();
  const { createRoom, joinRoom, startQuiz, submitAnswer, leaveRoom } =
    useWebSocketService();
  const [messages, setMessages] = useState<any[]>([]);
  const [testQuizId, setTestQuizId] = useState("test-quiz-123");
  const [testPin, setTestPin] = useState("");
  const [testDisplayName, setTestDisplayName] = useState("Test User");

  // Add new messages to the log
  useEffect(() => {
    if (state.lastMessage) {
      setMessages((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: state.lastMessage!.type,
          data: state.lastMessage!.data,
        },
      ]);
    }
  }, [state.lastMessage]);

  const handleCreateRoom = () => {
    const settings = {
      question_duration_ms: 30000,
      show_correctness: true,
      show_leaderboard: true,
      allow_reconnect: true,
    };
    createRoom(testQuizId, settings);
  };

  const handleJoinRoom = () => {
    if (testPin.length === 6) {
      joinRoom(testPin, testDisplayName);
    } else {
      alert("Please enter a 6-digit PIN");
    }
  };

  const handleStartQuiz = () => {
    startQuiz();
  };

  const handleSubmitAnswer = () => {
    submitAnswer(0, "A");
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">WebSocket Test Component</h1>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">Connected:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-sm ${
                state.isConnected
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
              {state.isConnected ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-medium">Connecting:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-sm ${
                state.isConnecting
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
              {state.isConnecting ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-medium">Authenticated:</span>
            <span
              className={`ml-2 px-2 py-1 rounded text-sm ${
                state.isAuthenticated
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
              {state.isAuthenticated ? "Yes" : "No"}
            </span>
          </div>
          <div>
            <span className="font-medium">User ID:</span>
            <span className="ml-2 text-sm text-gray-600">
              {state.userId || "None"}
            </span>
          </div>
        </div>
        {state.error && (
          <div className="mt-2 p-2 bg-red-100 text-red-800 rounded text-sm">
            Error: {state.error}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Controls</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quiz ID</label>
            <input
              type="text"
              value={testQuizId}
              onChange={(e) => setTestQuizId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter quiz ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={testDisplayName}
              onChange={(e) => setTestDisplayName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter display name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={handleCreateRoom}
            disabled={!state.isConnected}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Create Room
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={testPin}
              onChange={(e) =>
                setTestPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
              }
              className="flex-1 p-2 border rounded"
              placeholder="PIN"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              disabled={!state.isConnected || testPin.length !== 6}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Join
            </button>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={!state.isConnected}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Start Quiz
          </button>

          <button
            onClick={handleSubmitAnswer}
            disabled={!state.isConnected}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Submit Answer
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleLeaveRoom}
            disabled={!state.isConnected}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
            Leave Room
          </button>

          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Clear Messages
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          Message Log ({messages.length})
        </h2>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No messages yet</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="p-3 bg-white rounded border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-blue-600">{msg.type}</span>
                  <span className="text-sm text-gray-500">{msg.timestamp}</span>
                </div>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(msg.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketTest;
