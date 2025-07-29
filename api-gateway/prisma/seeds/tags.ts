import { type PrismaClient, type Prisma } from '@prisma/client';
import * as tagData from './data/quiz_seed_data.json';

export async function seedTags(
  prisma: PrismaClient | Prisma.TransactionClient
) {
  const { tags } = tagData;
  const allTags = tags;
  const allTagsLength: number = allTags.length;
  console.log(`Seeding ${allTagsLength} tags...`);

  await prisma.tag.createMany({
    data: allTags.map((tag: any) => ({
      name: tag.name,
      slug: tag.slug,
      isPrimary: tag.isPrimary,
      icon: tag.icon,
      color: tag.color,
      description: tag.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    skipDuplicates: true,
  });
}
