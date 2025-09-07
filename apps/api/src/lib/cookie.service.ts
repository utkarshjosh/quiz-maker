import { Request, Response } from 'express';
import environment from '@/lib/environment';

export class CookieService {
  private static readonly COOKIE_NAME = 'access_token';
  private static readonly COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Set JWT cookie after successful Auth0 callback
   */
  public static setJWTCookie(res: Response, token: string): void {
    const envConfig = environment.getConfig();
    const isProduction = environment.env === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'lax' as const, // Prevents CSRF via cross-site POST
      maxAge: this.COOKIE_MAX_AGE,
      path: '/',
      domain: undefined, // Can be set in production if needed
      expires: new Date(Date.now() + this.COOKIE_MAX_AGE), // Explicit expiration date
    };

    try {
      res.cookie(this.COOKIE_NAME, token, cookieOptions);
    } catch (error) {
      // Cookie setting failed
    }
  }

  /**
   * Clear JWT cookie on logout
   */
  public static clearJWTCookie(res: Response): void {
    const isProduction = environment.env === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 0, // Expire immediately
      path: '/',
      domain: undefined,
    };

    res.clearCookie(this.COOKIE_NAME, cookieOptions);
  }

  /**
   * Get JWT from cookie
   */
  public static getJWTFromCookie(req: Request): string | null {
    const token = req.cookies?.[this.COOKIE_NAME];

    if (!token) {
      return null;
    }

    // Basic validation - check if it's a JWT format
    if (typeof token !== 'string' || token.split('.').length !== 3) {
      return null;
    }

    return token;
  }

  /**
   * Check if JWT cookie exists
   */
  public static hasJWTCookie(req: Request): boolean {
    return this.getJWTFromCookie(req) !== null;
  }

  /**
   * Get cookie configuration for reference
   */
  public static getCookieConfig() {
    const isProduction = environment.env === 'production';

    return {
      name: this.COOKIE_NAME,
      maxAge: this.COOKIE_MAX_AGE,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}

export default CookieService;
