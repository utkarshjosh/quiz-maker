import axios from 'axios';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables so Prisma can connect to the DB via DATABASE_URL
dotenv.config();

const prisma = new PrismaClient();

const IMAGE_API_BASE_URL =
  process.env.IMAGE_API_URL ?? 'http://localhost:5000/search';

/**
 * Fetches a random image URL for a given query string using the image API.
 *
 * @param query - Search query (e.g. quiz title)
 * @returns Random image URL or `null` if none found / request failed.
 */
async function fetchRandomImage(query: string): Promise<string | null> {
  try {
    const response = await axios.get<{ query: string; images: string[] }>(
      IMAGE_API_BASE_URL,
      {
        params: { query },
        timeout: 10_000,
      }
    );

    const images = response.data?.images ?? [];
    if (images.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex] ?? null;
  } catch (error) {
    console.error(
      `⚠️  Failed to fetch images for "${query}":`,
      (error as Error).message
    );
    return null;
  }
}

async function updateQuizImages(): Promise<void> {
  const quizzesWithoutImage = await prisma.quiz.findMany({
    where: { imageUrl: null },
    select: { id: true, title: true },
  });

  console.log(`Found ${quizzesWithoutImage.length} quizzes without images.`);

  let successCount = 0;
  for (const quiz of quizzesWithoutImage) {
    const imageUrl = await fetchRandomImage(quiz.title);
    if (!imageUrl) {
      console.warn(
        `No image found for quiz: "${quiz.title}" (id: ${quiz.id}).`
      );
      continue;
    }

    try {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: { imageUrl },
      });
      successCount += 1;
      console.log(`✅ Updated quiz "${quiz.title}" with image.`);
    } catch (error) {
      console.error(
        `❌ Failed to update quiz (id: ${quiz.id}):`,
        (error as Error).message
      );
    }
  }

  console.log(
    `Finished updating images. Success: ${successCount}/${quizzesWithoutImage.length}`
  );
}

updateQuizImages()
  .catch((err) => {
    console.error('Unexpected error while updating quiz images', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
