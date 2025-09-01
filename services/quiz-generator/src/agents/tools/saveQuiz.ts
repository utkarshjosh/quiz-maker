import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createClient } from 'redis';

const saveQuizSchema = z.object({
  quizId: z.string().describe('Unique identifier for the quiz'),
  quiz: z.object({}).passthrough().describe('The quiz object to save'),
  threadId: z.string().describe('Thread ID for session context').optional()
});

interface SaveQuizResult {
  success: boolean;
  quizId?: string;
  error?: string;
  message: string;
  savedAt?: string;
}

export const saveQuizTool = tool(
  async ({ quizId, quiz, threadId }): Promise<SaveQuizResult> => {
    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await client.connect();

      // Save the quiz with expiration (24 hours)
      const quizKey = `quiz:${quizId}`;
      await client.setEx(quizKey, 86400, JSON.stringify(quiz));

      // If threadId provided, associate quiz with thread
      if (threadId) {
        const threadQuizzesKey = `thread:${threadId}:quizzes`;
        await client.sAdd(threadQuizzesKey, quizId);
        await client.expire(threadQuizzesKey, 86400);
      }

      // Save to quiz index for retrieval
      const indexKey = 'quiz:index';
      await client.sAdd(indexKey, quizId);

      await client.disconnect();

      return {
        success: true,
        quizId: quizId,
        message: `Quiz saved successfully with ID: ${quizId}`,
        savedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in saveQuiz tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to save quiz'
      };
    }
  },
  {
    name: 'save_quiz',
    description: 'Save a quiz to persistent storage with optional thread association',
    schema: saveQuizSchema
  }
); 