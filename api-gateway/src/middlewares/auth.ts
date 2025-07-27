import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpUnAuthorizedError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// Define our own user type without sensitive fields
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  profileData: any;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

interface JwtPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Verify JWT token
 */
const verifyToken = (token: string, type: 'access' | 'refresh' = 'access'): JwtPayload | null => {
  try {
    const secret = type === 'access' 
      ? process.env.JWT_SECRET 
      : process.env.JWT_REFRESH_SECRET;
    
    if (!secret) {
      logger.error('JWT secret not configured');
      return null;
    }

    const payload = jwt.verify(token, secret) as JwtPayload;
    
    if (payload.type !== type) {
      logger.warn('Token type mismatch', { expected: type, actual: payload.type });
      return null;
    }

    return payload;
  } catch (error) {
    logger.warn('Token verification failed', { error: error.message });
    return null;
  }
};

/**
 * Authentication middleware
 * Validates JWT token and loads user data
 */
export const verifyAuthToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      throw new HttpUnAuthorizedError('No token provided');
    }

    const payload = verifyToken(token, 'access');
    
    if (!payload) {
      throw new HttpUnAuthorizedError('Invalid or expired token');
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        profileData: true
      }
    });
    
    if (!user) {
      throw new HttpUnAuthorizedError('User not found');
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        userId: true,
        expiresAt: true
      }
    });
    
    if (!session || session.expiresAt < new Date()) {
      throw new HttpUnAuthorizedError('Session expired');
    }

    // Attach user and session to request
    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    if (error instanceof HttpUnAuthorizedError) {
      next(error);
    } else {
      logger.error('Authentication middleware error:', error);
      next(new HttpUnAuthorizedError('Authentication failed'));
    }
  }
};

/**
 * Optional authentication middleware
 * Validates token if present but doesn't throw error if missing
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }

    const payload = verifyToken(token, 'access');
    
    if (!payload) {
      next();
      return;
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        profileData: true
      }
    });
    
    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue without authentication
  }
};

/**
 * Require specific user role (future enhancement)
 */
export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new HttpUnAuthorizedError('Authentication required');
    }

    // For now, all users have the same role
    // This can be extended when user roles are implemented
    next();
  };
};

/**
 * Generate JWT tokens
 */
export const generateTokens = (userId: string, sessionId: string) => {
  const accessTokenSecret = process.env.JWT_SECRET;
  const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error('JWT secrets not configured');
  }

  const accessToken = jwt.sign(
    { userId, sessionId, type: 'access' },
    accessTokenSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, sessionId, type: 'refresh' },
    refreshTokenSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload | null => {
  return verifyToken(token, 'refresh');
};
