import { 
  Rocket,
  Drama,
  Globe,
  Landmark,
  GraduationCap,
  Library,
  LeafyGreen,
  Atom,
  Trophy,
  Home
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePrefetchSecondaryTags } from "@/hooks/usePrefetch";
import { useMainTags } from "@/hooks/useQuizzes";

const COLORS = [
  "text-blue-500",
  "text-pink-500",
  "text-green-500",
  "text-yellow-500",
  "text-purple-500",
  "text-orange-500",
  "text-red-500",
  "text-indigo-500",
  "text-teal-500",
];

import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Drama,
  Globe,
  Landmark,
  GraduationCap,
  Library,
  LeafyGreen,
  Atom,
  Trophy,
  default: Rocket,
};

const defaultCategory = { 
  id: "start", 
  name: "Start", 
  icon: "Home", 
  quizCount: "", 
  color: COLORS[0], 
  path: "/",
  slug: "start" 
};

const CategoryCarousel = () => {
  const location = useLocation();
  const prefetchSecondaryTags = usePrefetchSecondaryTags();
  const { data: mainTags } = useMainTags();
  const allCategories = mainTags 
    ? [defaultCategory, ...mainTags.map((tag, index) => ({
        ...tag,
        color: COLORS[index % COLORS.length],
        path: `/${tag.slug}`,
        icon: tag.icon in ICON_MAP ? tag.icon : 'default'
      }))]
    : [defaultCategory];

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-2 overflow-x-auto quiz-carousel pb-2">
          {allCategories.map((category) => {
            const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP] || ICON_MAP.default;
            const isActive = location.pathname === category.path;
            
            return (
              <Link
                key={category.id}
                to={category.path}
                onMouseEnter={() => prefetchSecondaryTags(category.slug)}
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
                  {category.id !== "start" && category.quizCount !== null && (
                    <div className="text-sm text-gray-500 mt-1">
                      {category.quizCount} quizzes
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