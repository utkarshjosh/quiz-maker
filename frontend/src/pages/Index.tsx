import FilterBadges from "@/components/FilterBadges";
import QuizSection from "@/components/QuizSection";

// Import quiz images
import quizMovies from "@/assets/quiz-movies.jpg";
import quizKpop from "@/assets/quiz-kpop.jpg";
import quizGames from "@/assets/quiz-games.jpg";
import quizGeography from "@/assets/quiz-geography.jpg";
import quizScience from "@/assets/quiz-science.jpg";
import quizHistory from "@/assets/quiz-history.jpg";
import { useGroupedQuizzes } from "@/hooks/useQuizzes"; 
// Sample quiz data
const recentlyPublished = [
  {
    id: "1",
    title: "Battle for Dream Island (BFDI) Quiz",
    thumbnail: quizGames,
    rating: 4.8,
    creator: "sugarfruit",
    badges: ["NEW!"]
  },
  {
    id: "2",
    title: "Rhett and Link (Gmm)",
    thumbnail: quizMovies,
    rating: 4.5,
    creator: "LovelyTavts",
    badges: ["NEW!"]
  },
  {
    id: "3",
    title: "Guess the game by the music. Part 2",
    thumbnail: quizGames,
    rating: 3.8,
    creator: "Lord_Buba",
    badges: []
  },
  {
    id: "4",
    title: "KPOP GIRL guess the song",
    thumbnail: quizKpop,
    rating: 3.7,
    creator: "LuffyLe",
    badges: ["HARD"]
  },
  {
    id: "5",
    title: "BlackPink Quiz YouTube Views",
    thumbnail: quizKpop,
    rating: 3.7,
    creator: "LuffyLe",
    badges: []
  },
  {
    id: "6",
    title: "Video Games History and Fun Facts",
    thumbnail: quizGames,
    rating: 4.1,
    creator: "LaMarceDeLosgames",
    badges: ["AI GENERATED"]
  }
];

const bestRating = [
  {
    id: "7",
    title: "Keyword Sleuth: Guess the Movie",
    thumbnail: quizMovies,
    rating: 4.9,
    creator: "brittanyk",
    badges: []
  },
  {
    id: "8",
    title: "Keyword Sleuth: TV Series",
    thumbnail: quizMovies,
    rating: 4.3,
    creator: "brittanyk",
    badges: []
  },
  {
    id: "9",
    title: "Fallout",
    thumbnail: quizGames,
    rating: 4.2,
    creator: "Lord_Buba",
    badges: []
  },
  {
    id: "10",
    title: "More Y2K Songs",
    thumbnail: quizKpop,
    rating: 4.2,
    creator: "brittanyk",
    badges: []
  },
  {
    id: "11",
    title: "Finish the Lyrics",
    thumbnail: quizKpop,
    rating: 4.2,
    creator: "SisTurtle27",
    badges: ["AI GENERATED"]
  },
  {
    id: "12",
    title: "Bollywood Quiz Fun",
    thumbnail: quizMovies,
    rating: 4.1,
    creator: "AllyT",
    badges: []
  }
];

const popularNow = [
  {
    id: "13",
    title: "World Geography Challenge",
    thumbnail: quizGeography,
    rating: 4.6,
    creator: "GeoMaster",
    badges: ["HARD"]
  },
  {
    id: "14",
    title: "Science & Nature Quiz",
    thumbnail: quizScience,
    rating: 4.4,
    creator: "NatureLover",
    badges: ["AI GENERATED"]
  },
  {
    id: "15",
    title: "Ancient History Mysteries",
    thumbnail: quizHistory,
    rating: 4.3,
    creator: "HistoryBuff",
    badges: []
  },
  {
    id: "16",
    title: "Modern Cinema Classics",
    thumbnail: quizMovies,
    rating: 4.5,
    creator: "FilmCritic",
    badges: ["NEW!"]
  },
  {
    id: "17",
    title: "Gaming Legends Quiz",
    thumbnail: quizGames,
    rating: 4.7,
    creator: "GameMaster",
    badges: []
  },
  {
    id: "18",
    title: "K-Pop Evolution",
    thumbnail: quizKpop,
    rating: 4.4,
    creator: "KPopFan",
    badges: ["HARD"]
  }
];

const defaultFilters = [
  { id: "all", name: "All", count: 1138, active: true },
  { id: "music", name: "Music", count: 241 },
  { id: "trivia", name: "Trivia", count: 219 },
  { id: "movies", name: "Movies", count: 147 },
  { id: "video-games", name: "Video Games", count: 106 },
  { id: "geography", name: "Geography", count: 59 },
  { id: "celebrities", name: "Celebrities", count: 57 },
  { id: "art", name: "Art & Literature", count: 50 },
  { id: "video-game", name: "Video Game", count: 50 },
  { id: "movie", name: "Movie", count: 49 },
];

const Index = () => {
  const { data: groupedQuizzes } = useGroupedQuizzes();
  console.log(groupedQuizzes);
  return (
    <>
  {groupedQuizzes && 'groups' in groupedQuizzes && groupedQuizzes.groups?.map((group) => (
    <div key={group.tag?.id} className="space-y-8">
      <QuizSection 
          title={group.tag?.name} 
          quizzes={group.quizzes} 
          totalQuizzes={group.totalQuizzes}
          link={`/category/${group.tag?.name.toLowerCase()}`}
        />
    </div>
  ))}
      {/* FilterBadges removed from home page
      <div className="space-y-8">
        <QuizSection 
          title="Recently published" 
          quizzes={[...recentlyPublished, ...recentlyPublished, ...recentlyPublished]} 
        />
        
        <QuizSection 
          title="Best rating right now" 
          quizzes={bestRating} 
        />
        
        <QuizSection 
          title="Popular right now" 
          quizzes={popularNow} 
        />
      </div>
      
      <div className="h-20"></div> */}
    </>
  );
};

export default Index;