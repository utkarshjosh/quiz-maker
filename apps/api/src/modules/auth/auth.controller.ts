import { type NextFunction, type Request } from 'express';
import UserService from '../users/users.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import OAuthMiddleware, {
  type AuthenticatedRequest,
} from '@/middlewares/oauth.middleware';
import CookieService from '@/lib/cookie.service';
import RefreshService from '@/lib/refresh.service';
import JWTService from '@/lib/jwt.service';

export default class AuthController extends Api {
  private readonly userService = new UserService();
  private readonly refreshService = new RefreshService();
  private readonly jwtService = new JWTService();

  /**
   * Get user profile - requires authentication
   */
  public getProfile = [
    OAuthMiddleware.requireAuth(),
    async (
      req: AuthenticatedRequest,
      res: CustomResponse<any>,
      next: NextFunction
    ) => {
      try {
        // User is already authenticated and populated by JWT middleware
        if (!req.user) {
          return this.send(res, null, 401, 'getProfile');
        }

        console.log('👤 Profile request for user:', {
          sub: req.user.sub,
          hasEmail: !!req.user.email,
        });

        // Fetch full user data from database
        try {
          const user = await this.userService.getUserByAuth0Id(req.user.sub);

          if (!user) {
            // User not in database - critical issue
            console.error('❌ User not found in database:', req.user.sub);
            console.error(
              '❌ This means the user was not created during OAuth callback'
            );

            // Return error with helpful message
            return this.send(
              res,
              {
                error: 'User not found in database',
                details:
                  'Your account was not properly created. Please log out and log in again.',
                sub: req.user.sub,
                authenticated: true,
                needsRelogin: true,
              },
              404,
              'getProfile'
            );
          }

          // Return full user data from database
          const fullUserData = {
            id: user.id,
            auth0Id: user.auth0Id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin,
          };

          console.log('✅ Profile fetched successfully:', {
            id: user.id,
            email: user.email,
          });

          this.send(res, { user: fullUserData }, 200, 'getProfile');
        } catch (error) {
          console.error('❌ Error fetching user from database:', error);
          throw error;
        }
      } catch (e) {
        next(e);
      }
    },
  ];

  /**
   * Check if user is authenticated via JWT
   */
  public checkAuth = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      // User context is populated by JWT middleware if authenticated
      if (!req.user) {
        return this.send(res, { authenticated: false }, 200, 'checkAuth');
      }

      console.log('🔍 Auth check for user:', {
        sub: req.user.sub,
        hasEmail: !!req.user.email,
      });

