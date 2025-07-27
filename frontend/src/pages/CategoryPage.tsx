import { useParams, useSearchParams, Link } from "react-router-dom";
import FilterBadges from "@/components/FilterBadges";
import QuizSection from "@/components/QuizSection";
import QuizCard from "@/components/QuizCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowUpDown } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  thumbnail: string;
  rating: number;
  creator: string;
  badges?: string[];
  date: string;
}

interface QuizWithImage {
  id: string;
  title: string;
  image: string;
  date: string;
  aiGenerated?: boolean;
  rating: number;
  creator: string;
}

// Mock data - in a real app, this would come from an API
const mockQuizzes: Record<string, QuizWithImage[]> = {
  art: [
    { id: "1", title: "Art History Basics", image: "/src/assets/quiz-history.jpg", date: "2024-03-20", aiGenerated: true, rating: 4.5, creator: "ArtLover" },
    { id: "2", title: "Modern Art Movements", image: "/src/assets/quiz-history.jpg", date: "2024-03-19", rating: 4.2, creator: "ModernArtist" },
  ],
  entertainment: [
    { id: "3", title: "Movie Trivia", image: "/src/assets/quiz-movies.jpg", date: "2024-03-18", rating: 4.8, creator: "MovieBuff" },
    { id: "4", title: "Gaming Classics", image: "/src/assets/quiz-games.jpg", date: "2024-03-17", aiGenerated: true, rating: 4.3, creator: "GameMaster" },
  ],
  geography: [
    { id: "5", title: "World Capitals", image: "/src/assets/quiz-geography.jpg", date: "2024-03-16", rating: 4.6, creator: "GlobeTrotter" },
    { id: "6", title: "European Countries", image: "/src/assets/quiz-geography.jpg", date: "2024-03-15", rating: 4.4, creator: "EuroExplorer" },
  ],
  history: [
    { id: "7", title: "Ancient Civilizations", image: "/src/assets/quiz-history.jpg", date: "2024-03-14", aiGenerated: true, rating: 4.7, creator: "HistoryBuff" },
    { id: "8", title: "World War II", image: "/src/assets/quiz-history.jpg", date: "2024-03-13", rating: 4.9, creator: "HistoryTeacher" },
  ],
  languages: [
    { id: "9", title: "Basic Korean", image: "/src/assets/quiz-kpop.jpg", date: "2024-03-12", rating: 4.2, creator: "LanguageLover" },
    { id: "10", title: "Japanese for Beginners", image: "/src/assets/quiz-kpop.jpg", date: "2024-03-11", aiGenerated: true, rating: 4.1, creator: "JapanFan" },
  ],
  science: [
    { id: "11", title: "Basic Physics", image: "/src/assets/quiz-science.jpg", date: "2024-03-10", rating: 4.5, creator: "ScienceTeacher" },
    { id: "12", title: "Chemistry 101", image: "/src/assets/quiz-science.jpg", date: "2024-03-09", rating: 4.3, creator: "ChemistryPro" },
  ],
  sports: [
    { id: "13", title: "Football History", image: "/src/assets/quiz-history.jpg", date: "2024-03-08", aiGenerated: true, rating: 4.6, creator: "SportsExpert" },
    { id: "14", title: "Olympic Games", image: "/src/assets/quiz-history.jpg", date: "2024-03-07", rating: 4.4, creator: "OlympicFan" },
  ],
  trivia: [
    { id: "15", title: "General Knowledge", image: "/src/assets/quiz-history.jpg", date: "2024-03-06", rating: 4.8, creator: "TriviaKing" },
    { id: "16", title: "Pop Culture", image: "/src/assets/quiz-movies.jpg", date: "2024-03-05", aiGenerated: true, rating: 4.2, creator: "PopCultureGuru" },
  ],
};

