import { type Request, type Response, type NextFunction } from 'express';
import JWTService from '@/lib/jwt.service';
import CookieService from '@/lib/cookie.service';
import RefreshService from '@/lib/refresh.service';
import { type AuthenticatedRequest } from './oauth.middleware';

export class JWTRefreshMiddleware {
  private jwtService: JWTService;
  private refreshService: RefreshService;

  constructor() {
    this.jwtService = new JWTService();
    this.refreshService = new RefreshService();
  }

  /**
   * Middleware that automatically refreshes tokens when they're near expiration
   */
  public autoRefresh() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const token = CookieService.getJWTFromCookie(req);

        if (!token) {
          console.log('🔄 No JWT token found, skipping auto-refresh');
          return next();
        }

        // Check if token is near expiration
        const isNearExpiration =
          this.refreshService.isTokenNearExpiration(token);

        if (isNearExpiration) {
          console.log(
            '⏰ JWT token is near expiration, attempting auto-refresh'
          );

          // Attempt to refresh the token
          const refreshResult = await this.refreshService.refreshTokens(req);

          if (refreshResult.success && refreshResult.accessToken) {
            // Set new JWT cookie
            CookieService.setJWTCookie(res, refreshResult.accessToken);
            console.log('✅ Auto-refresh successful');

            // Update the request with new token for this request
            req.refreshedToken = refreshResult.accessToken;
          } else {
            console.log('❌ Auto-refresh failed:', refreshResult.error);

            if (refreshResult.shouldLogout) {
              // Clear all auth cookies
              this.refreshService.clearAllAuthCookies(res);

              return res.status(401).json({
                success: false,
                message: 'Token expired and refresh failed',
                error: 'Authentication required',
                shouldLogout: true,
              });
            }
          }
        }

        next();
      } catch (error) {
        console.error('❌ Error in auto-refresh middleware:', error);
        next();
      }
    };
  }

  /**
   * Middleware that requires authentication with automatic refresh
   */
  public requireAuthWithRefresh() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        console.log('🔍 JWT requireAuthWithRefresh middleware called:', {
          url: req.url,
          method: req.method,
          hasRefreshedToken: !!req.refreshedToken,
        });

        // Use refreshed token if available, otherwise get from cookie
        const token = req.refreshedToken || CookieService.getJWTFromCookie(req);

        if (!token) {
          console.log('❌ No JWT token found');
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'No access token found',
          });
        }

        // Verify JWT token
        const decodedToken = await this.jwtService.verifyToken(token);
        const userData = this.jwtService.extractUserData(decodedToken);

        // Attach minimal user data to request
        req.user = userData;

        console.log('✅ JWT authentication successful:', {
          user: userData.email,
          sub: userData.sub,
          exp: new Date(userData.exp * 1000).toISOString(),
          wasRefreshed: !!req.refreshedToken,
        });

        next();
      } catch (error) {
        console.error('❌ JWT authentication error:', error);

        // Try to refresh the token
        console.log('🔄 Authentication failed, attempting token refresh');
        const refreshResult = await this.refreshService.refreshTokens(req);

        if (refreshResult.success && refreshResult.accessToken) {
          // Set new JWT cookie and retry authentication
          CookieService.setJWTCookie(res, refreshResult.accessToken);

          try {
            const decodedToken = await this.jwtService.verifyToken(
              refreshResult.accessToken
            );
            const userData = this.jwtService.extractUserData(decodedToken);
            req.user = userData;

            console.log('✅ Authentication successful after refresh');
            return next();
          } catch (retryError) {
            console.error(
              '❌ Authentication failed even after refresh:',
              retryError
            );
          }
        }

        // Clear invalid cookies
        this.refreshService.clearAllAuthCookies(res);

        return res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: 'Token verification failed',
          shouldLogout: true,
        });
      }
    };
  }

  /**
   * Middleware that optionally adds user if authenticated (with refresh)
   */
  public optionalAuthWithRefresh() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        // Use refreshed token if available, otherwise get from cookie
        const token = req.refreshedToken || CookieService.getJWTFromCookie(req);

        if (token) {
          try {
            const decodedToken = await this.jwtService.verifyToken(token);
            req.user = this.jwtService.extractUserData(decodedToken);

            console.log('✅ Optional JWT authentication successful:', {
              user: req.user.email,
              sub: req.user.sub,
            });
          } catch (error) {
            console.warn('⚠️ Optional JWT authentication failed:', error);

            // Try to refresh the token
            const refreshResult = await this.refreshService.refreshTokens(req);

            if (refreshResult.success && refreshResult.accessToken) {
              try {
                CookieService.setJWTCookie(res, refreshResult.accessToken);
                const decodedToken = await this.jwtService.verifyToken(
                  refreshResult.accessToken
                );
                req.user = this.jwtService.extractUserData(decodedToken);

                console.log(
                  '✅ Optional authentication successful after refresh'
                );
              } catch (retryError) {
                console.warn(
                  '⚠️ Optional authentication failed even after refresh:',
                  retryError
                );
                // Clear invalid cookie but continue without user
                this.refreshService.clearAllAuthCookies(res);
              }
            } else {
              // Clear invalid cookie but continue without user
              this.refreshService.clearAllAuthCookies(res);
            }
          }
        }

        next();
      } catch (error) {
        console.error('Optional auth with refresh middleware error:', error);
        next();
      }
    };
  }
}

export default JWTRefreshMiddleware;
