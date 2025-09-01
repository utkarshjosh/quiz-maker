# ADR 006: OAuth Authentication Implementation

## Status

Accepted

## Context

The Quiz Maker project requires a robust authentication system that:

- Integrates with Auth0 for identity management
- Provides secure user authentication
- Manages user sessions and context
- Integrates with the database for user data
- Supports multiple environments (development, production)

We needed to choose between:

- Custom authentication implementation
- Third-party authentication providers
- Auth0 with OpenID Connect
- Session-based vs token-based authentication

## Decision

Implement OAuth authentication using **Auth0** with **express-openid-connect** middleware, providing:

- **Automatic OAuth flow** via express-openid-connect
- **User context population** for database joins
- **Type-safe authentication** with TypeScript
- **Environment-aware routing** for different environments
- **Clean middleware separation** for route protection

## Consequences

### Positive

- **Security**: Industry-standard OAuth 2.0 and OpenID Connect
- **User Management**: Auth0 handles user registration, password reset, MFA
- **Integration**: Seamless integration with existing systems
- **Scalability**: Auth0 scales with user growth
- **Compliance**: Built-in security and compliance features
- **Developer Experience**: Excellent tooling and documentation
- **Type Safety**: Full TypeScript integration

### Negative

- **Vendor Lock-in**: Dependent on Auth0 service
- **Cost**: Auth0 pricing scales with user count
- **Complexity**: OAuth flow complexity
- **Learning Curve**: Team needs to understand OAuth concepts

### Mitigation

- Comprehensive documentation and training
- Clear implementation patterns
- Fallback authentication strategies
- Regular security reviews

## Implementation

### Core Components

#### 1. OAuth Middleware (`src/middlewares/oauth.middleware.ts`)

```typescript
import { auth } from "express-openid-connect";
import { Request } from "express";

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

export class OAuthMiddleware {
  static create() {
    return auth({
      authRequired: false,
      auth0Logout: true,
      baseURL: process.env.BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
      secret: process.env.SESSION_SECRET,
      routes: {
        login: false,
        callback: "/auth/callback",
        logout: "/auth/logout",
      },
      afterCallback: async (req, session, state) => {
        // Populate user context from database
        const user = await this.populateUserContext(session.user);
        req.user = user;
        return session;
      },
    });
  }

  static requireAuth() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      next();
    };
  }

  static optionalAuth() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      // User context populated if authenticated, but not required
      next();
    };
  }
}
```

#### 2. Route Protection

```typescript
import OAuthMiddleware from "@/middlewares/oauth.middleware";

// Protect entire route group
router.use(OAuthMiddleware.requireAuth());

// Or protect individual routes
router.get("/protected", OAuthMiddleware.requireAuth(), yourController.method);

// Optional authentication
router.get("/optional", OAuthMiddleware.optionalAuth(), yourController.method);
```

#### 3. User Context Usage

```typescript
import { type AuthenticatedRequest } from "@/middlewares/oauth.middleware";

export default class QuizController extends Api {
  public getUserQuizzes = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return this.send(res, null, 401, "Authentication required");
      }

      // Use userId for database joins
      const userQuizzes = await quizService.getQuizzesByUserId(userId);

      this.send(res, { quizzes: userQuizzes }, 200, "Quizzes retrieved");
    } catch (e) {
      next(e);
    }
  };
}
```

### Environment Configuration

#### Development

```bash
# .env
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
BASE_URL=http://localhost:3000
SESSION_SECRET=your_session_secret
```

#### Production

```bash
# .env
AUTH0_CLIENT_ID=your_production_client_id
AUTH0_CLIENT_SECRET=your_production_client_secret
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
BASE_URL=https://your-domain.com
SESSION_SECRET=your_secure_session_secret
```

### Database Integration

#### User Entity Population

The middleware automatically:

1. **Finds existing user** by Auth0 ID
2. **Creates new user** if not found
3. **Updates user data** from Auth0 profile
4. **Attaches user to request** for route handlers

```typescript
private static async populateUserContext(auth0User: any) {
  const prisma = new PrismaClient();

  try {
    let user = await prisma.user.findUnique({
      where: { auth0Id: auth0User.sub }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          auth0Id: auth0User.sub,
          email: auth0User.email,
          name: auth0User.name,
          picture: auth0User.picture,
          emailVerified: auth0User.email_verified,
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: auth0User.name,
          picture: auth0User.picture,
          emailVerified: auth0User.email_verified,
          lastLogin: new Date(),
        }
      });
    }

    return user;
  } finally {
    await prisma.$disconnect();
  }
}
```

## Security Features

- **Session management** with secure cookies
- **CSRF protection** via state parameter
- **Automatic token refresh**
- **Secure logout** with Auth0 integration
- **Environment-specific security** (HTTPS in production)

## Testing

### Test Protected Routes

```typescript
// Mock authenticated request
const mockReq = {
  user: {
    id: "test-user-id",
    auth0Id: "auth0|test",
    email: "test@example.com",
    name: "Test User",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as AuthenticatedRequest;

// Test with mocked request
const result = await controller.method(mockReq, mockRes, mockNext);
```

### Test Authentication Flow

```bash
# Should redirect to login
curl http://localhost:3000/api/v1/development/auth/profile

# After login, should return user data
curl -H "Cookie: session=..." http://localhost:3000/api/v1/development/auth/profile
```

## Migration from Old System

### Before (Custom Auth0)

```typescript
// Manual token handling
const token = await exchangeCodeForTokens(code);
const user = await verifyIdToken(token.id_token);
// Manual user creation/lookup
```

### After (OAuth Middleware)

```typescript
// Automatic token handling
// User context automatically populated
const userId = req.user?.id; // Ready for database queries
```

## Best Practices

1. **Always use `AuthenticatedRequest`** for protected routes
2. **Check `req.user` existence** before using user data
3. **Use user ID for database queries** instead of Auth0 ID
4. **Implement proper error handling** for authentication failures
5. **Test authentication flows** in different environments
6. **Monitor session management** and token refresh
7. **Use environment-specific configurations** for different deployments

## Related Decisions

- ADR 005: Database Schema Management with Prisma
- ADR 007: Data Validation and Sanitization
- ADR 008: Session Management and Security
