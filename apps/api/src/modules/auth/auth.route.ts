import { Router } from 'express';
import AuthController from './auth.controller';
import OAuthMiddleware from '@/middlewares/oauth.middleware';

const auth: Router = Router();
const authController = new AuthController();

// Check authentication status (optional auth to populate user context)
auth.get('/check', OAuthMiddleware.optionalAuth(), authController.checkAuth);

// Get user profile (requires authentication)
auth.get('/profile', authController.getProfile);

// Get Auth0 login URL
auth.get('/login-url', authController.getLoginUrl);

// Get Auth0 logout URL
auth.get('/logout-url', authController.getLogoutUrl);

// Refresh JWT tokens (needs main oauth middleware to access session)
auth.post('/refresh', authController.refresh);

// Get token information (expiration, etc.)
auth.get('/token-info', authController.getTokenInfo);

// Logout user (clear all auth cookies)
auth.post('/logout', authController.logout);

// GET logout route for frontend redirects (clears cookies and redirects)
// Using /logout-custom to avoid OAuth middleware conflict
auth.get('/logout-custom', authController.logout);

// Get environment-aware auth URLs for frontend
auth.get('/urls', authController.getAuthUrls);

// Get JWT token for WebSocket authentication
auth.get('/websocket-token', authController.getWebSocketToken);

export default auth;
