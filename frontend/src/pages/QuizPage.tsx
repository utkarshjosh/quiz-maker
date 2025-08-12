import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import FilterBadges from "@/components/FilterBadges";
import QuizSection from "@/components/QuizSection";
import { useGroupedQuizzes } from "@/hooks/useQuizzes";
import type { QuizGroup } from "@/domain/schema";

const QuizPage = () => {
  const { category, subcategory } = useParams<{ category?: string; subcategory?: string }>();
  const [page, setPage] = useState(1);
  const [allGroups, setAllGroups] = useState<QuizGroup[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Determine the primary tag based on route
  const primaryTagId = category && category !== "start" ? category : undefined;
  
  // Fetch quizzes grouped by secondary tags for the selected primary tag
  const {
    data: groupedData,
    isLoading,
    isError,
    refetch,
  } = useGroupedQuizzes(primaryTagId, page);

  // Reset state when category changes
  useEffect(() => {
    setPage(1);
    setAllGroups([]);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [category, subcategory]);

  // Update groups when new data arrives
  useEffect(() => {
    if (groupedData && 'groups' in groupedData && groupedData.groups) {
      if (page === 1) {
        setAllGroups(groupedData.groups);
      } else {
        setAllGroups(prev => [...prev, ...groupedData.groups]);
      }
      
      // Check if there are more pages based on pagination info
      if ('pagination' in groupedData && groupedData.pagination) {
        const { page: currentPage, limit, totalGroups } = groupedData.pagination;
        console.log("has more  ", currentPage * limit < totalGroups)
        setHasMore(currentPage * limit < totalGroups);
      } else {
        // If no pagination info, assume no more data
        console.log("has more elses ", false)
        setHasMore(false);
      }
      
      setIsLoadingMore(false);
    }
  }, [groupedData, page]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  };

  // Filter groups by subcategory if specified
  const filteredGroups = subcategory 
    ? allGroups.filter(group => 
        group.tag?.name.toLowerCase() === subcategory.toLowerCase() ||
        group.tag?.slug === subcategory
      )
    : allGroups;

  if (isLoading && page === 1) {
    return <div className="p-6">Loading…</div>;
  }

  if (isError || (!isLoading && filteredGroups.length === 0)) {
    return <div className="p-6">No quizzes found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Show sub-tag filter badges if we're in a category page */}
      {category && category !== "start" && (
        <FilterBadges primaryTagId={category} />
      )}

      {/* Render a carousel section for every group */}
      {filteredGroups.map((group, index) => (
        <QuizSection
          key={`${group.tag?.id}-${index}`}
          title={group.tag?.name || "Quizzes"}
          quizzes={group.quizzes}
          totalQuizzes={group.totalQuizzes}
          link={category 
            ? `/${category}/${group.tag?.name.toLowerCase()}` 
            : `/${group.tag?.name.toLowerCase()}`
          }
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* Loading indicator for additional content */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
