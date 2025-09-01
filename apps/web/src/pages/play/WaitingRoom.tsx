import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gameService, RoomInfo } from "@/lib/game/service";

export default function WaitingRoom() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHost] = useState<boolean>(true); // TODO: detect from auth/session

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await gameService.fetchRoom(roomId);
      if (!alive) return;
      setRoom(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [roomId]);

  const start = async () => {
    if (!room) return;
    const { sessionId } = await gameService.startGame(room.roomId);
    navigate(`/play/quiz/${sessionId}`);
  };

  if (loading) return <div className="px-4 py-12">Loading room…</div>;
  if (!room) return <div className="px-4 py-12">Room not found</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Waiting Room</h1>
      <div className="text-gray-600 mb-6">Room ID: <code>{room.roomId}</code></div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Players</h2>
        <ul className="space-y-1">
          {room.players.map(p => (
            <li key={p.id} className="rounded-md border px-3 py-2">{p.name}</li>
          ))}
        </ul>
      </div>
      {isHost && (
        <button onClick={start} className="rounded-md bg-primary text-white px-4 py-2">Start Game</button>
      )}
    </div>
  );
}
