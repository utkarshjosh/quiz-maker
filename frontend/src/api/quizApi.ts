import { 
  GroupedQuizzesResponse,
  FilterListResponse,
  QuizListResponse,
  QuizListParams,
  MainTagsResponse,
} from "@/domain/schema";
import { mockCategories, mockQuizzes, getCategoryFilters } from "@/mocks/data";
import { axiosInstance } from "@/lib/axios";

export const quizApi = {
  // Get main tags that are shown in the header
  getMainTags: async (): Promise<MainTagsResponse> => {
    return axiosInstance.get('/quiz/tags');
  },
  getSecondaryTags: async (primaryTagId: string): Promise<MainTagsResponse> => {
    return axiosInstance.get(`/quiz/tags/${primaryTagId}/secondary`);
  },

  // Get grouped quizzes by category/tag
  useGroupedQuizzes: async (primaryTagId?: string, page: number = 1, limit: number = 10): Promise<GroupedQuizzesResponse> => {
    const params = { page, limit };
    return axiosInstance.get(`/quiz/category/${primaryTagId || ''}`, { params });
  },

  // Get filters for a category
  getCategoryFilters: async (categoryId: string): Promise<FilterListResponse> => {
    return axiosInstance.get(`/categories/${categoryId}/filters`);
  },

  // Get quizzes with filtering and pagination
  getQuizzes: async (params: QuizListParams): Promise<QuizListResponse> => {
    return axiosInstance.get('/quizzes', { params });
  },
}; 