// Lightweight placeholder game service. Replace implementations with real API/websocket logic.
export type CategoryKey = string;

export interface PlayerInfo {
  id: string;
  name: string;
}

export interface RoomInfo {
  roomId: string;
  players: PlayerInfo[];
  hostId?: string;
  status: "waiting" | "in_progress" | "finished";
}

// Simulate network delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const gameService = {
  async createPrivateGameFromQuiz(quizId: string): Promise<{ roomId: string }> {
    await delay(400);
    // Generate a fake room id
    return { roomId: `R-${quizId}-${Math.floor(Math.random() * 9000 + 1000)}` };
  },

  async joinWithPin(pin: string): Promise<{ roomId: string }>{
    await delay(300);
    if (!/^\d{6}$/.test(pin)) throw new Error("Invalid PIN (use 6 digits)");
    return { roomId: `P-${pin}` };
  },

  async requestMatchmaking(category: CategoryKey): Promise<{ ticketId: string }>{
    await delay(500);
    return { ticketId: `TICKET-${category}-${Date.now()}` };
  },

  async pollMatchmaking(ticketId: string): Promise<{ roomId?: string }>{
    await delay(800);
    // 50% chance to match quickly
    if (Math.random() > 0.5) return { roomId: `MM-${ticketId.slice(-6)}` };
    return {};
  },

  async fetchRoom(roomId: string): Promise<RoomInfo>{
    await delay(200);
    return {
      roomId,
      players: [
        { id: "u1", name: "You" },
        { id: "u2", name: "Alex" },
      ],
      status: "waiting",
    };
  },

  async startGame(roomId: string): Promise<{ sessionId: string }>{
    await delay(300);
    return { sessionId: `S-${roomId}-${Date.now()}` };
  },

  // Quiz flow stubs
  async fetchNextQuestion(sessionId: string): Promise<{
    questionId: string;
    question: string;
    options: string[];
    index: number;
    total: number;
  }>{
    await delay(300);
    const idx = Math.floor(Math.random() * 5);
    return {
      questionId: `Q-${idx}`,
      question: `Sample question ${idx + 1}?`,
      options: ["A", "B", "C", "D"],
      index: idx + 1,
      total: 10,
    };
  },

  async submitAnswer(sessionId: string, questionId: string, optionIndex: number): Promise<{ correct: boolean; scoreDelta: number }>{
    await delay(250);
    const correct = Math.random() > 0.5;
    return { correct, scoreDelta: correct ? 100 : 0 };
  },

  async fetchFinalLeaderboard(sessionId: string): Promise<Array<{ id: string; name: string; score: number }>>{
    await delay(400);
    return [
      { id: "u2", name: "Alex", score: 950 },
      { id: "u1", name: "You", score: 840 },
      { id: "u3", name: "Sam", score: 720 },
    ];
  },
};
