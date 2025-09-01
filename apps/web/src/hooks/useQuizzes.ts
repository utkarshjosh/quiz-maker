import { useQuery } from "@tanstack/react-query";
import { quizApi } from "@/api/quizApi";
import type { QuizListParams } from "@/domain/schema";

export const quizKeys = {
  all: ["quizzes"] as const,
  mainTags: () => [...quizKeys.all, "mainTags"] as const,
  secondaryTags: (primaryTagId: string) =>
    [...quizKeys.all, "secondaryTags", primaryTagId] as const,
  categories: () => [...quizKeys.all, "categories"] as const,
  filters: (categoryId: string) =>
    [...quizKeys.all, "filters", categoryId] as const,
  list: (params: QuizListParams) => [...quizKeys.all, "list", params] as const,
};
// TODO integrate hooks top 3 apis first
export const useMainTags = () => {
  return useQuery({
    queryKey: quizKeys.mainTags(),
    queryFn: () => quizApi.getMainTags(),
    select: (data) => data.data,
  });
};
export const useSecondaryTags = (primaryTagId: string) => {
  return useQuery({
    queryKey: quizKeys.secondaryTags(primaryTagId),
    queryFn: () => quizApi.getSecondaryTags(primaryTagId),
    select: (data) => data.data,
  });
};

export const useGroupedQuizzes = (
  primaryTagId?: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: [...quizKeys.categories(), primaryTagId, page, limit],
    queryFn: () => quizApi.useGroupedQuizzes(primaryTagId, page, limit),
    select: (data) => data.data,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};

/// dunno if we need this
export const useCategoryFilters = (categoryId: string) => {
  return useQuery({
    queryKey: quizKeys.filters(categoryId),
    queryFn: () => quizApi.getCategoryFilters(categoryId),
    enabled: !!categoryId,
  });
};

export const useQuizzes = (params: QuizListParams) => {
  return useQuery({
    queryKey: quizKeys.list(params),
    queryFn: () => quizApi.getQuizzes(params),
    enabled: !!params.categoryId,
  });
};
