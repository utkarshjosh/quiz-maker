import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameService } from "@/lib/game/service";

interface Q {
  questionId: string;
  question: string;
  options: string[];
  index: number;
  total: number;
}

export default function QuizPlay() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState<Q | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(0);
  const maxQuestions = 10; // placeholder limit

  const speak = useMemo(() => (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, []);

  const loadNext = async () => {
    setLoading(true);
    const next = await gameService.fetchNextQuestion(sessionId);
    setQ(next);
    setLoading(false);
    speak(next.question);
  };

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const choose = async (i: number) => {
    if (!q || submitting) return;
    setSubmitting(true);
    const res = await gameService.submitAnswer(sessionId, q.questionId, i);
    setScore((s) => s + res.scoreDelta);
    const nextCount = count + 1;
    setCount(nextCount);
    if (nextCount >= maxQuestions) {
      navigate(`/play/leaderboard/${sessionId}`);
    } else {
      await loadNext();
    }
    setSubmitting(false);
  };

  if (loading && !q) return <div className="px-4 py-12">Loading question…</div>;
  if (!q) return <div className="px-4 py-12">No question available.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">Question {count + 1} / {maxQuestions}</div>
        <div className="text-sm text-gray-600">Score: {score}</div>
      </div>
      <h1 className="text-2xl font-bold mb-6">{q.question}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {q.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => choose(idx)}
            disabled={submitting}
            className="rounded-xl border p-6 bg-white text-left hover:shadow-md disabled:opacity-50"
          >
            <div className="font-medium">{opt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
