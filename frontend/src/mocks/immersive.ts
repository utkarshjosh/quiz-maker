// Dummy data and helpers for the immersive quiz flow
export type ImmersiveQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string; correct?: boolean }[];
  durationSec: number;
};

export type ImmersivePlayer = {
  id: string;
  name: string;
  avatarUrl?: string;
  score: number;
};

export type ImmersiveQuiz = {
  id: string;
  title: string;
  questions: ImmersiveQuestion[];
};

export const DUMMY_QUIZ: ImmersiveQuiz = {
  id: "quiz-imm-001",
  title: "Pastel Planet Trivia",
  questions: [
    {
      id: "q1",
      text: "Which planet is known as the Red Planet?",
      durationSec: 15,
      options: [
        { id: "a", text: "Venus" },
        { id: "b", text: "Mars", correct: true },
        { id: "c", text: "Jupiter" },
        { id: "d", text: "Mercury" },
      ],
    },
    {
      id: "q2",
      text: "What is the largest ocean on Earth?",
      durationSec: 15,
      options: [
        { id: "a", text: "Indian Ocean" },
        { id: "b", text: "Atlantic Ocean" },
        { id: "c", text: "Pacific Ocean", correct: true },
        { id: "d", text: "Arctic Ocean" },
      ],
    },
    {
      id: "q3",
      text: "Which gas do plants primarily absorb for photosynthesis?",
      durationSec: 15,
      options: [
        { id: "a", text: "Oxygen" },
        { id: "b", text: "Nitrogen" },
        { id: "c", text: "Carbon Dioxide", correct: true },
        { id: "d", text: "Hydrogen" },
      ],
    },
  ],
};

export const DUMMY_PLAYERS: ImmersivePlayer[] = [
  { id: "p1", name: "Ava", score: 0 },
  { id: "p2", name: "Liam", score: 0 },
  { id: "p3", name: "Mia", score: 0 },
  { id: "p4", name: "Noah", score: 0 },
];

export function randomId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeScore(isCorrect: boolean, timeLeft: number, total: number) {
  // Simple scoring: base 1000 for correct, plus time bonus
  if (!isCorrect) return 0;
  const bonus = Math.round((timeLeft / Math.max(1, total)) * 500);
  return 1000 + bonus;
}
