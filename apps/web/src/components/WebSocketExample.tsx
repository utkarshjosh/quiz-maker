import React, { useState } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useWebSocketMessages } from "@/hooks/useWebSocketMessages";
import { useAuth } from "@/auth/AuthContext";
import type {
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  Member,
} from "@quiz-maker/ts";

/**
 * Example component demonstrating WebSocket integration with type safety
 */
export const WebSocketExample: React.FC = () => {
  const { state, joinRoom, sendAnswer, startQuiz, leaveRoom, ping } =
    useWebSocket();
  const { isAuthenticated, user, login, logout } = useAuth();
  const [roomPin, setRoomPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionMessage | null>(null);
  const [roomState, setRoomState] = useState<StateMessage | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Handle different message types with type safety
  const messageHandlers = {
    onState: (message: StateMessage) => {
      console.log("Room state updated:", message);
      setRoomState(message);
      setMembers(message.members);
    },

    onQuestion: (message: QuestionMessage) => {
      console.log("New question:", message);
      setCurrentQuestion(message);
    },

    onReveal: (message: RevealMessage) => {
      console.log("Answer revealed:", message);
      setCurrentQuestion(null);
    },

    onError: (message: ErrorMessage) => {
      console.error("WebSocket error:", message);
      alert(`Error: ${message.msg}`);
    },

    onJoined: (message) => {
      console.log("User joined:", message);
    },

    onLeft: (message) => {
      console.log("User left:", message);
    },

    onKicked: (message) => {
      console.log("User kicked:", message);
    },

    onScore: (message) => {
      console.log("Score update:", message);
    },

    onEnd: (message) => {
      console.log("Quiz ended:", message);
    },

    onPong: (message) => {
      console.log("Pong received:", message);
    },

    onUnknown: (message) => {
      console.log("Unknown message type:", message);
    },
  };

  const { isConnected, isConnecting, error } =
    useWebSocketMessages(messageHandlers);

  const handleJoinRoom = () => {
    if (roomPin && displayName) {
      joinRoom(roomPin, displayName);
    }
  };

  const handleAnswer = (choice: string) => {
    if (currentQuestion) {
      sendAnswer(currentQuestion.index, choice);
    }
  };

  const handleStartQuiz = () => {
    startQuiz();
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setRoomState(null);
    setCurrentQuestion(null);
    setMembers([]);
  };

  const handlePing = () => {
    ping();
  };

  const handleLogin = () => {
    login();
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WebSocket Integration Example</h1>

      {/* Authentication Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p>
              <strong>Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
            </p>
            {user && (
              <>
                <p>
                  <strong>User ID:</strong> {user.id}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Name:</strong> {user.name || "N/A"}
                </p>
                <p>
                  <strong>Email Verified:</strong>{" "}
                  {user.emailVerified ? "Yes" : "No"}
                </p>
              </>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              {!isAuthenticated ? (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Login with Auth0
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-500"}`}
          />
          <span>
            {isConnected
              ? "Connected & Authenticated"
              : isConnecting
                ? "Connecting..."
                : "Disconnected"}
          </span>
          {error && <span className="text-red-500">Error: {error}</span>}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <p>WebSocket: {state.isConnected ? "Connected" : "Disconnected"}</p>
          <p>
            Authentication:{" "}
            {state.isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </p>
          {state.userId && <p>User ID: {state.userId}</p>}
        </div>
      </div>

      {/* Join Room */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Join Room</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Room PIN"
            value={roomPin}
            onChange={(e) => setRoomPin(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!isConnected || !roomPin || !displayName}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300">
            Join Room
          </button>
        </div>
      </div>

      {/* Room State */}
      {roomState && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Room State</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Room ID:</strong> {roomState.room_id}
              </p>
              <p>
                <strong>PIN:</strong> {roomState.pin}
              </p>
              <p>
                <strong>Phase:</strong> {roomState.phase}
              </p>
              <p>
                <strong>Question:</strong> {roomState.question_index + 1} /{" "}
                {roomState.total_questions}
              </p>
            </div>
            <div>
              <p>
                <strong>Host ID:</strong> {roomState.host_id}
              </p>
              <p>
                <strong>Members:</strong> {roomState.members.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Room Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${member.is_online ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <span>{member.display_name}</span>
                  <span className="text-sm text-gray-500">({member.role})</span>
                </div>
                <span className="font-semibold">{member.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Current Question</h2>
          <p className="mb-4">{currentQuestion.question}</p>
          <div className="grid grid-cols-1 gap-2">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className="p-3 text-left border rounded hover:bg-gray-50">
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Controls</h2>
        <div className="flex gap-2">
          <button
            onClick={handleStartQuiz}
            disabled={!isConnected || !roomState}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300">
            Start Quiz
          </button>
          <button
            onClick={handleLeaveRoom}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300">
            Leave Room
          </button>
          <button
            onClick={handlePing}
            disabled={!isConnected}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300">
            Ping
          </button>
        </div>
      </div>

      {/* Last Message */}
      {state.lastMessage && (
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Last Message</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(state.lastMessage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
