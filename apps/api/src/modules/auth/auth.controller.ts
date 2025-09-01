import { type NextFunction, type Request } from 'express';
import UserService from '../users/users.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import OAuthMiddleware, {
  type AuthenticatedRequest,
} from '@/middlewares/oauth.middleware';

export default class AuthController extends Api {
  private readonly userService = new UserService();

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
        // User is already authenticated and populated by middleware
        if (!req.user) {
          return this.send(res, null, 401, 'getProfile');
        }

        this.send(
          res,
          {
            user: {
              id: req.user.id,
              auth0Id: req.user.auth0Id,
              email: req.user.email,
              name: req.user.name,
              picture: req.user.picture,
              emailVerified: req.user.emailVerified,
              createdAt: req.user.createdAt,
              updatedAt: req.user.updatedAt,
              lastLogin: req.user.lastLogin,
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
   * Check if user is authenticated
   */
  public checkAuth = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const isAuthenticated = (req as any).oidc?.isAuthenticated?.();

      if (!isAuthenticated) {
        return this.send(res, { authenticated: false }, 200, 'checkAuth');
      }
      console.log('checkAuth---oidc is true', req.user);
      // User context is populated by middleware if authenticated
      if (!req.user) {
        return this.send(
          res,
          { authenticated: false, oidc: true },
          200,
          'checkAuth'
        );
      }

      this.send(
        res,
        {
          authenticated: true,
          user: {
            id: req.user.id,
            auth0Id: req.user.auth0Id,
            email: req.user.email,
            name: req.user.name,
            picture: req.user.picture,
            emailVerified: req.user.emailVerified,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt,
            lastLogin: req.user.lastLogin,
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
}
