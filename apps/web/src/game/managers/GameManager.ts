/**
 * Game Manager - Orchestrates game logic and integrates WebSocket with Game State
 * Unity-style: Manager pattern that handles business logic and state synchronization
 *
 * This is the bridge between WebSocket messages and Zustand state
 */

import { MessageType } from "@quiz-maker/ts";
import type {
  Message,
  StateMessage,
  QuestionMessage,
  Member,
  HostTransferMessage,
  EndMessage,
} from "@quiz-maker/ts";
import { useGameStore } from "../store/gameStore";
import { getWebSocketService } from "../services/WebSocketService";
import { resetGlobalFlags } from "../utils/flags";
import type { Player, Question, GameScene, GameStatus } from "../types";
import { getSoundEngine } from "./SoundEngine";
import type { SoundKey } from "../config/soundConfig";

export class GameManager {
  private wsService = getWebSocketService();
  private soundEngine = getSoundEngine();
  private unsubscribers: Array<() => void> = [];
  private lastScene: GameScene = useGameStore.getState().currentScene;
  private lastStatus: GameStatus = useGameStore.getState().status;
  private lastQuestionSignature: string | null = null;

  /**
   * Initialize the game manager
   */
  async initialize(): Promise<void> {
    console.log("[GameManager] Initializing...");

    // Initialize sound engine
    try {
      await this.soundEngine.initialize();
      console.log("[GameManager] Sound engine ready");
    } catch (error) {
      console.error("[GameManager] Sound engine initialization failed:", error);
      // Continue without sound
    }

    // Subscribe to WebSocket messages
    const unsubMessage = this.wsService.onMessage(
      this.handleMessage.bind(this)
    );
    const unsubStatus = this.wsService.onStatusChange(
      this.handleStatusChange.bind(this)
    );
    const unsubError = this.wsService.onError(this.handleError.bind(this));

    this.unsubscribers.push(unsubMessage, unsubStatus, unsubError);
  }

  /**
   * Cleanup when destroying
   */
  destroy(): void {
    console.log("[GameManager] Destroying...");
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Note: We don't destroy the sound engine here as it's a singleton
    // that may be used across different game sessions
  }

  // ==================== Sound Methods ====================

  /**
   * Play a sound effect
   */
  playSound(soundKey: SoundKey): void {
    console.log(`[GameManager] playSound called: ${soundKey}`);
    this.soundEngine.play(soundKey).catch((error) => {
      console.error(`[GameManager] Failed to play sound ${soundKey}:`, error);
    });
  }

