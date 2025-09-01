import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FilterBadges from "@/components/FilterBadges";
import QuizSection from "@/components/QuizSection";
import { useGroupedQuizzes } from "@/hooks/useQuizzes";
import type { QuizGroup } from "@/domain/schema";

const QuizPage = () => {
  const { category, subcategory } = useParams<{
    category?: string;
    subcategory?: string;
  }>();
  const navigate = useNavigate();
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
    error,
    refetch,
  } = useGroupedQuizzes(primaryTagId, page);

  // Handle 404 errors by redirecting to NotFound page
  useEffect(() => {
    if (error && "response" in error && error.response?.status === 404) {
      navigate("/404");
    }
  }, [error, navigate]);

  // Reset state when category changes
  useEffect(() => {
    setPage(1);
    setAllGroups([]);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [category, subcategory]);

  // Update groups when new data arrives
  useEffect(() => {
    if (groupedData && "groups" in groupedData && groupedData.groups) {
      if (page === 1) {
        setAllGroups(groupedData.groups);
      } else {
        setAllGroups((prev) => [...prev, ...groupedData.groups]);
      }

      // Check if there are more pages based on pagination info
      if ("pagination" in groupedData && groupedData.pagination) {
        const {
          page: currentPage,
          limit,
          totalGroups,
        } = groupedData.pagination;
        console.log("has more  ", currentPage * limit < totalGroups);
        setHasMore(currentPage * limit < totalGroups);
      } else {
        // If no pagination info, assume no more data
        console.log("has more elses ", false);
        setHasMore(false);
      }

      setIsLoadingMore(false);
    }
  }, [groupedData, page]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  // Filter groups by subcategory if specified
  const filteredGroups = subcategory
    ? allGroups.filter(
        (group) =>
          group.tag?.name.toLowerCase() === subcategory.toLowerCase() ||
          group.tag?.slug === subcategory
      )
    : allGroups;

  if (isLoading && page === 1) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-700 text-lg font-medium">
            Loading quizzes...
          </p>
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && filteredGroups.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-800">
            No quizzes found
          </h3>
          <p className="text-gray-600">
            {category
              ? `No quizzes available in the "${category}" category.`
              : "No quizzes are currently available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
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
            link={
              category
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
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
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
    </div>
  );
};

export default QuizPage;
