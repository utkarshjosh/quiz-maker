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
        const accessToken = session?.access_token;
        const idToken = session?.id_token;

        console.log('🔐 afterCallback triggered:', {
          hasAccessToken: !!accessToken,
          hasIdToken: !!idToken,
          sessionKeys: session ? Object.keys(session) : [],
        });

        // CRITICAL: Use id_token for cookie as it contains user profile data
        // Access tokens typically only have sub/aud/scope, not email/name/picture
        if (idToken || accessToken) {
          const tokenToUse = idToken || accessToken; // Prefer id_token
          if (tokenToUse) {
            console.log(
              '🍪 Setting JWT cookie with:',
              idToken ? 'id_token' : 'access_token'
            );
            CookieService.setJWTCookie(res, tokenToUse);
          }

          // CRITICAL FIX: Decode the id_token to get user claims
          // The session object doesn't have a 'claims' property - we need to decode the JWT
          if (idToken) {
            try {
              const jwt = require('jsonwebtoken');
              // Decode without verification (just to extract claims)
              const decoded = jwt.decode(idToken) as any;

              if (decoded && decoded.sub) {
                console.log('📝 Decoded user claims from id_token:', {
                  sub: decoded.sub,
                  email: decoded.email,
                  name: decoded.name,
                  picture: decoded.picture,
                  email_verified: decoded.email_verified,
                });

                const userService = new UserService();

                const dbUser = await userService.findOrCreateUser({
                  sub: decoded.sub,
                  email: decoded.email ?? '',
                  name: decoded.name,
                  picture: decoded.picture,
                  email_verified: decoded.email_verified ?? false,
                });

                console.log('✅ User created/updated successfully:', {
                  id: dbUser.id,
                  email: dbUser.email,
                  auth0Id: dbUser.auth0Id,
                });
              } else {
                console.error(
                  '❌ ERROR: Could not decode user claims from id_token'
                );
                console.error('Decoded token:', decoded);
              }
            } catch (error) {
              console.error(
                '❌ ERROR: Failed to decode id_token or create user:',
                error
              );
              console.error(
                'Error details:',
                error instanceof Error ? error.message : error
              );
            }
          } else {
            console.warn(
              '⚠️ WARNING: No id_token available, cannot create user in database'
            );
            console.warn(
              'Only access_token available - user profile data not included'
            );
          }
        } else {
          console.error('❌ ERROR: No access_token or id_token in session');
        }

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
          sub: userData.sub,
          email: userData.email,
          name: userData.name,
          hasEmail: !!userData.email,
          hasName: !!userData.name,
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
