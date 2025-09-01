import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameService } from "@/lib/game/service";

export default function Matchmaking() {
  const { category = "general" } = useParams();
  const navigate = useNavigate();
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [searching, setSearching] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { ticketId } = await gameService.requestMatchmaking(category);
      if (!alive) return;
      setTicketId(ticketId);
    })();
    return () => { alive = false; if (timer.current) window.clearTimeout(timer.current); };
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (!ticketId) return;
      const { roomId } = await gameService.pollMatchmaking(ticketId);
      if (cancelled) return;
      if (roomId) {
        setSearching(false);
        navigate(`/play/room/${roomId}`);
      } else {
        timer.current = window.setTimeout(poll, 1200);
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [ticketId, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold mb-2">Searching for players…</h1>
      <p className="text-gray-600 mb-8 capitalize">Category: {category}</p>
      <button
        onClick={() => navigate("/play/public")}
        className="rounded-md border px-4 py-2"
      >
        Cancel
      </button>
    </div>
  );
}