  /**
   * Set sound enabled/disabled
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEngine.setEnabled(enabled);
  }

  /**
   * Get sound enabled state
   */
  isSoundEnabled(): boolean {
    return this.soundEngine.getEnabled();
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void {
    this.soundEngine.setMasterVolume(volume);
  }

  // ==================== Game Actions ====================

  /**
   * Create a new room (host action)
   */
  createRoom(quizId: string): void {
    console.log("[GameManager] Creating room for quiz:", quizId);

    // Check connection before creating room
    if (!this.wsService.isConnected()) {
      console.error(
        "[GameManager] Cannot create room - WebSocket not connected"
      );
      useGameStore
        .getState()
        .setError("Not connected to server. Please wait...");
      useGameStore.getState().setLoading(false);
      return;
    }

    useGameStore.getState().setIsHost(true);
    useGameStore.getState().setStatus("waiting");
    useGameStore.getState().setLoading(true);
    useGameStore.getState().setError(null);

    this.wsService.createRoom(quizId, {
      question_duration_ms: 30000,
      show_correctness: true,
      show_leaderboard: true,
      allow_reconnect: true,
    });
  }

  /**
   * Join an existing room
   */
  joinRoom(pin: string, displayName: string): void {
    console.log("[GameManager] Joining room with PIN:", pin);

    // Check connection before joining room
    if (!this.wsService.isConnected()) {
      console.error("[GameManager] Cannot join room - WebSocket not connected");
      useGameStore
        .getState()
        .setError("Not connected to server. Please wait...");
      useGameStore.getState().setLoading(false);
      return;
    }

    useGameStore.getState().setIsHost(false);
    useGameStore.getState().setStatus("waiting");
    useGameStore.getState().setLoading(true);
    useGameStore.getState().setError(null);

    this.wsService.joinRoom(pin, displayName);
  }

  /**
   * Start the quiz (host action)
   */
  startQuiz(): void {
    console.log("[GameManager] Starting quiz");

    const state = useGameStore.getState();
    if (!state.isHost) {
      console.warn("[GameManager] Only host can start quiz");
      return;
    }

    this.wsService.startQuiz();
  }

  /**
   * Submit an answer
   */
  submitAnswer(answer: string): void {
    const state = useGameStore.getState();
    const questionIndex = state.currentQuestionIndex;

    console.log("[GameManager] Submitting answer:", { questionIndex, answer });

    // Update local state immediately for responsive UI
    state.submitAnswer(questionIndex, answer);

    // Send to server
    this.wsService.submitAnswer(questionIndex, answer);
  }

  /**
   * Leave the room
   */
  leaveRoom(): void {
    console.log("[GameManager] Leaving room");
    this.wsService.leaveRoom();
    useGameStore.getState().resetGame();
  }

  // ==================== Message Handlers ====================

  private handleMessage(message: Message): void {
    console.log("[GameManager] Received message:", message.type);

    switch (message.type) {
      case MessageType.STATE:
        this.handleStateMessage(message.data as StateMessage);
        break;

      case MessageType.QUESTION:
        this.handleQuestionMessage(message.data as QuestionMessage);
        break;

      case MessageType.JOINED:
        this.handleJoinedMessage(message.data);
        break;

      case MessageType.LEFT:
        this.handleLeftMessage(message.data);
        break;

      case "left": // Handle both formats
        this.handleLeftMessage(message.data);
        break;

      case MessageType.START:
        this.handleStartMessage(message.data);
        break;

      case MessageType.REVEAL:
        this.handleRevealMessage(message.data);
        break;

      case MessageType.SCORE:
        this.handleScoreMessage(message.data);
        break;

      case MessageType.END:
        this.handleEndMessage(message.data);
        break;

      case MessageType.ERROR:
        this.handleErrorMessage(message.data);
        break;

      case "host_transfer":
        this.handleHostTransferMessage(message.data as HostTransferMessage);
        break;

      default:
        console.log("[GameManager] Unhandled message type:", message.type);
    }
  }

  private handleStateMessage(data: StateMessage): void {
    console.log("[GameManager] State update:", data);

    const store = useGameStore.getState();

    // Align scene/status with server phase when available
    if (data.phase) {
      const scene = this.mapPhaseToScene(data.phase);
      if (scene) {
        this.updateScene(scene);
      }

      const status = this.mapPhaseToStatus(data.phase);
      if (status) {
        this.updateStatus(status);
      }
    }

    if (
      typeof data.total_questions === "number" &&
      store.totalQuestions !== data.total_questions
    ) {
      store.setTotalQuestions(data.total_questions);
    }

    if (
      typeof data.question_index === "number" &&
      store.currentQuestionIndex !== data.question_index
    ) {
      store.setCurrentQuestionIndex(data.question_index);
    }

    // Update room info
    if (data.pin && data.room_id) {
      store.setRoom({
        id: data.room_id,
        pin: data.pin,
        quizId: (data as { quiz_id?: string }).quiz_id || "",
        hostId: data.host_id || "",
        settings: {
          questionDurationMs: 30000,
          showCorrectness: true,
          showLeaderboard: true,
          allowReconnect: true,
        },
      });
    }

    // Update players
    if (data.members) {
      const players: Player[] = data.members.map((member: Member) => ({
        id: member.id,
        name: member.display_name,
        avatar: "", // Avatar generated client-side
        score: member.score || 0,
        isHost: member.id === data.host_id,
        role: member.role || (member.id === data.host_id ? "host" : "player"),
      }));

      store.setPlayers(players);

      // Debug: Log role detection
      const currentPlayerId = store.currentPlayerId;
      const currentPlayer = players.find((p) => p.id === currentPlayerId);
      console.log("[GameManager] Current player check:", {
        currentPlayerId,
        currentPlayerFound: !!currentPlayer,
        currentPlayerRole: currentPlayer?.role,
        currentPlayerIsHost: currentPlayer?.isHost,
        hostId: data.host_id,
      });
    }

    if (store.isLoading) {
      store.setLoading(false);
    }
  }

  private handleQuestionMessage(data: QuestionMessage): void {
    console.log("[GameManager] New question:", data);

    const questionSignature = `${data.index}:${data.question}`;
    const store = useGameStore.getState();

    const isNewQuestion = this.lastQuestionSignature !== questionSignature;

    const timeLimitSeconds = Math.max(
      1,
      Math.round((data.duration_ms ?? 30000) / 1000)
    );

    const question: Question = {
      id: String(data.index),
      question: data.question,
      options: data.options,
      answer: (data as { correct_answer?: string }).correct_answer || "",
      timeLimit: timeLimitSeconds,
    };

    if (isNewQuestion) {
      store.setQuestion(question, data.index);
      this.lastQuestionSignature = questionSignature;
    } else if (store.currentQuestionIndex !== data.index) {
      store.setCurrentQuestionIndex(data.index);
    }

    if (typeof data.deadline_ms === "number") {
      const timeRemainingSeconds = Math.max(
        0,
        Math.ceil((data.deadline_ms - Date.now()) / 1000)
      );
      if (store.timeRemaining !== timeRemainingSeconds) {
        store.setTimeRemaining(timeRemainingSeconds);
      }
    }

    this.updateScene("quiz");
    this.updateStatus("playing");
    if (store.isLoading) {
      store.setLoading(false);
    }
  }

  private mapPhaseToScene(phase: string): GameScene | null {
    switch (phase) {
      case "lobby":
        return "lobby";
      case "question":
        return "quiz";
      case "reveal":
      case "intermission":
        return "reveal";
      case "ended":
        return "leaderboard";
      default:
        return null;
    }
  }

  private mapPhaseToStatus(phase: string): GameStatus | null {
    switch (phase) {
      case "lobby":
        return "waiting";
      case "question":
        return "playing";
      case "reveal":
      case "intermission":
        return "revealing";
      case "ended":
        return "finished";
      default:
        return null;
    }
  }

  private updateScene(scene: GameScene): void {
    if (this.lastScene === scene) {
      return;
    }
    useGameStore.getState().setScene(scene);
    this.lastScene = scene;
  }

  private updateStatus(status: GameStatus): void {
    if (this.lastStatus === status) {
      return;
    }
    useGameStore.getState().setStatus(status);
    this.lastStatus = status;
  }

  private handleJoinedMessage(data: unknown): void {
    console.log("[GameManager] Player joined:", data);
    this.playSound("ROOM_JOIN");
    const joinedData = data as { member?: Member };
    if (joinedData.member) {
      const player: Player = {
        id: joinedData.member.id,
        name: joinedData.member.display_name,
        avatar: "",
        score: joinedData.member.score || 0,
        role: joinedData.member.role,
      };

      useGameStore.getState().addPlayer(player);
    }
  }

  private handleLeftMessage(data: unknown): void {
    console.log("[GameManager] Player left:", data);

    const leftData = data as { user_id?: string; UserID?: string };
    const userIdToRemove = leftData.user_id || leftData.UserID;
    if (userIdToRemove) {
      this.playSound("ROOM_LEAVE");
      useGameStore.getState().removePlayer(userIdToRemove);

      // If current user left, reset game state
      const currentPlayerId = useGameStore.getState().currentPlayerId;
      if (userIdToRemove === currentPlayerId) {
        console.log("[GameManager] Current user left room - resetting game");
        useGameStore.getState().resetGame();
      }
    }
  }

  private handleStartMessage(data: unknown): void {
    console.log("[GameManager] Quiz starting:", data);

    this.playSound("GAME_START");

    const store = useGameStore.getState();
    const startData = data as { question_count?: number };

    this.updateStatus("playing");
    this.updateScene("quiz");

    if (startData.question_count) {
      store.setTotalQuestions(startData.question_count);
    }
  }

  private handleRevealMessage(data: unknown): void {
    console.log("[GameManager] Answer reveal:", data);

    const revealData = data as {
      index: number;
      correct_choice: string;
      correct_index: number;
      explanation?: string;
      user_stats: Array<{
        user_id: string;
        display_name: string;
        answer?: string;
        is_correct: boolean;
        time_taken_ms: number;
        score_delta: number;
      }>;
      leaderboard: Array<{
        user_id: string;
        display_name: string;
        score: number;
        rank: number;
        correct_answers: number;
        total_answered: number;
      }>;
    };

    const store = useGameStore.getState();

    // Update player scores and streaks from leaderboard
    if (revealData.leaderboard) {
      revealData.leaderboard.forEach((entry) => {
        store.updatePlayer(entry.user_id, {
          score: entry.score,
        });
      });
    }

    // Set reveal data for the reveal scene
    const playerResults = revealData.user_stats.map((stat) => ({
      userId: stat.user_id,
      displayName: stat.display_name,
      answer: stat.answer,
      isCorrect: stat.is_correct,
      timeTakenMs: stat.time_taken_ms,
      scoreDelta: stat.score_delta,
    }));

    store.setRevealData({
      questionIndex: revealData.index,
      correctAnswer: revealData.correct_choice,
      correctIndex: revealData.correct_index,
      explanation: revealData.explanation,
      playerResults,
    });

    // Transition to reveal scene
    this.updateScene("reveal");
    this.updateStatus("revealing");

    // Play reveal sound
    this.playSound("CORRECT"); // Or different sound for reveal
  }

  private handleScoreMessage(data: unknown): void {
    console.log("[GameManager] Score update:", data);

    const scoreData = data as { scores?: Record<string, number> };
    if (scoreData.scores) {
      const store = useGameStore.getState();

      // Update each player's score
      Object.entries(scoreData.scores).forEach(([playerId, score]) => {
        store.updatePlayer(playerId, { score: score as number });
      });
    }
  }

  private handleEndMessage(data: unknown): void {
    console.log("[GameManager] Quiz ended:", data);

    const store = useGameStore.getState();
    const endData = data as EndMessage;

    if (Array.isArray(endData?.final_leaderboard)) {
      const finalLeaderboard = endData.final_leaderboard.map((entry) => ({
        userId: entry.user_id,
        displayName: entry.display_name,
        score: entry.score,
        rank: entry.rank,
        correctAnswers: entry.correct_answers,
        totalAnswered: entry.total_answered,
      }));

      store.setFinalLeaderboard(finalLeaderboard);

      const leaderboardById = new Map(
        endData.final_leaderboard.map((entry) => [entry.user_id, entry])
      );

      const updatedPlayers = store.players.map((player) => {
        const entry = leaderboardById.get(player.id);
        if (!entry) {
          return player;
        }
        return {
          ...player,
          score: entry.score,
        };
      });

      const missingPlayers = endData.final_leaderboard
        .filter((entry) => !updatedPlayers.some((player) => player.id === entry.user_id))
        .map((entry) => ({
          id: entry.user_id,
          name: entry.display_name,
          avatar: "",
          score: entry.score,
          role: undefined,
        }));

      const mergedPlayers = [...updatedPlayers, ...missingPlayers].sort(
        (a, b) => b.score - a.score
      );

      store.setPlayers(mergedPlayers);
    } else {
      store.setFinalLeaderboard([]);
    }

    if (endData?.quiz_stats) {
      const {
        total_questions,
        total_participants,
        average_score,
        completion_rate,
        duration_ms,
      } = endData.quiz_stats;

      store.setQuizStats({
        totalQuestions: total_questions,
        totalParticipants: total_participants,
        averageScore: average_score,
        completionRate: completion_rate,
        durationMs: duration_ms,
      });

      if (typeof total_questions === "number") {
        store.setTotalQuestions(total_questions);
      }
    } else {
      store.setQuizStats(null);
    }

    this.updateScene("leaderboard");
    this.updateStatus("finished");
  }

  private handleErrorMessage(data: unknown): void {
    console.error("[GameManager] Error:", data);

    const errorData = data as { message?: string };
    const message = errorData.message || "An error occurred";
    useGameStore.getState().setError(message);
    useGameStore.getState().setLoading(false);
  }

  private handleHostTransferMessage(data: HostTransferMessage): void {
    console.log("[GameManager] Host transfer:", data);

    const store = useGameStore.getState();

    // Update the players - set new host role
    const players = store.players.map((player) => {
      if (player.id === data.new_host_id) {
        return {
          ...player,
          role: "host" as const,
          isHost: true,
        };
      } else if (player.id === data.old_host_id) {
        return {
          ...player,
          role: "player" as const,
          isHost: false,
        };
      }
      return player;
    });

    store.setPlayers(players);

    // Update room host ID
    if (store.room) {
      store.setRoom({
        ...store.room,
        hostId: data.new_host_id,
      });
    }

    // Log for user
    console.log(`[GameManager] 👑 ${data.new_host_name} is now the host!`);

    // Optional: Show a toast notification
    // Could integrate with your toast system here
    // toast.info(`${data.new_host_name} is now the host!`);
  }

  private handleStatusChange(status: string): void {
    console.log("[GameManager] Connection status:", status);

    // You could update a connection indicator in the UI here
    if (status === "disconnected") {
      useGameStore.getState().setError("Disconnected from server");
    } else if (status === "connected") {
      useGameStore.getState().setError(null);
    }
  }

  private handleError(error: Error): void {
    console.error("[GameManager] WebSocket error:", error);
    useGameStore.getState().setError(error.message);
  }
}

// Singleton instance
let gameManagerInstance: GameManager | null = null;

/**
 * Get or create the game manager instance
 * Note: Call initialize() on the returned instance to fully initialize
 */
export function getGameManager(): GameManager {
  if (!gameManagerInstance) {
    gameManagerInstance = new GameManager();
  }
  return gameManagerInstance;
}

/**
 * Destroy the game manager instance
 */
export function destroyGameManager(): void {
  if (gameManagerInstance) {
    gameManagerInstance.destroy();
    gameManagerInstance = null;
  }

  // Reset global flags so game can be re-initialized
  resetGlobalFlags();
}