// Mock filter data based on category
const getFiltersByCategory = (category: string = "all") => {
  const baseFilters = [
    { id: "all", name: "All", count: 50, active: true },
    { id: "newest", name: "Newest", count: 30 },
    { id: "popular", name: "Popular", count: 25 },
    { id: "ai-generated", name: "AI Generated", count: 15 },
  ];

  // Add category-specific filters
  switch (category) {
    case "art":
      return [...baseFilters, 
        { id: "painting", name: "Painting", count: 20 },
        { id: "sculpture", name: "Sculpture", count: 15 },
        { id: "modern-art", name: "Modern Art", count: 10 },
      ];
    case "entertainment":
      return [...baseFilters,
        { id: "movies", name: "Movies", count: 25 },
        { id: "games", name: "Games", count: 20 },
        { id: "music", name: "Music", count: 15 },
      ];
    // Add more cases for other categories
    default:
      return baseFilters;
  }
};

const CategoryPage = () => {
  const { category, subcategory } = useParams<{ category: string; subcategory: string }>();
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view');
  const sortBy = searchParams.get('sort') || 'all';
  const isExpandedView = viewMode === 'all' || subcategory;
  
  const categoryQuizzes = category ? mockQuizzes[category] || [] : [];
  const filters = getFiltersByCategory(category || "");

  // Update filters to show active state based on sort or subcategory
  const updatedFilters = filters.map(filter => ({
    ...filter,
    active: filter.id === sortBy || filter.id === subcategory
  }));

  const transformQuizzes = (quizzes: QuizWithImage[]): Quiz[] => {
    return quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      thumbnail: quiz.image,
      rating: quiz.rating,
      creator: quiz.creator,
      badges: quiz.aiGenerated ? ["AI Generated"] : undefined,
      date: quiz.date,
    }));
  };

  // Sort quizzes based on the selected filter
  const sortQuizzes = (quizzes: Quiz[]) => {
    switch (sortBy) {
      case 'newest':
        return [...quizzes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'popular':
        // In a real app, this would use view count or similar metric
        return quizzes;
      case 'ai-generated':
        return quizzes.filter(quiz => quiz.badges?.includes("AI Generated"));
      default:
        return quizzes;
    }
  };

  const sortedQuizzes = sortQuizzes(transformQuizzes(categoryQuizzes));

  if (isExpandedView) {
    // Expanded view with vertical list and sorting
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {category}
            {subcategory && (
              <>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <span>{subcategory}</span>
              </>
            )}
          </h1>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Sort by
          </Button>
        </div>

        <FilterBadges filters={updatedFilters} />
        
        <div className="grid gap-4">
          {sortedQuizzes.map(quiz => (
            <QuizCard
              key={quiz.id}
              {...quiz}
              layout="horizontal"
            />
          ))}
        </div>
      </div>
    );
  }

  // Default view with carousel sections
  return (
    <div className="space-y-6">
      <FilterBadges filters={updatedFilters} />
      
      <div className="space-y-8">
        {/* Default sections without "View All" */}
        <QuizSection 
          title="Recently Added" 
          quizzes={transformQuizzes(categoryQuizzes).slice(0, 5)} 
        />
        
        <QuizSection 
          title="Best Rating" 
          quizzes={transformQuizzes(categoryQuizzes)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5)} 
        />
        
        <QuizSection 
          title="Popular Right Now" 
          quizzes={transformQuizzes(categoryQuizzes).slice(0, 5)} 
        />

        {/* Category-specific sections with "View All" */}
        {filters.map(filter => {
          if (filter.id === 'all' || filter.id === 'newest' || filter.id === 'popular' || filter.id === 'ai-generated') return null;
          
          return (
            <div key={filter.id} className="relative">
              <QuizSection 
                title={filter.name} 
                quizzes={transformQuizzes(categoryQuizzes).slice(0, 5)} 
              />
              <Link 
                to={`/${category}/${filter.id}`}
                className="absolute top-8 right-4 text-sm text-primary hover:text-primary/80 font-medium"
              >
                View All
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPage; 