      // Fetch full user data from database
      try {
        const user = await this.userService.getUserByAuth0Id(req.user.sub);

        if (!user) {
          console.warn(
            '⚠️ User authenticated but not in database:',
            req.user.sub
          );
          // Still return authenticated=true, but without user data
          return this.send(
            res,
            {
              authenticated: true,
              userInDatabase: false,
              sub: req.user.sub,
              warning:
                'User not found in database. Please log out and log in again.',
            },
            200,
            'checkAuth'
          );
        }

        const fullUserData = {
          id: user.id,
          auth0Id: user.auth0Id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLogin: user.lastLogin,
        };

        this.send(
          res,
          {
            authenticated: true,
            userInDatabase: true,
            user: fullUserData,
          },
          200,
          'checkAuth'
        );
      } catch (error) {
        console.error('❌ Error checking user in database:', error);
        throw error;
      }
    } catch (e) {
      next(e);
    }
  };

  /**
   * Get Auth0 login URL
   */
  public getLoginUrl = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const returnTo = req.query.returnTo ?? '/';
      const loginUrl = (req as any).oidc?.login?.({
        returnTo: returnTo as string,
      });

      this.send(res, { loginUrl }, 200, 'getLoginUrl');
    } catch (e) {
      next(e);
    }
  };

  /**
   * Get Auth0 logout URL
   */
  public getLogoutUrl = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const returnTo = req.query.returnTo ?? '/';
      const logoutUrl = (req as any).oidc?.logout?.({
        returnTo: returnTo as string,
      });

      this.send(res, { logoutUrl }, 200, 'getLogoutUrl');
    } catch (e) {
      next(e);
    }
  };

  /**
   * Get environment-aware auth URLs for frontend
   */
  public getAuthUrls = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const authRoutes = OAuthMiddleware.getAuthRoutes();

      this.send(
        res,
        {
          routes: authRoutes,
          baseUrl: process.env.API_BASE_URL,
        },
        200,
        'getAuthUrls'
      );
    } catch (e) {
      next(e);
    }
  };

  /**
   * Refresh JWT tokens
   */
  public refresh = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      console.log('🔄 Refresh endpoint called');

      const refreshResult = await this.refreshService.refreshTokens(req);

      if (refreshResult.success && refreshResult.accessToken) {
        // Set new JWT cookie
        CookieService.setJWTCookie(res, refreshResult.accessToken);

        console.log('✅ Token refresh successful');

        this.send(
          res,
          {
            message: 'Token refreshed successfully',
            authenticated: true,
            tokenInfo: this.refreshService.getTokenInfo(
              refreshResult.accessToken
            ),
          },
          200,
          'refresh'
        );
      } else {
        console.log('❌ Token refresh failed:', refreshResult.error);

        if (refreshResult.shouldLogout) {
          // Clear all auth cookies
          this.refreshService.clearAllAuthCookies(res);
        }

        this.send(
          res,
          {
            message: 'Token refresh failed',
            authenticated: false,
            error: refreshResult.error,
            shouldLogout: refreshResult.shouldLogout,
          },
          401,
          'refresh'
        );
      }
    } catch (e) {
      console.error('❌ Error in refresh endpoint:', e);
      next(e);
    }
  };

  /**
   * Get token information (expiration, etc.)
   */
  public getTokenInfo = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const token = CookieService.getJWTFromCookie(req);

      if (!token) {
        return this.send(
          res,
          {
            authenticated: false,
            error: 'No token found',
          },
          401,
          'getTokenInfo'
        );
      }

      const tokenInfo = this.refreshService.getTokenInfo(token);

      this.send(
        res,
        {
          authenticated: true,
          tokenInfo,
        },
        200,
        'getTokenInfo'
      );
    } catch (e) {
      next(e);
    }
  };

  /**
   * Generate JWT token for WebSocket authentication
   */
  public getWebSocketToken = [
    OAuthMiddleware.requireAuth(),
    async (
      req: AuthenticatedRequest,
      res: CustomResponse<any>,
      next: NextFunction
    ) => {
      try {
        console.log('🔌 WebSocket token endpoint called');

        if (!req.user) {
          return this.send(
            res,
            {
              error: 'User not authenticated',
            },
            401,
            'getWebSocketToken'
          );
        }

        // Fetch full user data from database to ensure we have complete info
        const dbUser = await this.userService.getUserByAuth0Id(req.user.sub);

        if (!dbUser) {
          console.error('❌ User not found in database:', req.user.sub);
          return this.send(
            res,
            {
              error: 'User not found in database',
              details: 'Please log out and log in again to create your account',
            },
            404,
            'getWebSocketToken'
          );
        }

        // Generate a new JWT token specifically for WebSocket authentication
        // This token will be used by the Go WebSocket service
        if (!dbUser.auth0Id) {
          console.error('❌ User missing auth0Id in database:', {
            id: dbUser.id,
            email: dbUser.email,
          });
          return this.send(
            res,
            {
              error: 'User account incomplete',
              details:
                'Auth0 identifier missing. Please contact support or log out and log in again.',
            },
            422,
            'getWebSocketToken'
          );
        }

        const wsToken = this.jwtService.generateToken({
          sub: dbUser.auth0Id,
          email: dbUser.email,
          name: dbUser.name || dbUser.email,
          picture: dbUser.picture ?? undefined,
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        });

        console.log('✅ WebSocket token generated successfully for user:', {
          id: dbUser.id,
          email: dbUser.email,
          auth0Id: dbUser.auth0Id,
        });

        this.send(
          res,
          {
            token: wsToken,
            expiresIn: 3600, // 1 hour
            user: {
              sub: dbUser.auth0Id,
              email: dbUser.email,
              name: dbUser.name || dbUser.email,
            },
          },
          200,
          'getWebSocketToken'
        );
      } catch (e) {
        console.error('❌ Error generating WebSocket token:', e);
        next(e);
      }
    },
  ];

  /**
   * Logout user - clear all auth cookies and redirect to Auth0 logout
   */
  public logout = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      console.log('🚪 Logout: Clearing cookies');

      // Clear all authentication cookies
      this.refreshService.clearAllAuthCookies(res);

      // For POST requests, return success
      if (req.method === 'POST') {
        return this.send(
          res,
          {
            message: 'Logged out successfully',
            authenticated: false,
          },
          200,
          'logout'
        );
      }

      // For GET requests, just return success
      // Let the frontend handle Auth0 logout redirect
      this.send(
        res,
        {
          message: 'Logged out successfully',
          authenticated: false,
        },
        200,
        'logout'
      );
    } catch (e) {
      next(e);
    }
  };
}
