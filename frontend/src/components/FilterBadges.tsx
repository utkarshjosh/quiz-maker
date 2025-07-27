import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";

interface Filter {
  id: string;
  name: string;
  count: number;
  active?: boolean;
}

interface FilterBadgesProps {
  filters?: Filter[];
}

const INITIAL_SHOW_COUNT = 8;

const defaultFilters = [
  { id: "all", name: "All", count: 0, active: true },
];

const FilterBadges = ({ filters = defaultFilters }: FilterBadgesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { category } = useParams<{ category: string }>();
  const location = useLocation();
  const currentSubcategory = location.pathname.split('/')[2];

  const visibleFilters = isExpanded ? filters : filters.slice(0, INITIAL_SHOW_COUNT);
  const remainingCount = filters.length - INITIAL_SHOW_COUNT;

  const renderFilterBadge = (filter: Filter) => {
    // For base filters (all, newest, popular, ai-generated), use query params
    if (['all', 'newest', 'popular', 'ai-generated'].includes(filter.id)) {
      return (
        <Link
          key={filter.id}
          to={`/${category}?sort=${filter.id}`}
          className={`inline-flex px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${
            filter.active || location.search === `?sort=${filter.id}`
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-white/80 text-gray-700 hover:bg-white hover:shadow-sm border border-gray-200"
          }`}
        >
          {filter.name} ({filter.count})
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
        {filter.name} ({filter.count})
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