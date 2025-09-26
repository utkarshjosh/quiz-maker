// Game service that integrates with WebSocket for real-time functionality
import type {
  StateMessage,
  QuestionMessage,
  RevealMessage,
  Member,
  LeaderEntry,
  QuizSettings,
} from "@quiz-maker/ts";

export type CategoryKey = string;

export interface PlayerInfo {
  id: string;
  name: string;
  role: "host" | "player";
  score: number;
  isOnline: boolean;
}

export interface RoomInfo {
  roomId: string;
  pin: string;
  hostId: string;
  players: PlayerInfo[];
  status: "lobby" | "question" | "reveal" | "intermission" | "ended";
  questionIndex: number;
  totalQuestions: number;
  settings: QuizSettings;
}

// WebSocket-based game service
export const gameService = {
  // These methods are now handled by WebSocket directly
  // Keeping them for backward compatibility but they should not be used
  async createPrivateGameFromQuiz(quizId: string): Promise<{ roomId: string }> {
    throw new Error("Use WebSocket createRoom instead");
  },

  async joinWithPin(pin: string): Promise<{ roomId: string }> {
    throw new Error("Use WebSocket joinRoom instead");
  },

  // Utility functions for WebSocket integration
  parseStateMessage(stateData: StateMessage): RoomInfo {
    return {
      roomId: stateData.room_id,
      pin: stateData.pin,
      hostId: stateData.host_id,
      players: stateData.members.map((member) => ({
        id: member.id,
        name: member.display_name,
        role: member.role,
        score: member.score,
        isOnline: member.is_online,
      })),
      status: stateData.phase as any,
      questionIndex: stateData.question_index,
      totalQuestions: stateData.total_questions,
      settings: stateData.settings,
    };
  },

  parseQuestionMessage(questionData: QuestionMessage) {
    return {
      questionId: `Q-${questionData.index}`,
      question: questionData.question,
      options: questionData.options,
      index: questionData.index,
      total: questionData.options.length,
      deadline: questionData.deadline_ms,
      duration: questionData.duration_ms,
    };
  },

  parseRevealMessage(revealData: RevealMessage) {
    return {
      questionIndex: revealData.index,
      correctChoice: revealData.correct_choice,
      correctIndex: revealData.correct_index,
      explanation: revealData.explanation,
      userStats: revealData.user_stats,
      leaderboard: revealData.leaderboard,
    };
  },

  // Legacy methods for backward compatibility - these should be replaced with WebSocket handlers
  async requestMatchmaking(
    category: CategoryKey
  ): Promise<{ ticketId: string }> {
    // This would need to be implemented with WebSocket
    throw new Error("Matchmaking not implemented yet");
  },

  async pollMatchmaking(ticketId: string): Promise<{ roomId?: string }> {
    // This would need to be implemented with WebSocket
    throw new Error("Matchmaking not implemented yet");
  },

  async fetchRoom(roomId: string): Promise<RoomInfo> {
    // This should be replaced with WebSocket state management
    throw new Error("Use WebSocket state instead");
  },

  async startGame(roomId: string): Promise<{ sessionId: string }> {
    // This should be replaced with WebSocket start message
    throw new Error("Use WebSocket startQuiz instead");
  },

  async fetchNextQuestion(sessionId: string): Promise<{
    questionId: string;
    question: string;
    options: string[];
    index: number;
    total: number;
  }> {
    // This should be replaced with WebSocket question message handling
    throw new Error("Use WebSocket question messages instead");
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    optionIndex: number
  ): Promise<{ correct: boolean; scoreDelta: number }> {
    // This should be replaced with WebSocket answer submission
    throw new Error("Use WebSocket submitAnswer instead");
  },

  async fetchFinalLeaderboard(
    sessionId: string
  ): Promise<Array<{ id: string; name: string; score: number }>> {
    // This should be replaced with WebSocket end message handling
    throw new Error("Use WebSocket end messages instead");
  },
};
