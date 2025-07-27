import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createClient } from 'redis';

const getQuizSchema = z.object({
  quizId: z.string().describe('Unique identifier for the quiz to retrieve'),
  threadId: z.string().describe('Thread ID to get quizzes associated with this thread').optional()
});

interface Quiz {
  id: string;
  title: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  questions: any[];
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
}

interface GetQuizResult {
  success: boolean;
  quiz?: Quiz;
  quizzes?: Quiz[];
  quizId?: string;
  threadId?: string;
  count?: number;
  error?: string;
  message: string;
}

export const getQuizTool = tool(
  async ({ quizId, threadId }): Promise<GetQuizResult> => {
    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await client.connect();

      if (quizId) {
        // Get specific quiz
        const quizKey = `quiz:${quizId}`;
        const quizData = await client.get(quizKey);
        
        if (!quizData) {
          await client.disconnect();
          return {
            success: false,
            message: `Quiz with ID ${quizId} not found`,
            quizId: quizId
          };
        }

        const quiz: Quiz = JSON.parse(quizData);
        await client.disconnect();

        return {
          success: true,
          quiz: quiz,
          quizId: quizId,
          message: `Retrieved quiz: ${quiz.title || 'Untitled Quiz'}`
        };

      } else if (threadId) {
        // Get all quizzes for a thread
        const threadQuizzesKey = `thread:${threadId}:quizzes`;
        const quizIds = await client.sMembers(threadQuizzesKey);
        
        if (quizIds.length === 0) {
          await client.disconnect();
          return {
            success: true,
            quizzes: [],
            threadId: threadId,
            message: `No quizzes found for thread ${threadId}`
          };
        }

        // Get all quizzes
        const quizzes: Quiz[] = [];
        for (const id of quizIds) {
          const quizKey = `quiz:${id}`;
          const quizData = await client.get(quizKey);
          if (quizData) {
            quizzes.push(JSON.parse(quizData));
          }
        }

        await client.disconnect();

        return {
          success: true,
          quizzes: quizzes,
          threadId: threadId,
          count: quizzes.length,
          message: `Retrieved ${quizzes.length} quizzes for thread ${threadId}`
        };

      } else {
        await client.disconnect();
        return {
          success: false,
          message: 'Either quizId or threadId must be provided'
        };
      }

    } catch (error) {
      console.error('Error in getQuiz tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve quiz'
      };
    }
  },
  {
    name: 'get_quiz',
    description: 'Retrieve a specific quiz by ID or all quizzes for a thread',
    schema: getQuizSchema
  }
); 