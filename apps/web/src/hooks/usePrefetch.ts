import { useQueryClient } from "@tanstack/react-query";
import { quizApi } from "@/api/quizApi";
import { quizKeys } from "@/hooks/useQuizzes";

/**
 * Hook that returns a function to prefetch secondary tags for a given primary tag.
 *
 * This lets us eagerly warm the React-Query cache before the user navigates,
 * e.g. on hover or when an element becomes visible.
 */
export const usePrefetchSecondaryTags = () => {
  const queryClient = useQueryClient();

  return (primaryTagId: string | undefined) => {
    if (!primaryTagId || primaryTagId === "start") return;

    queryClient.prefetchQuery({
      queryKey: quizKeys.secondaryTags(primaryTagId),
      queryFn: () => quizApi.getSecondaryTags(primaryTagId),
      // Consider data fresh for 5 minutes so we don't refetch immediately.
      staleTime: 1000 * 60 * 5,
    });
  };
};
