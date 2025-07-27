import { Category, Filter, Quiz } from "@/domain/schema";

export const mockCategories: Category[] = [
  { id: "start", name: "Start", icon: "Home", count: null, color: "text-blue-500", path: "/" },
  { id: "art", name: "Art & Literature", icon: "Palette", count: 1138, color: "text-pink-500", path: "/art" },
  { id: "entertainment", name: "Entertainment", icon: "Gamepad", count: 1138, color: "text-pink-500", path: "/entertainment" },
  { id: "geography", name: "Geography", icon: "Globe2", count: 892, color: "text-green-500", path: "/geography" },
  { id: "history", name: "History", icon: "BookOpenCheck", count: 654, color: "text-yellow-500", path: "/history" },
  { id: "languages", name: "Languages", icon: "Languages", count: 423, color: "text-purple-500", path: "/languages" },
  { id: "science", name: "Science & Nature", icon: "FlaskConical", count: 587, color: "text-blue-500", path: "/science" },
  { id: "sports", name: "Sports", icon: "Medal", count: 298, color: "text-orange-500", path: "/sports" },
  { id: "trivia", name: "Trivia", icon: "Brain", count: 756, color: "text-red-500", path: "/trivia" },
];

export const mockQuizzes: Quiz[] = [
  {
    id: "1",
    title: "Art History Basics",
    thumbnail: "/src/assets/quiz-history.jpg",
    date: "2024-03-20",
    aiGenerated: true,
    rating: 4.5,
    creator: "ArtLover",
    viewCount: 1200,
    categoryId: "art",
    difficulty: "easy",
    badges: ["AI Generated"],
  },
  {
    id: "2",
    title: "Modern Art Movements",
    thumbnail: "/src/assets/quiz-history.jpg",
    date: "2024-03-19",
    rating: 4.2,
    creator: "ModernArtist",
    viewCount: 800,
    categoryId: "art",
    subcategoryId: "modern-art",
    difficulty: "medium",
  },
  // Add more mock quizzes...
];

export const getBaseFilters = (counts: Record<string, number>): Filter[] => [
  { id: "all", name: "All", count: counts.all || 0, active: true },
  { id: "newest", name: "Newest", count: counts.newest || 0 },
  { id: "popular", name: "Popular", count: counts.popular || 0 },
  { id: "ai-generated", name: "AI Generated", count: counts.aiGenerated || 0 },
];

export const getCategoryFilters = (categoryId: string): Filter[] => {
  const baseFilters = getBaseFilters({
    all: 50,
    newest: 30,
    popular: 25,
    aiGenerated: 15,
  });

  const categorySpecificFilters: Record<string, Filter[]> = {
    art: [
      { id: "painting", name: "Painting", count: 20 },
      { id: "sculpture", name: "Sculpture", count: 15 },
      { id: "modern-art", name: "Modern Art", count: 10 },
    ],
    entertainment: [
      { id: "movies", name: "Movies", count: 25 },
      { id: "games", name: "Games", count: 20 },
      { id: "music", name: "Music", count: 15 },
    ],
    // Add more category-specific filters...
  };

  return [...baseFilters, ...(categorySpecificFilters[categoryId] || [])];
}; 