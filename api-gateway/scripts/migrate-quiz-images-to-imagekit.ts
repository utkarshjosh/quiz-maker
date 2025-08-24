import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import ImageKit from 'imagekit';

// Load env
dotenv.config();

const prisma = new PrismaClient();

const IMAGE_KIT_ENDPOINT = process.env.IMAGE_KIT_ENDPOINT || '';
const IMAGE_KIT_PUBLIC_KEY = process.env.IMAGE_KIT_PUBLIC_KEY || '';
const IMAGE_KIT_PRIVATE_KEY = process.env.IMAGE_KIT_PRIVATE_KEY || '';

if (!IMAGE_KIT_ENDPOINT || !IMAGE_KIT_PUBLIC_KEY || !IMAGE_KIT_PRIVATE_KEY) {
  console.error(
    'Missing ImageKit configuration. Please set IMAGE_KIT_ENDPOINT, IMAGE_KIT_PUBLIC_KEY, IMAGE_KIT_PRIVATE_KEY in your environment.'
  );
  process.exit(1);
}

const imagekit = new ImageKit({
  publicKey: IMAGE_KIT_PUBLIC_KEY,
  privateKey: IMAGE_KIT_PRIVATE_KEY,
  urlEndpoint: IMAGE_KIT_ENDPOINT,
});

function isAlreadyImageKitUrl(url?: string | null): boolean {
  if (!url) return false;
  // Normalize with trailing slash removed for comparison
  const endpoint = IMAGE_KIT_ENDPOINT.replace(/\/$/, '');
  return url.startsWith(endpoint + '/');
}

async function migrateOne(quiz: { id: string; title: string; imageUrl: string | null }): Promise<{ id: string; oldUrl: string | null; newUrl?: string; skipped?: boolean; error?: string }> {
  const oldUrl = quiz.imageUrl?.trim() || null;

  if (!oldUrl) {
    return { id: quiz.id, oldUrl, skipped: true, error: 'No existing imageUrl' };
  }
  if (isAlreadyImageKitUrl(oldUrl)) {
    return { id: quiz.id, oldUrl, skipped: true };
  }

  try {
    const fileNameBase = quiz.title?.trim() || quiz.id;
    const safeName = fileNameBase
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80);

    const upload = await imagekit.upload({
      file: oldUrl, // public URL source
      fileName: `${safeName || 'quiz'}-${quiz.id}.jpg`,
      useUniqueFileName: true,
      folder: '/quizzes',
    });

    const newUrl = upload.url;

    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { imageUrl: newUrl },
    });

    return { id: quiz.id, oldUrl, newUrl };
  } catch (err) {
    const message = (err as Error).message || String(err);
    return { id: quiz.id, oldUrl, error: message };
  }
}

async function main() {
  const limit = Number(process.env.MIGRATE_BATCH_LIMIT || '1000');
  const concurrency = Number(process.env.MIGRATE_CONCURRENCY || '3');

  // Fetch all quizzes which have an imageUrl (any) so we can migrate from public URL to ImageKit
  const quizzes = await prisma.quiz.findMany({
    select: { id: true, title: true, imageUrl: true },
    take: limit > 0 ? limit : undefined,
    orderBy: { createdAt: 'asc' },
    where:{imageUrl:{not:{contains: "imagekit.io"}}}
  });

  console.log(`Found ${quizzes.length} quizzes to check for migration.`);

  let processed = 0;
  let successes = 0;
  let skipped = 0;
  let failures = 0;

  // Simple concurrency control
  async function runChunk(chunk: typeof quizzes) {
    const results = await Promise.all(chunk.map(migrateOne));
    for (const r of results) {
      processed++;
      if (r.skipped) {
        skipped++;
        console.log(`SKIP  ${r.id} ${r.oldUrl ?? ''}`);
      } else if (r.error) {
        failures++;
        console.warn(`FAIL  ${r.id} -> ${r.error}`);
      } else {
        successes++;
        console.log(`OK    ${r.id} ${r.oldUrl ?? ''} -> ${r.newUrl}`);
      }
    }
  }

  for (let i = 0; i < quizzes.length; i += concurrency) {
    const chunk = quizzes.slice(i, i + concurrency);
    await runChunk(chunk);
  }

  console.log('--- Migration Summary ---');
  console.log(`Processed: ${processed}`);
  console.log(`Migrated:  ${successes}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failures}`);
}

main()
  .catch((err) => {
    console.error('Unexpected error during migration', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
