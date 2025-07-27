import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { generateTokens } from '@/middlewares/auth';
import { HttpUnAuthorizedError, HttpBadRequestError } from '@/lib/errors';
import logger from '@/lib/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: AuthTokens;
}

export default class AuthService {
  public async login(email: string, password: string): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new HttpUnAuthorizedError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new HttpUnAuthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: crypto.randomBytes(32).toString('hex'),
        expiresAt,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, session.id);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  public async register(email: string, username: string, password: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new HttpBadRequestError('Email already registered', ['Email is already in use']);
      }
      if (existingUser.username === username) {
        throw new HttpBadRequestError('Username already taken', ['Username is already in use']);
      }
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        username,
        passwordHash,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken: crypto.randomBytes(32).toString('hex'),
        expiresAt,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, session.id);

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user,
      tokens,
    };
  }

  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Find session by refresh token
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new HttpUnAuthorizedError('Invalid or expired refresh token');
    }

    // Update session last used
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsed: new Date() },
    });

    // Generate new tokens
    const tokens = generateTokens(session.userId, session.id);

    logger.info('Token refreshed successfully', { userId: session.userId });

    return tokens;
  }

  public async logout(sessionId: string): Promise<void> {
    await prisma.userSession.delete({
      where: { id: sessionId },
    });

    logger.info('User logged out successfully', { sessionId });
  }

  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        profileData: true,
      },
    });

    if (!user) {
      throw new HttpUnAuthorizedError('User not found');
    }

    return user;
  }
} 