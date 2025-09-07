import { Request, Response } from 'express';
import environment from '@/lib/environment';
import JWTService from '@/lib/jwt.service';
import CookieService from '@/lib/cookie.service';

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  error?: string;
  shouldLogout?: boolean;
}

export class RefreshService {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
  }

  /**
   * Attempt to refresh tokens using Auth0's refresh token mechanism
   */
  public async refreshTokens(req: Request): Promise<RefreshResult> {
    try {
      // Check what's available in the request

      // Check if current JWT is still valid
      const currentJWT = CookieService.getJWTFromCookie(req);

      if (currentJWT) {
        const isExpired = this.jwtService.isTokenExpired(currentJWT);

        if (!isExpired) {
          return {
            success: true,
            accessToken: currentJWT,
          };
        }
      }

      // Try to get session data from various sources
      let session = (req as any).oidc?.session || (req as any).session;

      // If we have an authenticated user but no session, try to get session from OIDC
      if (!session && (req as any).oidc?.isAuthenticated?.()) {
        const oidc = (req as any).oidc;
        if (oidc && oidc.session) {
          session = oidc.session;
        }
      }

      // If no session found, try to manually decrypt the appSession cookie
      if (!session && req.cookies?.appSession) {
        try {
          const sessionSecret = process.env.JWT_SECRET;
          if (!sessionSecret) {
            throw new Error('JWT_SECRET not configured');
          }

          const { jwtDecrypt } = await import('jose');
          const secret = new TextEncoder().encode(sessionSecret);
          const { payload } = await jwtDecrypt(req.cookies.appSession, secret);

          // The payload might contain nested session data
          if (payload.session) {
            session = payload.session;
          } else if (payload.cookie) {
            try {
              const cookieData = JSON.parse(payload.cookie);
              session = cookieData;
            } catch (e) {
              if (
                payload.cookie.includes('access_token') ||
                payload.cookie.includes('id_token')
              ) {
                const tokenMatch = payload.cookie.match(
                  /(access_token|id_token|refresh_token)["\s]*:["\s]*([^"}\s,]+)/g
                );
                if (tokenMatch) {
                  const tokens = {};
                  tokenMatch.forEach((match) => {
                    const [key, value] = match.split(/["\s]*:["\s]*/);
                    tokens[key] = value;
                  });
                  session = tokens;
                } else {
                  session = payload;
                }
              } else {
                session = payload;
              }
            }
          } else {
            session = payload;
          }
        } catch (error) {
          // Session decryption failed, continue without session
        }
      }

      if (!session) {
        if ((req as any).oidc?.isAuthenticated?.()) {
          return {
            success: false,
            error: 'User authenticated but no session found',
            shouldLogout: true,
          };
        }

        return {
          success: false,
          error: 'No session found',
          shouldLogout: true,
        };
      }

      // Check if we have a refresh token
      if (session.refresh_token) {
        try {
          const newTokens = await this.refreshWithAuth0(session.refresh_token);

          if (newTokens.access_token) {
            return {
              success: true,
              accessToken: newTokens.access_token,
              idToken: newTokens.id_token,
            };
          }
        } catch (error) {
          // Auth0 refresh failed, continue to fallback
        }
      }

      // Fallback: Use existing tokens from session if available
      const accessToken = session.access_token;
      const idToken = session.id_token;

      if (accessToken || idToken) {
        const tokenToUse = accessToken || idToken;

        return {
          success: true,
          accessToken: tokenToUse,
          idToken: idToken,
        };
      } else {
        // If user is authenticated but no tokens, generate a new JWT from user data
        if ((req as any).oidc?.isAuthenticated?.() && (req as any).oidc?.user) {
          try {
            const user = (req as any).oidc.user;

            // Generate a new JWT using user data
            const newJWT = this.jwtService.generateToken({
              sub: user.sub,
              email: user.email,
              name: user.name,
              picture: user.picture,
              exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
            });

            return {
              success: true,
              accessToken: newJWT,
            };
          } catch (error) {
            // JWT generation failed
          }
        }

        return {
          success: false,
          error: 'No valid tokens in session',
          shouldLogout: true,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Refresh failed',
        shouldLogout: true,
      };
    }
  }

  /**
   * Refresh tokens using Auth0's refresh token endpoint
   */
  private async refreshWithAuth0(refreshToken: string): Promise<{
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
  }> {
    const envConfig = environment.getConfig();

    const response = await fetch(
      `https://${envConfig.auth0.domain}/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: envConfig.auth0.clientId,
          client_secret: envConfig.auth0.clientSecret,
          refresh_token: refreshToken,
          audience: envConfig.auth0.audience,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Auth0 refresh failed: ${response.status} ${error}`);
    }

    return await response.json();
  }

  /**
   * Clear all authentication cookies and session
   */
  public clearAllAuthCookies(res: Response): void {
    console.log('🧹 Clearing all authentication cookies');

    // Clear JWT cookie
    CookieService.clearJWTCookie(res);

    // Clear Auth0 session cookie
    res.clearCookie('appSession', {
      path: '/',
      httpOnly: true,
      secure: environment.env === 'production',
      sameSite: 'lax',
    });

    // Clear any other auth-related cookies
    res.clearCookie('auth_verification', {
      path: '/',
      httpOnly: true,
      secure: environment.env === 'production',
      sameSite: 'lax',
    });

    console.log('✅ All authentication cookies cleared');
  }

  /**
   * Check if a token is close to expiration (within 5 minutes)
   */
  public isTokenNearExpiration(token: string): boolean {
    try {
      const expiration = this.jwtService.getTokenExpiration(token);
      if (!expiration) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = expiration - currentTime;
      const fiveMinutes = 5 * 60; // 5 minutes in seconds

      return timeUntilExpiration <= fiveMinutes;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Get token expiration info for frontend
   */
  public getTokenInfo(token: string): {
    expiresAt: Date | null;
    isExpired: boolean;
    isNearExpiration: boolean;
  } {
    try {
      const expiration = this.jwtService.getTokenExpiration(token);
      const expiresAt = expiration ? new Date(expiration * 1000) : null;
      const isExpired = this.jwtService.isTokenExpired(token);
      const isNearExpiration = this.isTokenNearExpiration(token);

      return {
        expiresAt,
        isExpired,
        isNearExpiration,
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return {
        expiresAt: null,
        isExpired: true,
        isNearExpiration: true,
      };
    }
  }
}

export default RefreshService;
