import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { gameService } from "@/lib/game/service";

export default function LeaderboardFinal() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Array<{ id: string; name: string; score: number }> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await gameService.fetchFinalLeaderboard(sessionId);
      if (!alive) return;
      setBoard(data);
    })();
    return () => { alive = false; };
  }, [sessionId]);

  if (!board) return <div className="px-4 py-12">Loading leaderboard…</div>;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Final Leaderboard</h1>
      <ol className="space-y-2">
        {board.map((p, idx) => (
          <li key={p.id} className="rounded-md border p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 text-center font-semibold">{idx + 1}</div>
              <div>{p.name}</div>
            </div>
            <div className="font-mono">{p.score}</div>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex gap-3">
        <button onClick={() => navigate("/")} className="rounded-md border px-4 py-2">Exit</button>
        <button onClick={() => navigate("/play/public")} className="rounded-md bg-primary text-white px-4 py-2">Play Again</button>
      </div>
    </div>
  );
}
