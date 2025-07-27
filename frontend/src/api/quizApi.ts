import { 
  CategoryListResponse, 
  FilterListResponse, 
  QuizListResponse,
  QuizListParams,
} from "@/domain/schema";
import { mockCategories, mockQuizzes, getCategoryFilters } from "@/mocks/data";

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const quizApi = {
  // Get all categories
  getCategories: async (): Promise<CategoryListResponse> => {
    await delay(500);
    return {
      categories: mockCategories,
    };
  },

  // Get filters for a category
  getCategoryFilters: async (categoryId: string): Promise<FilterListResponse> => {
    await delay(300);
    return {
      filters: getCategoryFilters(categoryId),
    };
  },

  // Get quizzes with filtering and pagination
  getQuizzes: async (params: QuizListParams): Promise<QuizListResponse> => {
    await delay(800);
    
    let filteredQuizzes = [...mockQuizzes];

    // Filter by category
    filteredQuizzes = filteredQuizzes.filter(quiz => quiz.categoryId === params.categoryId);

    // Filter by subcategory if provided
    if (params.subcategoryId) {
      filteredQuizzes = filteredQuizzes.filter(quiz => quiz.subcategoryId === params.subcategoryId);
    }

    // Apply additional filters
    if (params.filter === "ai-generated") {
      filteredQuizzes = filteredQuizzes.filter(quiz => quiz.aiGenerated);
    }

    // Apply sorting
    switch (params.sort) {
      case "newest":
        filteredQuizzes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "popular":
        filteredQuizzes.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "rating":
        filteredQuizzes.sort((a, b) => b.rating - a.rating);
        break;
    }

    // Apply pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedQuizzes = filteredQuizzes.slice(start, start + pageSize);

    return {
      quizzes: paginatedQuizzes,
      total: filteredQuizzes.length,
      page,
      pageSize,
    };
  },
}; 