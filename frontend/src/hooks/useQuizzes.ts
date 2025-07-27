import { useQuery } from "@tanstack/react-query";
import { quizApi } from "@/api/quizApi";
import type { QuizListParams } from "@/domain/schema";

export const quizKeys = {
  all: ["quizzes"] as const,
  categories: () => [...quizKeys.all, "categories"] as const,
  filters: (categoryId: string) => [...quizKeys.all, "filters", categoryId] as const,
  list: (params: QuizListParams) => [...quizKeys.all, "list", params] as const,
};

export const useCategories = () => {
  return useQuery({
    queryKey: quizKeys.categories(),
    queryFn: () => quizApi.getCategories(),
  });
};

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