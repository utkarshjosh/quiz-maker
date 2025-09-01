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

// Get environment-aware auth URLs for frontend
auth.get('/urls', authController.getAuthUrls);

export default auth;
