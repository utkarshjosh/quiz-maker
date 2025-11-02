import { type PrismaClient, type Prisma } from '@prisma/client';
import * as userData from './data/users.json';

export async function seedUsers(
  prisma: PrismaClient | Prisma.TransactionClient
) {
  const { users } = userData;

  const allUsersLength: number = users.length;
  console.log(`Seeding ${allUsersLength} users...`);

  // await prisma.user.createMany({
  //   data: users.map((user) => ({
  //     id: user.id,
  //     email: user.email,
  //     username: user.username,
  //     passwordHash: user.password_hash,
  //     emailVerified: user.email_verified,
  //     profileData: JSON.stringify(user.profile_data),
  //     createdAt: new Date(user.created_at),
  //     updatedAt: new Date(user.updated_at),
  //   })),
  //   skipDuplicates: true,
  // });
}
