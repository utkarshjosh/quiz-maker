import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "science",
  "history",
  "sports",
  "entertainment",
  "geography",
  "literature",
  "technology",
  "general",
];

export default function PublicCategory() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Pick a Category</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => navigate(`/play/match/${c}`)}
            className="rounded-xl border p-6 bg-white hover:shadow-md capitalize"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
