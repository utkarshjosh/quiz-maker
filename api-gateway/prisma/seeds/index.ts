import { PrismaClient } from '@prisma/client';
import { seedUsers } from './users';
import { seedTags } from './tags';
import { seedQuizTags } from './quiz-tags';
import { seedLargeQuizDataset } from './large-quiz-dataset';

const prisma = new PrismaClient();

export async function main(): Promise<void> {
  console.log('🌱 Starting seed process...');

  try {
    // Run seeds in transaction batches
    await prisma.$transaction(async (tx: PrismaClient) => {
      console.log('Seeding users...');
      await seedUsers(tx);
      console.log('Seeding tags...');
      await seedTags(tx);
    });

    // Large dataset is seeded separately due to size
    console.log('Seeding large quiz dataset...');
    await seedLargeQuizDataset(prisma);
    console.log('Seeding quiz tags relationships...');
    await seedQuizTags(prisma);
    console.log('✅ Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
