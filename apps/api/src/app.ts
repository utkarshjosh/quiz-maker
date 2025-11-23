import cors from 'cors';
import nocache from 'nocache';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import expressJSDocSwagger from 'express-jsdoc-swagger';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import home from './home';
import environment from './lib/environment';
import expressJSDocSwaggerConfig from './config/express-jsdoc-swagger.config';
import appConfig from './config/app.config';
import errorHandler from '@/middlewares/error-handler';
import routes from '@/modules/index';
import prismaClient from '@/lib/prisma';
import OAuthMiddleware from '@/middlewares/oauth.middleware';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.setMiddlewares();
    this.disableSettings();
    this.setRoutes();
    this.setErrorHandler();
    this.initializeDocs();
  }

  private setMiddlewares(): void {
    const envConfig = environment.getConfig();

    // Trust proxy - CRITICAL for Cloudflare
    // This ensures Express uses X-Forwarded-Proto, X-Forwarded-Host headers
    // Without this, redirects will use HTTP instead of HTTPS behind Cloudflare
    if (environment.isProd() || environment.isStage()) {
      this.express.set('trust proxy', 1); // Trust first proxy (Cloudflare)
    }

    // Build allowed origins list
    const allowedOrigins = [
      'http://localhost:5173', // Frontend development fallback
      'http://localhost:8081', // Frontend development (common Vite port)
      envConfig.appUrl, // Backend URL
      envConfig.frontend.url, // Environment-configured frontend URL
      'https://quiz.utkarshjoshi.com', // Production frontend URL
    ].filter(Boolean); // Remove any undefined/null values

    this.express.use(
      cors({
        origin: allowedOrigins,
        credentials: true, // Allow cookies
        optionsSuccessStatus: 200, // Support legacy browsers
      })
    );
    this.express.use(morgan('dev'));
    this.express.use(nocache());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use(helmet());
    this.express.use(express.static('public'));
    this.express.use(cookieParser()); // Add cookie parsing for auth

    // Session middleware - required for express-openid-connect
    // Uses Redis in production (if REDIS_URL is set), memory store in development
    // Note: Using require for dynamic configuration (Redis is optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createSessionConfig } = require('@/lib/session.config');
    this.express.use(session(createSessionConfig()));

    // Use generic OAuth middleware
    // express-openid-connect automatically handles callback redirects
    // No need for additional callbackRedirect middleware
    this.express.use(OAuthMiddleware.create());
  }

  private disableSettings(): void {
    this.express.disable('x-powered-by');
  }

  private setRoutes(): void {
    const {
      api: { version },
    } = appConfig;
    const { env } = environment;
    this.express.use('/', home);
    this.express.use(`/api/${version}/${env}`, routes);
  }

  private setErrorHandler(): void {
    this.express.use(errorHandler);
  }

  private initializeDocs(): void {
    expressJSDocSwagger(this.express)(expressJSDocSwaggerConfig);
  }

  public async connectPrisma(): Promise<void> {
    await prismaClient.$connect();
  }
}

export default App;
