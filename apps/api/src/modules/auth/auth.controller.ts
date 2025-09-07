import { type NextFunction, type Request } from 'express';
import UserService from '../users/users.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import OAuthMiddleware, {
  type AuthenticatedRequest,
} from '@/middlewares/oauth.middleware';
import CookieService from '@/lib/cookie.service';
import RefreshService from '@/lib/refresh.service';

export default class AuthController extends Api {
  private readonly userService = new UserService();
  private readonly refreshService = new RefreshService();

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

        // Fetch full user data from database
        let fullUserData: any = null;
        try {
          const user = await this.userService.getUserByAuth0Id(req.user.sub);
          if (user) {
            fullUserData = {
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
          }
        } catch (error) {
          console.warn('Could not fetch full user data:', error);
        }

        this.send(
          res,
          {
            user: fullUserData || {
              sub: req.user.sub,
              email: req.user.email,
              name: req.user.name,
              picture: req.user.picture,
              emailVerified: req.user.email_verified,
              iat: req.user.iat,
              exp: req.user.exp,
            },
          },
          200,
          'getProfile'
        );
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

      // Optionally fetch full user data from database if needed
      let fullUserData: any = null;
      try {
        const user = await this.userService.getUserByAuth0Id(req.user.sub);
        if (user) {
          fullUserData = {
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
        }
      } catch (error) {
        console.warn('Could not fetch full user data:', error);
      }

      this.send(
        res,
        {
          authenticated: true,
          user: fullUserData || {
            sub: req.user.sub,
            email: req.user.email,
            name: req.user.name,
            picture: req.user.picture,
            emailVerified: req.user.email_verified,
            iat: req.user.iat,
            exp: req.user.exp,
          },
        },
        200,
        'checkAuth'
      );
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
   * Logout user by clearing all auth cookies
   */
  public logout = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      console.log('🚪 Logout endpoint called');

      // Clear all authentication cookies
      this.refreshService.clearAllAuthCookies(res);

      console.log('✅ User logged out successfully');

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
