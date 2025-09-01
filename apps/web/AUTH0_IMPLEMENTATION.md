# Auth0 Implementation Guide

This document explains how the Auth0 authentication system is implemented in the QuizChamp frontend.

## Overview

The application uses Auth0 for user authentication, providing:

- Social login (Google, GitHub, Facebook)
- Email/password authentication
- JWT token management
- Protected routes
- User profile management

## Architecture

### 1. Auth0 Provider Setup (`main.tsx`)

- Wraps the entire application with `Auth0Provider`
- Configures domain, client ID, audience, and redirect URI
- Enables local storage caching and refresh tokens

### 2. Authentication Context (`auth/AuthContext.tsx`)

- Provides authentication state throughout the app
- Manages user login/logout
- Handles access token retrieval
- Exposes user information and authentication status

### 3. Protected Routes (`auth/ProtectedRoute.tsx`)

- Shows login modal for unauthenticated users
- Prevents access to protected content without authentication
- Customizable messages for different protected areas

### 4. Login Modal (`components/LoginModal.tsx`)

- Beautiful modal interface for authentication
- Supports social login and email/password
- Appears when users try to access protected features

## Features

### Quiz Card Protection

- Clicking quiz cards shows login modal for unauthenticated users
- Authenticated users can directly access quizzes
- Hover text changes based on authentication status

### Header Integration

- Shows sign-in button for unauthenticated users
- Displays user avatar and dropdown menu for authenticated users
- Profile access and logout functionality

### User Profile Management

- Complete profile page with editing capabilities
- Email verification status
- Account settings management
- Integration with backend API

## Backend Integration

### User Service (`api-gateway/src/modules/users/users.service.ts`)

- Handles user creation and updates
- Manages Auth0 ID linking
- Supports email verification
- Tracks user activity

### API Endpoints

- `GET /users/me` - Get current user profile
- `PUT /users/profile` - Update user profile
- `POST /users/verify-email` - Verify user email
- `DELETE /users` - Delete user account

## Environment Variables

Required environment variables in `.env`:

```bash
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-audience
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
```

## Usage Examples

### Checking Authentication Status

```tsx
import { useAuth } from "@/auth/AuthContext";

const { isAuthenticated, user, isLoading } = useAuth();

if (isLoading) return <div>Loading...</div>;
if (!isAuthenticated) return <div>Please sign in</div>;
```

### Protecting Routes

```tsx
import ProtectedRoute from "@/auth/ProtectedRoute";

<ProtectedRoute title="Sign in to access this feature">
  <ProtectedComponent />
</ProtectedRoute>;
```

### Making Authenticated API Calls

```tsx
import { useAuth } from "@/auth/AuthContext";

const { getAccessToken } = useAuth();
const token = await getAccessToken();

// Use token in API calls
const response = await fetch("/api/protected", {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Security Features

- JWT token validation
- Automatic token refresh
- Secure logout with redirect
- Protected API endpoints
- Email verification support

## Customization

### Login Modal Messages

```tsx
<LoginModal
  title="Custom Title"
  description="Custom description for this feature"
/>
```

### Protected Route Messages

```tsx
<ProtectedRoute
  title="Access Required"
  description="This feature requires authentication">
  <Component />
</ProtectedRoute>
```

## Troubleshooting

### Common Issues

1. **Auth0 not loading**: Check environment variables and Auth0 configuration
2. **Token errors**: Ensure audience and scope are correctly configured
3. **Redirect issues**: Verify redirect URI in Auth0 dashboard
4. **API calls failing**: Check token format and backend validation

### Debug Mode

Enable debug logging by adding to your environment:

```bash
VITE_AUTH0_DEBUG=true
```

## Future Enhancements

- Multi-factor authentication
- Role-based access control
- Advanced user permissions
- Social login providers expansion
- Offline authentication support


