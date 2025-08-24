import { PrismaClient, type Prisma } from '@prisma/client';
import { seedUsers } from './users';
import { autoImportQuizzes } from './auto-import-quiz';

const prisma = new PrismaClient();

export async function main(): Promise<void> {
  console.log('🌱 Starting seed process...');

  try {
    // Run seeds in transaction batches
    await prisma.$transaction(
      async (tx: PrismaClient | Prisma.TransactionClient) => {
        console.log('Seeding users...');
        await seedUsers(tx);
      }
    );

    console.log('Seeding quizzes...');
    await autoImportQuizzes(prisma, '1ac7d213-c0ee-4461-8f52-6a42b8e2b343');
    console.log('✅ Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
