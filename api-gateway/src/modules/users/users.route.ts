import { Router } from 'express';
import UserController from './users.controller';
import OAuthMiddleware, {
  type AuthenticatedRequest,
} from '@/middlewares/oauth.middleware';

const users: Router = Router();
const userController = new UserController();

// GET /users/me - returns authenticated user and token claims
users.get('/me', OAuthMiddleware.requireAuth(), async (req, res) => {
  const r = req as AuthenticatedRequest;
  return res.json({
    user: r.user, // App user record (populated by middleware)
  });
});

// GET /users/:id - get user by ID (public)
users.get('/:id', userController.getUserById);

// PUT /users/profile - update user profile (authenticated)
users.put(
  '/profile',
  OAuthMiddleware.requireAuth(),
  userController.updateProfile
);

// POST /users/verify-email - verify user email (authenticated)
users.post(
  '/verify-email',
  OAuthMiddleware.requireAuth(),
  userController.verifyEmail
);

// DELETE /users - delete user account (authenticated)
users.delete('/', OAuthMiddleware.requireAuth(), userController.deleteUser);

export default users;
