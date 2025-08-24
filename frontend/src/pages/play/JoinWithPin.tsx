import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { gameService } from "@/lib/game/service";

export default function JoinWithPin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { roomId } = await gameService.joinWithPin(pin);
      navigate(`/play/room/${roomId}`);
    } catch (err: any) {
      setError(err.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Join with PIN</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0,6))}
          placeholder="Enter 6-digit PIN"
          className="w-full rounded-md border px-4 py-3"
          inputMode="numeric"
          autoFocus
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading || pin.length !== 6}
          className="w-full rounded-md bg-primary text-white py-3 disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join Game"}
        </button>
      </form>
    </div>
  );
}
