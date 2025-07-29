import * as fs from 'fs';
import * as path from 'path';
import { type PrismaClient, type Prisma } from '@prisma/client';
import type { QuizData } from '../../../shared/types/quiz';

interface QuizSeedData {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit: number;
  total_questions: number;
  quiz_data: QuizData;
  status: string;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  version: number;
  tags?: string[];
}

export async function seedLargeQuizDataset(
  prisma: PrismaClient | Prisma.TransactionClient
) {
  const BATCH_SIZE = 100; // Process 100 quizzes at a time
  const dataPath = path.join(__dirname, './data/quiz_large_seed_data.json');

  console.log('Reading large quiz dataset...');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const { quizzes }: { quizzes: QuizSeedData[] } = JSON.parse(rawData);
  console.log(`Found ${quizzes.length} quizzes in large dataset`);
  // Process in batches to avoid memory issues
  for (let i = 0; i < quizzes.length; i += BATCH_SIZE) {
    const batch = quizzes.slice(i, i + BATCH_SIZE);
    console.log(`
      Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(quizzes.length / BATCH_SIZE)}`);
    await prisma.quiz.createMany({
      data: batch.map((quiz) => ({
        id: quiz.id,
        userId: quiz.user_id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.time_limit,
        totalQuestions: quiz.total_questions,
        quizData: JSON.stringify(quiz.quiz_data),
        status: quiz.status,
        createdAt: new Date(quiz.created_at),
        updatedAt: new Date(quiz.updated_at),
        publishedAt: quiz.published_at ? new Date(quiz.published_at) : null,
        version: quiz.version,
      })),
      skipDuplicates: true,
    });
    // Process quiz tags if they exist
    if (batch[0].tags) {
      const quizTagRelations = batch.flatMap((quiz) =>
        (quiz.tags ?? []).map((tagId) => ({
          quizId: quiz.id,
          tagId,
          createdAt: new Date(quiz.created_at),
        }))
      );
      await prisma.quizTag.createMany({
        data: quizTagRelations,
        skipDuplicates: true,
      });
    }
  }
  console.log('Large quiz dataset seeding completed!');
}
