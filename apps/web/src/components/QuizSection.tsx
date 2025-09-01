import QuizCard from "./QuizCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { GroupedQuiz } from "@/domain/schema";
import { Link } from "react-router-dom";

interface QuizSectionProps {
  title: string;
  quizzes: GroupedQuiz[];
  totalQuizzes: number;
  link: string;
}

const QuizSection = ({ title, quizzes,totalQuizzes,link }: QuizSectionProps) => {
  const isMobile = useIsMobile();
  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-7xl mx-auto">
       <Link to={link}>
       <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          {title} ({totalQuizzes})
          <span className="text-sm font-normal text-gray-500">»</span>
        </h2></Link>

        {isMobile ? (
          // Mobile: Simple scrollable list
          <div className="flex gap-4 overflow-x-auto quiz-carousel pb-4">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                id={quiz.id}
                title={quiz.title}
                thumbnail={quiz.imageUrl}
                rating={4.5}
                creator={quiz.user?.username}
                badges={["NEW!"]}
              />
            ))}
          </div>
        ) : (
          // Desktop: Carousel with navigation buttons
          <div className="group relative">
            <style>{`
              .hide-scrollbar {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <Carousel
              opts={{
                align: "start",
                containScroll: "keepSnaps",
              }}
            >
              <CarouselContent className="hide-scrollbar">
                {quizzes.map((quiz) => (
              
                  <CarouselItem key={quiz.id} className="basis-auto">
                    <QuizCard
                      id={quiz.id}
                      title={quiz.title}
                      thumbnail={quiz.imageUrl}
                      rating={4.5}
                      creator={quiz.user?.username}
                      badges={["NEW!"]}
                    />
                  </CarouselItem>
            
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 opacity-40 hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 border-none" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 opacity-40 hover:opacity-100 transition-opacity duration-200 bg-black/50 hover:bg-black/70 border-none" />
            </Carousel>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSection;