import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center">
      <h1 className="text-3xl font-bold mb-6">How do you want to play?</h1>
      <p className="text-gray-600 mb-10">Join a private game with a PIN, or jump into a public room with people online.</p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          to="/play/join"
          className="block rounded-xl border p-8 hover:shadow-md transition bg-white"
        >
          <div className="text-5xl mb-4">🔢</div>
          <div className="text-xl font-semibold">Join with PIN</div>
          <div className="text-gray-500 mt-2 text-sm">Enter a 6-digit code to join a private room.</div>
        </Link>

        <Link
          to="/play/public"
          className="block rounded-xl border p-8 hover:shadow-md transition bg-white"
        >
          <div className="text-5xl mb-4">🌎</div>
          <div className="text-xl font-semibold">Play with People Online</div>
          <div className="text-gray-500 mt-2 text-sm">Pick a category and we’ll match you.</div>
        </Link>
      </div>
    </div>
  );
}
