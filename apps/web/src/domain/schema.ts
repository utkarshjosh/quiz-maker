import { z } from "zod";

// Base schemas
export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  quizCount: z.number().optional(),
});

/* export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(), // Icon name for mapping
  count: z.number().nullable(),
  color: z.string(),
  path: z.string(),
}); */

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

export const MainTagsResponseSchema = z.object({
  data: z.array(TagSchema),
});

// Schemas for grouped quizzes
export const GroupedQuizUserSchema = z.object({
  username: z.string(),
});

export const GroupedQuizSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  totalQuestions: z.number(),
  timeLimit: z.number(),
  createdAt: z.string(),
  user: GroupedQuizUserSchema,
  playCount: z.number(),
});

export const QuizGroupSchema = z.object({
  tag: TagSchema,
  quizzes: z.array(GroupedQuizSchema),
  totalQuizzes: z.number(),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalGroups: z.number(),
  totalQuizzes: z.number(),
});

export const GroupedQuizzesResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    groups: z.array(QuizGroupSchema),
    pagination: PaginationSchema,
  }),
});

// Export types
export type Tag = z.infer<typeof TagSchema>;
export type MainTagsResponse = z.infer<typeof MainTagsResponseSchema>;

export type Filter = z.infer<typeof FilterSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type FilterListResponse = z.infer<typeof FilterListResponseSchema>;
export type QuizListResponse = z.infer<typeof QuizListResponseSchema>;
export type QuizListParams = z.infer<typeof QuizListParamsSchema>;

export type GroupedQuiz = z.infer<typeof GroupedQuizSchema>;
export type QuizGroup = z.infer<typeof QuizGroupSchema>;
export type GroupedQuizzesResponse = z.infer<typeof GroupedQuizzesResponseSchema>; 