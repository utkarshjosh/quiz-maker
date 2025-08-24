# OAuth Authentication Implementation Guide

This document explains how to use the new OAuth authentication system with `express-openid-connect` and proper user context management.

## 🏗️ Architecture Overview

The new system provides:

- **Automatic OAuth flow** via express-openid-connect
- **User context population** for database joins
- **Type-safe authentication** with TypeScript
- **Environment-aware routing** for different environments
- **Clean middleware separation** for route protection

## 🔧 Core Components

### 1. OAuth Middleware (`src/middlewares/oauth.middleware.ts`)

The central authentication middleware that:

- Creates Auth0 OpenID Connect configuration
- Provides route protection methods
- Populates user context from database
- Handles environment-specific routing

### 2. Authenticated Request Interface

```typescript
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
```

## 🛡️ Route Protection

### Require Authentication (Protected Routes)

```typescript
import OAuthMiddleware from '@/middlewares/oauth.middleware';

// Protect entire route group
router.use(OAuthMiddleware.requireAuth());

// Or protect individual routes
router.get('/protected', OAuthMiddleware.requireAuth(), yourController.method);
```

### Optional Authentication

```typescript
// Add user context if authenticated, but don't require it
router.get('/optional', OAuthMiddleware.optionalAuth(), yourController.method);
```

## 👤 User Context Usage

### In Route Handlers

```typescript
import { type AuthenticatedRequest } from '@/middlewares/oauth.middleware';

export default class YourController extends Api {
  public yourMethod = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      // req.user is populated with full user entity from database
      const userId = req.user?.id;

      if (!userId) {
        return this.send(res, null, 401, 'Authentication required');
      }

      // Use userId for database joins
      const userQuizzes = await quizService.getQuizzesByUserId(userId);
      const userRooms = await roomService.getRoomsByUserId(userId);

      this.send(
        res,
        { quizzes: userQuizzes, rooms: userRooms },
        200,
        'Data retrieved'
      );
    } catch (e) {
      next(e);
    }
  };
}
```

### Database Joins Example

```typescript
// In your service layer
public async getUserQuizzesWithDetails(userId: string) {
  return await prisma.quiz.findMany({
    where: { userId },
    include: {
      user: true,        // User details
      tags: {            // Quiz tags
        include: {
          tag: true
        }
      },
      rooms: {           // Quiz rooms
        include: {
          members: true   // Room members
        }
      }
    }
  });
}
```

## 🚀 Available Middleware Methods

### `OAuthMiddleware.requireAuth()`

- **Purpose**: Protects routes requiring authentication
- **Behavior**:
  - Checks if user is authenticated
  - Populates `req.user` with database entity
  - Returns 401 if not authenticated
- **Use case**: Protected routes, user-specific data

### `OAuthMiddleware.optionalAuth()`

- **Purpose**: Adds user context if available
- **Behavior**:
  - Populates `req.user` if authenticated
  - Continues without error if not authenticated
- **Use case**: Public routes that show different content for logged-in users

### `OAuthMiddleware.create()`

- **Purpose**: Creates the main OAuth middleware
- **Behavior**: Configures Auth0 integration
- **Use case**: App-level middleware setup

## 🔄 Authentication Flow

1. **User visits protected route**
2. **Middleware checks authentication**
3. **If not authenticated**: Redirects to Auth0 login
4. **User logs in via Auth0**
5. **Auth0 redirects back with code**
6. **Middleware exchanges code for tokens**
7. **User context populated from database**
8. **Route handler receives populated `req.user`**

## 📍 Environment Configuration

The system automatically handles different environments:

```typescript
// Development
/api/1v /
  development /
  auth /
  login /
  api /
  v1 /
  development /
  auth /
  callback /
  // Production
  api /
  v1 /
  production /
  auth /
  login /
  api /
  v1 /
  production /
  auth /
  callback;
```

## 🗄️ Database Integration

### User Entity Population

The middleware automatically:

1. **Finds existing user** by Auth0 ID
2. **Creates new user** if not found
3. **Updates user data** from Auth0 profile
4. **Attaches user to request** for route handlers

### Available User Fields

```typescript
req.user = {
  id: 'uuid', // Database user ID
  auth0Id: 'auth0|123', // Auth0 user ID
  email: 'user@example.com', // User email
  name: 'John Doe', // User name
  picture: 'https://...', // Profile picture
  emailVerified: true, // Email verification status
  createdAt: Date, // Account creation date
  updatedAt: Date, // Last update date
  lastLogin: Date, // Last login timestamp
};
```

## 🔒 Security Features

- **Session management** with secure cookies
- **CSRF protection** via state parameter
- **Automatic token refresh**
- **Secure logout** with Auth0 integration
- **Environment-specific security** (HTTPS in production)

## 📝 Migration from Old System

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

## 🧪 Testing

### Test Protected Routes

```bash
# Should redirect to login
curl http://localhost:3000/api/v1/development/auth/profile

# After login, should return user data
curl -H "Cookie: session=..." http://localhost:3000/api/v1/development/auth/profile
```

### Test User Context

```typescript
// In your tests, mock the authenticated request
const mockReq = {
  user: {
    id: 'test-user-id',
    auth0Id: 'auth0|test',
    email: 'test@example.com',
    // ... other user fields
  },
} as AuthenticatedRequest;
```

## 🚨 Common Issues & Solutions

### "checks.state argument is missing"

- **Cause**: Session middleware not configured
- **Solution**: Ensure session middleware is added before OAuth middleware

### User context not populated

- **Cause**: Middleware order incorrect
- **Solution**: Use `OAuthMiddleware.requireAuth()` or `optionalAuth()`

### TypeScript errors

- **Cause**: Wrong interface import
- **Solution**: Import `AuthenticatedRequest` from `@/middlewares/oauth.middleware`

## 📚 Best Practices

1. **Always use `AuthenticatedRequest`** for protected routes
2. **Check `req.user` existence** before using user data
3. **Use user ID for database queries** instead of Auth0 ID
4. **Implement proper error handling** for authentication failures
5. **Test authentication flows** in different environments
6. **Monitor session management** and token refresh
7. **Use environment-specific configurations** for different deployments

## 🔗 Related Files

- `src/middlewares/oauth.middleware.ts` - Core OAuth implementation
- `src/modules/auth/auth.controller.ts` - Authentication endpoints
- `src/modules/auth/auth.route.ts` - Auth route definitions
- `src/app.ts` - OAuth middleware setup
- `prisma/schema.prisma` - User entity definition
