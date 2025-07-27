import { 
  Rocket, 
  Gamepad, 
  Globe2, 
  BookOpenCheck, 
  Languages as LanguagesIcon, 
  FlaskConical, 
  Medal, 
  Brain,
  Home,
  Palette
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const categories = [
  { id: "start", name: "Start", icon: Home, count: null, color: "text-blue-500", path: "/" },
  { id: "art", name: "Art & Literature", icon: Palette, count: 1138, color: "text-pink-500", path: "/art" },
  { id: "entertainment", name: "Entertainment", icon: Gamepad, count: 1138, color: "text-pink-500", path: "/entertainment" },
  { id: "geography", name: "Geography", icon: Globe2, count: 892, color: "text-green-500", path: "/geography" },
  { id: "history", name: "History", icon: BookOpenCheck, count: 654, color: "text-yellow-500", path: "/history" },
  { id: "languages", name: "Languages", icon: LanguagesIcon, count: 423, color: "text-purple-500", path: "/languages" },
  { id: "science", name: "Science & Nature", icon: FlaskConical, count: 587, color: "text-blue-500", path: "/science" },
  { id: "sports", name: "Sports", icon: Medal, count: 298, color: "text-orange-500", path: "/sports" },
  { id: "trivia", name: "Trivia", icon: Brain, count: 756, color: "text-red-500", path: "/trivia" },
];

const CategoryCarousel = () => {
  const location = useLocation();

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-2 overflow-x-auto quiz-carousel pb-2">
          {categories.map((category) => {
            const IconComponent = category.icon;
            const isActive = location.pathname === category.path;
            
            return (
              <Link
                key={category.id}
                to={category.path}
                className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 cursor-pointer min-w-[120px] hover:-translate-y-1 transition-transform duration-200 ${
                  isActive ? 'bg-primary/5 rounded-lg' : ''
                }`}
              >
                <IconComponent 
                  className={`w-12 h-12 ${category.color} transition-all duration-200 hover:scale-110 ${
                    isActive ? 'scale-110' : ''
                  }`} 
                  strokeWidth={1.5} 
                />
                <div className="text-center">
                  <div className={`text-base font-semibold whitespace-nowrap ${
                    isActive ? 'text-primary' : 'text-gray-800'
                  }`}>
                    {category.name}
                  </div>
                  {category.count && (
                    <div className="text-sm text-gray-500 mt-1">
                      {category.count} quizzes
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryCarousel;