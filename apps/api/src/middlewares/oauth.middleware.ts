import { auth, type ConfigParams } from 'express-openid-connect';
import { type Request, type Response, type NextFunction } from 'express';
import environment from '@/lib/environment';
import appConfig from '@/config/app.config';
import UserService from '@/modules/users/users.service';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    auth0Id: string;
    email: string;
    name?: string;
    picture?: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
  };
}

/**
 * Generic OAuth middleware factory for environment-based routes
 * Handles Auth0 integration with proper environment routing
 */
export class OAuthMiddleware {
  /**
   * Create OAuth middleware with environment-aware configuration
   */
  public static create() {
    const { env } = environment;
    const envConfig = environment.getConfig();
    const {
      api: { version },
    } = appConfig;

    // Build environment-aware routes
    const baseRoute = `/api/${version}/${env}/auth`;

    const config: ConfigParams = {
      authRequired: false,
      auth0Logout: true,
      baseURL: envConfig.apiBaseUrl,
      clientID: envConfig.auth0.clientId,
      issuerBaseURL: `https://${envConfig.auth0.domain}`,
      secret: envConfig.jwt.secret,
      clientAuthMethod: 'client_secret_post',
      clientSecret: envConfig.auth0.clientSecret,
      authorizationParams: {
        response_type: 'code',
        audience: envConfig.auth0.audience,
        scope: 'openid profile email',
      },
      routes: {
        callback: `${baseRoute}/callback`,
        login: `${baseRoute}/login`,
        logout: `${baseRoute}/logout`,
        postLogoutRedirect: envConfig.frontend.url,
      },
      // Handle login state with proper redirect
      getLoginState: (req, options) => {
        console.log('OAuth getLoginState called:', {
          env,
          baseRoute,
          returnTo: options?.returnTo,
          query: req.query,
        });

        const frontendUrl = envConfig.frontend.url;
        const returnTo = (req.query.returnTo as string) || '/';

        return {
          returnTo: `${frontendUrl}${returnTo}?auth=success`,
        };
      },
      // Handle successful callback
      afterCallback: async (req, res, session, state) => {
        console.log('OAuth afterCallback called:', {
          env,
          isAuthenticated: req.oidc?.isAuthenticated?.(),
          user: req.oidc?.user?.email,
        });

        // If authenticated, ensure user exists in database
        if (req.oidc?.isAuthenticated?.() && req.oidc?.user) {
          try {
            const userService = new UserService();
            const auth0User = req.oidc.user;

            // Create or update user in database
            const user = await userService.findOrCreateUser({
              sub: auth0User.sub,
              email: auth0User.email ?? '',
              name: auth0User.name,
              picture: auth0User.picture,
              email_verified: auth0User.email_verified ?? false,
            });

            if (user) {
              console.log('User created/updated in database:', {
                id: user.id,
                email: user.email,
                auth0Id: user.auth0Id,
              });
            }
          } catch (error) {
            console.error(
              'Error creating/updating user in afterCallback:',
              error
            );
            // Don't fail the callback, just log the error
          }
        }

        // Don't redirect here, let the route handler do it
        return session;
      },
    };

    return auth(config);
  }

  /**
   * Post-callback redirect handler
   * Should be used after the OAuth middleware in route handlers
   */
  public static callbackRedirect() {
    return (req: any, res: any, next: any) => {
      const envConfig = environment.getConfig();

      if (req.oidc?.isAuthenticated?.()) {
        console.log('OAuth callback redirect:', {
          env: environment.env,
          user: req.oidc.user?.email,
          redirecting: true,
        });

        const frontendUrl = envConfig.frontend.url;
        const returnTo = (req.query.returnTo as string) || '/';

        return res.redirect(`${frontendUrl}${returnTo}?auth=success`);
      }

      // If not authenticated, redirect with error
      const frontendUrl = envConfig.frontend.url;
      return res.redirect(`${frontendUrl}?auth=error`);
    };
  }

  /**
   * Get the environment-aware auth routes
   */
  public static getAuthRoutes() {
    const { env } = environment;
    const {
      api: { version },
    } = appConfig;
    const baseRoute = `/api/${version}/${env}/auth`;

    return {
      baseRoute,
      login: `${baseRoute}/login`,
      logout: `${baseRoute}/logout`,
      callback: `${baseRoute}/callback`,
      check: `${baseRoute}/check`,
      profile: `${baseRoute}/profile`,
    };
  }

  /**
   * Middleware to require authentication and populate user context
   */
  public static requireAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        if (!req.oidc?.isAuthenticated?.()) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'User not authenticated',
          });
        }

        // Populate user context for database joins
        await OAuthMiddleware.populateUserContext(req, res, next);
      } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
          success: false,
          message: 'Authentication error',
          error: 'Internal server error',
        });
      }
    };
  }

  /**
   * Middleware to optionally add user if authenticated
   */
  public static optionalAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        if (req.oidc?.isAuthenticated?.()) {
          await OAuthMiddleware.populateUserContext(req, res, next);
        } else {
          next();
        }
      } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
      }
    };
  }

  /**
   * Populate user context from database
   */
  private static async populateUserContext(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const auth0User = req.oidc?.user;
      if (!auth0User?.sub) {
        return res.status(401).json({
          success: false,
          message: 'Invalid user data',
          error: 'Missing user identifier',
        });
      }

      // Get or create user in database
      const userService = new UserService();
      const user = await userService.findOrCreateUser({
        sub: auth0User.sub,
        email: auth0User.email ?? '',
        name: auth0User.name,
        picture: auth0User.picture,
        email_verified: auth0User.email_verified ?? false,
      });

      if (!user) {
        return res.status(500).json({
          success: false,
          message: 'User creation failed',
          error: 'Database error',
        });
      }

      // Attach user to request for use in route handlers
      req.user = {
        id: user.id,
        auth0Id: user.auth0Id ?? '',
        email: user.email,
        name: user.name ?? undefined,
        picture: user.picture ?? undefined,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin ?? undefined,
      };
      next();
    } catch (error) {
      console.error('User context population error:', error);
      return res.status(500).json({
        success: false,
        message: 'User context error',
        error: 'Internal server error',
      });
    }
  }
}

export default OAuthMiddleware;
