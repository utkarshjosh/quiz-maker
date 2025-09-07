import { auth, type ConfigParams } from 'express-openid-connect';
import { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import environment from '@/lib/environment';
import appConfig from '@/config/app.config';
import UserService from '@/modules/users/users.service';
import JWTService, { type MinimalUserData } from '@/lib/jwt.service';
import CookieService from '@/lib/cookie.service';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: MinimalUserData;
  refreshedToken?: string; // Token that was refreshed during the request
}

/**
 * Generic OAuth middleware factory for environment-based routes
 * Handles Auth0 integration with proper environment routing
 */
export class OAuthMiddleware {
  /**
   * Create session middleware for OAuth
   */
  public static createSessionMiddleware() {
    const envConfig = environment.getConfig();
    const isProduction = environment.env === 'production';

    return session({
      secret: envConfig.jwt.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' as const,
      },
      name: 'appSession', // This should match the cookie name used by express-openid-connect
    });
  }

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
        scope: 'openid profile email offline_access',
      },
      // Ensure session is properly stored
      session: {
        rolling: true,
        rollingDuration: 24 * 60 * 60 * 1000, // 24 hours
      },
      routes: {
        callback: `${baseRoute}/callback`,
        login: `${baseRoute}/login`,
        logout: `${baseRoute}/logout`,
        postLogoutRedirect: envConfig.frontend.url,
      },
      // Handle login state with proper redirect
      getLoginState: (req, options) => {
        const frontendUrl = envConfig.frontend.url;
        const returnTo = (req.query.returnTo as string) || '/';

        return {
          returnTo: `${frontendUrl}${returnTo}?auth=success`,
        };
      },
      // Handle successful callback
      afterCallback: async (req, res, session, state) => {
        // Check if we have tokens in the session
        const accessToken = session?.access_token;
        const idToken = session?.id_token;

        // If we have tokens, set JWT cookie
        if (accessToken || idToken) {
          try {
            const tokenToUse = accessToken || idToken;

            if (tokenToUse) {
              // Set JWT cookie with the token
              CookieService.setJWTCookie(res, tokenToUse);

              // Keep the Auth0 session cookie for token refresh
              // Don't clear it so we can refresh tokens later
            }

            // Try to create/update user in database if we have user info
            if (req.oidc?.user) {
              try {
                const userService = new UserService();
                const auth0User = req.oidc.user;

                const user = await userService.findOrCreateUser({
                  sub: auth0User.sub,
                  email: auth0User.email ?? '',
                  name: auth0User.name,
                  picture: auth0User.picture,
                  email_verified: auth0User.email_verified ?? false,
                });

                // User created/updated successfully
              } catch (userError) {
                // User creation failed, continue
              }
            }
          } catch (error) {
            // Error in afterCallback, continue
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
   * Middleware to require authentication using JWT
   */
  public static requireAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        console.log('🔍 JWT requireAuth middleware called:', {
          url: req.url,
          method: req.method,
          cookies: req.cookies,
          cookieNames: Object.keys(req.cookies || {}),
        });

        const token = CookieService.getJWTFromCookie(req);

        console.log('🔑 JWT token from cookie:', {
          hasToken: !!token,
          tokenLength: token?.length || 0,
          tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
        });

        if (!token) {
          console.log('❌ No JWT token found in cookies');
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'No access token found',
          });
        }

        // Verify JWT token
        const jwtService = new JWTService();
        const decodedToken = await jwtService.verifyToken(token);
        const userData = jwtService.extractUserData(decodedToken);

        // Attach minimal user data to request
        req.user = userData;

        console.log('✅ JWT authentication successful:', {
          user: userData.email,
          sub: userData.sub,
          exp: new Date(userData.exp * 1000).toISOString(),
        });

        next();
      } catch (error) {
        console.error('❌ JWT authentication error:', error);

        // Clear invalid cookie
        CookieService.clearJWTCookie(res);

        return res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: 'Token verification failed',
        });
      }
    };
  }

  /**
   * Middleware to optionally add user if authenticated via JWT
   */
  public static optionalAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const token = CookieService.getJWTFromCookie(req);

        if (token) {
          try {
            const jwtService = new JWTService();
            const decodedToken = await jwtService.verifyToken(token);
            req.user = jwtService.extractUserData(decodedToken);

            console.log('Optional JWT authentication successful:', {
              user: req.user.email,
              sub: req.user.sub,
            });
          } catch (error) {
            console.warn('Optional JWT authentication failed:', error);
            // Clear invalid cookie but continue without user
            CookieService.clearJWTCookie(res);
          }
        }

        next();
      } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
      }
    };
  }

  /**
   * Clear JWT cookie on logout
   */
  public static logout() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Clear JWT cookie
        CookieService.clearJWTCookie(res);

        console.log('JWT cookie cleared on logout');
        next();
      } catch (error) {
        console.error('Logout error:', error);
        next();
      }
    };
  }

  /**
   * Helper function to get user ID from JWT user data
   * This will fetch the database user ID using the Auth0 sub
   */
  public static async getUserIdFromJWT(
    req: AuthenticatedRequest
  ): Promise<string | null> {
    if (!req.user?.sub) {
      return null;
    }

    try {
      const userService = new UserService();
      const user = await userService.getUserByAuth0Id(req.user.sub);
      return user?.id || null;
    } catch (error) {
      console.error('Error fetching user ID from JWT:', error);
      return null;
    }
  }
}

export default OAuthMiddleware;
