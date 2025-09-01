import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import FilterBadges from "@/components/FilterBadges";
import QuizSection from "@/components/QuizSection";
import { useGroupedQuizzes } from "@/hooks/useQuizzes";

const CategoryPage = () => {
  // The `category` URL param represents the primary tag slug or id
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  // Fetch quizzes grouped by secondary tags for the selected primary tag
  const {
    data: groupedData,
    isLoading,
    isError,
    error,
  } = useGroupedQuizzes(category);

  // Handle 404 errors by redirecting to NotFound page
  useEffect(() => {
    if (error && (error as any)?.response?.status === 404) {
      navigate("/404");
    }
  }, [error, navigate]);

  if (isLoading) {
    return <div className="p-6">Loading…</div>;
  }

  if (
    isError ||
    !groupedData ||
    !("groups" in groupedData) ||
    !groupedData.groups ||
    groupedData.groups.length === 0
  ) {
    return <div className="p-6">No quizzes found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Show sub-tag filter badges if available */}
      {category && category !== "start" && (
        <FilterBadges primaryTagId={category} />
      )}

      {/* Render a carousel section for every group returned by the API */}
      {groupedData &&
        "groups" in groupedData &&
        groupedData.groups.map((group) => (
          <QuizSection
            key={group.tag.id}
            title={group.tag.name}
            quizzes={group.quizzes}
            totalQuizzes={group.totalQuizzes}
            link={`/category/${category}/${group.tag?.name.toLowerCase()}`}
          />
        ))}
    </div>
  );
};

export default CategoryPage;
