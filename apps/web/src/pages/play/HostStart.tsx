import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameService } from "@/lib/game/service";

export default function HostStart() {
  const { quizId = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { roomId } = await gameService.createPrivateGameFromQuiz(quizId);
        if (!alive) return;
        navigate(`/play/room/${roomId}`, { replace: true });
      } catch (e) {
        // Fallback: go to play landing on error
        navigate("/play", { replace: true });
      }
    })();
    return () => { alive = false; };
  }, [quizId, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎮</div>
      <h1 className="text-2xl font-bold mb-2">Starting your game…</h1>
      <p className="text-gray-600">Creating a private room for this quiz.</p>
    </div>
  );
}
