import fs from 'fs';
import path from 'path';
import { type PrismaClient, type Prisma } from '@prisma/client';

interface QuizData {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options: Array<{
      id: string;
      text: string;
    }>;
    correctAnswer: string;
    points: number;
    explanation: string;
  }>;
  metadata: {
    tags: string[];
  };
}

interface QuizFileData {
  quizzes: QuizData[];
}

async function processQuizData(
  tx: PrismaClient | Prisma.TransactionClient,
  quizData: QuizData,
  userId: string
) {
  // Extract title and description, remove them from quizData
  const { title, description, ...quizDataWithoutMeta } = quizData;
  const { tags } = quizDataWithoutMeta.metadata;
  // Create quiz
  const quiz = await tx.quiz.create({
    data: {
      userId,
      title,
      description,
      quizData: { ...quizDataWithoutMeta },
      totalQuestions: quizData.questions.length,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  // Process tags
  for (let i = 0; i < tags.length; i++) {
    const tagName = tags[i];
    const isPrimary = i === 0; // First tag is primary
    // Create or get tag
    const tag = await tx.tag.upsert({
      where: {
        name_isPrimary: {
          name: tagName,
          isPrimary,
        },
      },
      create: {
        name: tagName,
        slug: tagName.toLowerCase().replace(/\s+/g, '-'),
        isPrimary,
      },
      update: {},
    });

    // Create quiz-tag relationship
    await tx.quizTag.create({
      data: {
        quizId: quiz.id,
        tagId: tag.id,
      },
    });
  }
}

export async function autoImportQuizzes(
  tx: PrismaClient | Prisma.TransactionClient,
  adminUserId: string
): Promise<void> {
  console.log('Processing quiz data files...');
  const quizDataDir = path.join(__dirname, 'data', 'generated_quizzes');
  console.log(quizDataDir);
  const files = fs.readdirSync(quizDataDir);

  let processedQuizzes = 0;
  let processedFiles = 0;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    console.log(`Processing ${file}...`);
    const filePath = path.join(quizDataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const quizFileData: QuizFileData = JSON.parse(fileContent);

    for (const quizData of quizFileData.quizzes) {
      await processQuizData(tx, quizData, adminUserId);
      processedQuizzes++;
    }
    processedFiles++;
  }

  console.log(
    `✅ Quiz import completed! Processed ${processedQuizzes} quizzes from ${processedFiles} files.`
  );
}
