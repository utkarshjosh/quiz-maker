import session from 'express-session';
import environment from '@/lib/environment';

/**
 * Session configuration for Express
 * 
 * Development: Uses in-memory store (simple but doesn't persist across restarts)
 * Production: Should use Redis store (requires connect-redis and redis packages)
 * 
 * To use Redis in production:
 * 1. Install dependencies: npm install connect-redis redis
 * 2. Set REDIS_URL environment variable (e.g., redis://localhost:6379)
 * 3. The code below will automatically detect and use Redis in production
 */
export function createSessionConfig() {
  const envConfig = environment.getConfig();
  const isProduction = environment.isProd();

  // Base session configuration
  const sessionConfig: session.SessionOptions = {
    secret: envConfig.jwt.secret,
    resave: false,
    saveUninitialized: false,
    name: 'appSession',
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  // Use Redis store in production if available
  if (isProduction && process.env.REDIS_URL) {
    try {
      // Dynamic import to avoid requiring redis in development
      const RedisStore = require('connect-redis').default;
      const { createClient } = require('redis');

      console.log('🔴 Initializing Redis session store...');

      // Create Redis client
      const redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('❌ Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 50, 500);
          },
        },
      });

      // Handle Redis errors
      redisClient.on('error', (err: Error) => {
        console.error('❌ Redis Client Error:', err);
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis session store connected');
      });

      // Connect to Redis
      redisClient.connect().catch((err: Error) => {
        console.error('❌ Failed to connect to Redis:', err);
        console.warn('⚠️ Falling back to memory session store');
      });

      // Use Redis as session store
      sessionConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours in seconds
      });

      console.log('✅ Redis session store configured');
    } catch (error) {
      console.error('❌ Failed to initialize Redis session store:', error);
      console.warn('⚠️ Falling back to memory session store');
      console.warn('⚠️ Install dependencies: npm install connect-redis redis');
    }
  } else if (isProduction) {
    console.warn('⚠️ Production mode but REDIS_URL not set');
    console.warn('⚠️ Using memory session store (not recommended for production)');
    console.warn('⚠️ Set REDIS_URL environment variable to use Redis');
  } else {
    console.log('📝 Using memory session store (development mode)');
  }

  return sessionConfig;
}

