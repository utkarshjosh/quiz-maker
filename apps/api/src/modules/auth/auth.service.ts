import prisma from '@/lib/prisma';
import { HttpUnAuthorizedError, HttpBadRequestError } from '@/lib/errors';
import logger from '@/lib/logger';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export default class AuthService {
  public async login(_email: string, _password: string): Promise<AuthResponse> {
    // Legacy password-based auth is deprecated in favor of Auth0.
    throw new HttpBadRequestError('Password login is disabled. Use Auth0 login.', ['Use Auth0 login']);
  }

  public async register(_email: string, _username: string, _password: string): Promise<AuthResponse> {
    // Legacy registration is disabled.
    throw new HttpBadRequestError('Registration is managed by Auth0.', ['Use Auth0 Universal Login']);
  }

  public async refreshToken(_refreshToken: string): Promise<any> {
    // Refresh tokens are handled by Auth0.
    throw new HttpUnAuthorizedError('Use Auth0 to refresh tokens.');
  }

  public async logout(): Promise<void> {
    // Logout handled via Auth0 (front-end redirect). Nothing to do server-side.
    logger.info('Logout endpoint called - no-op under Auth0');
  }

  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
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
