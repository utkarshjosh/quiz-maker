import { type PrismaClient, type Prisma } from '@prisma/client';

interface QuizData {
  tags?: string[];
  [key: string]: any;
}

export async function seedQuizTags(
  prisma: PrismaClient | Prisma.TransactionClient
) {
  console.log('Creating quiz-tag relationships...');

  // Get all quizzes that have tags array
  const quizzes = await prisma.quiz.findMany({
    select: {
      id: true,
      quizData: true,
    },
  });

  // Get all tags to create a name->id mapping
  const tags = await prisma.tag.findMany();
  const tagNameToId = new Map(tags.map((tag: any) => [tag.name, tag.id]));
  console.log('size of tagNameToId', tagNameToId.size);
  // Create quiz-tag relationships
  for (const quiz of quizzes) {
    try {
      // Parse quizData to get tags array
      const quizData: QuizData = JSON.parse(quiz.quizData as string);
      console.log('tags', quizData.metadata);
      if (!quizData.metadata || !Array.isArray(quizData.metadata.tags))
        continue;

      // Create relationships for each tag
      const relationships = quizData.metadata.tags
        .filter((tagName: string) => tagNameToId.has(tagName))
        .map((tagName: string) => tagNameToId.get(tagName))
        .filter((tagId: string) => Boolean(tagId))
        .map((tagId: string) => ({
          quizId: quiz.id,
          tagId,
          createdAt: new Date(),
        }));

      if (relationships.length > 0) {
        await prisma.quizTag.createMany({
          data: relationships,
          skipDuplicates: true,
        });
      }
    } catch (error) {
      const quizid: string = quiz.id;
      console.error(`Failed to process quiz ${quizid}:`, error);
      continue; // Skip this quiz but continue with others
    }
  }

  console.log('Quiz-tag relationships created successfully!');
}
