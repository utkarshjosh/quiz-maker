import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useSecondaryTags } from "@/hooks/useQuizzes";

interface Filter {
  id: string;
  name: string;
  quizCount: number;
  active?: boolean;
}

interface FilterBadgesProps {
  primaryTagId?: string;
}

const INITIAL_SHOW_COUNT = 8;

const defaultFilters = [
  { id: "all", name: "All", count: 0, active: true },
];

const FilterBadges = ({  primaryTagId }: FilterBadgesProps) => {
  console.log(primaryTagId);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: secondaryTags } = useSecondaryTags(primaryTagId);
  console.log(secondaryTags);
  const { category } = useParams<{ category: string }>();
  const location = useLocation();

  const currentSubcategory = location.pathname.split('/')[2];

  // Add "All" category at the beginning
  const allFilters = secondaryTags 
    ? [
        { 
          id: "all", 
          name: "All", 
          quizCount: null, 
          active: !currentSubcategory // active when no subcategory is selected
        },
        ...secondaryTags
      ]
    : [];

  const visibleFilters = allFilters.length > 0
    ? (isExpanded ? allFilters : allFilters.slice(0, INITIAL_SHOW_COUNT))
    : [];
  const remainingCount = Math.max(0, allFilters.length - INITIAL_SHOW_COUNT);

  const renderFilterBadge = (filter: Filter) => {
    // For "All" filter, link back to the main category
    if (filter.id === 'all') {
      return (
        <Link
          key={filter.id}
          to={`/${category}`}
          className={`inline-flex px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${
            !currentSubcategory
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm border border-gray-200"
          }`}
        >
          {filter.name}
        </Link>
      );
    }

    // For category-specific filters, use subcategory routes
    return (
      <Link
        key={filter.id}
        to={`/${category}/${filter.id}`}
        className={`inline-flex px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${
          currentSubcategory === filter.id
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm border border-gray-200"
        }`}
      >
        {filter.name.charAt(0).toUpperCase() + filter.name.slice(1)} ({filter.quizCount})
      </Link>
    );
  };

  return (
    <div className="w-full px-4 py-4 bg-white/30">
      <div className="max-w-7xl mx-auto">
        <div className={`${isExpanded ? 'h-auto' : 'h-[40px]'} transition-all duration-300`}>
          <div className={`flex flex-wrap gap-2 ${!isExpanded && 'overflow-hidden'}`}>
            {visibleFilters.map(renderFilterBadge)}
            {!isExpanded && remainingCount > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="inline-flex px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm border border-gray-200"
              >
                +{remainingCount} More
              </button>
            )}
            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="inline-flex px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm border border-gray-200"
              >
                Show Less
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBadges;