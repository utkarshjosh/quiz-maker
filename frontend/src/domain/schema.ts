import { z } from "zod";

// Base schemas
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(), // Icon name for mapping
  count: z.number().nullable(),
  color: z.string(),
  path: z.string(),
});

export const FilterSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  active: z.boolean().optional(),
});

export const QuizSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  rating: z.number().min(0).max(5),
  creator: z.string(),
  date: z.string(), // ISO date string
  badges: z.array(z.string()).optional(),
  aiGenerated: z.boolean().optional(),
  viewCount: z.number().default(0),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
});

// Response schemas
export const CategoryListResponseSchema = z.object({
  categories: z.array(CategorySchema),
});

export const FilterListResponseSchema = z.object({
  filters: z.array(FilterSchema),
});

export const QuizListResponseSchema = z.object({
  quizzes: z.array(QuizSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// Query params schemas
export const QuizListParamsSchema = z.object({
  categoryId: z.string(),
  subcategoryId: z.string().optional(),
  sort: z.enum(["newest", "popular", "rating"]).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  filter: z.enum(["all", "ai-generated"]).optional(),
});

// Export types
export type Category = z.infer<typeof CategorySchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
export type FilterListResponse = z.infer<typeof FilterListResponseSchema>;
export type QuizListResponse = z.infer<typeof QuizListResponseSchema>;
export type QuizListParams = z.infer<typeof QuizListParamsSchema>; 