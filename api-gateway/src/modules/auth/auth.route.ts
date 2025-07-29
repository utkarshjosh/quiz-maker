import { Router } from 'express';
import AuthController from './auth.controller';
import { LoginDto, RegisterDto, RefreshTokenDto } from '@/dto/auth.dto';
import RequestValidator from '@/middlewares/request-validator';
import { verifyAuthToken } from '@/middlewares/auth';

const auth: Router = Router();
const controller = new AuthController();

/**
 * Register body
 * @typedef {object} RegisterBody
 * @property {string} email.required - User email
 * @property {string} username.required - User username
 * @property {string} password.required - User password
 */
/**
 * Login body
 * @typedef {object} LoginBody
 * @property {string} email.required - User email
 * @property {string} password.required - User password
 */
/**
 * Refresh token body
 * @typedef {object} RefreshTokenBody
 * @property {string} refreshToken.required - Refresh token
 */
/**
 * Auth response
 * @typedef {object} AuthResponse
 * @property {object} user - User data
 * @property {string} user.id - User ID
 * @property {string} user.email - User email
 * @property {string} user.username - User username
 * @property {boolean} user.emailVerified - Email verification status
 * @property {object} tokens - Authentication tokens
 * @property {string} tokens.accessToken - Access token
 * @property {string} tokens.refreshToken - Refresh token
 */
/**
 * Profile response
 * @typedef {object} ProfileResponse
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} username - User username
 * @property {boolean} emailVerified - Email verification status
 * @property {string} createdAt - User creation date
 * @property {string} updatedAt - User update date
 * @property {string} lastLogin - User last login date
 */

/**
 * POST /auth/register
 * @summary Register a new user
 * @tags Authentication
 * @param {RegisterBody} request.body.required - User registration data
 * @return {AuthResponse} 201 - User registered successfully
 * @return {object} 400 - Bad request
 * @return {object} 409 - User already exists
 */
auth.post(
  '/register',
  RequestValidator.validate(RegisterDto),
  controller.register
);

/**
 * POST /auth/login
 * @summary Login user
 * @tags Authentication
 * @param {LoginBody} request.body.required - User login credentials
 * @return {AuthResponse} 200 - Login successful
 * @return {object} 401 - Invalid credentials
 */
auth.post('/login', RequestValidator.validate(LoginDto), controller.login);

/**
 * POST /auth/refresh
 * @summary Refresh access token
 * @tags Authentication
 * @param {RefreshTokenBody} request.body.required - Refresh token
 * @return {object} 200 - Token refreshed successfully
 * @return {object} 401 - Invalid refresh token
 */
auth.post(
  '/refresh',
  RequestValidator.validate(RefreshTokenDto),
  controller.refreshToken
);

/**
 * POST /auth/logout
 * @summary Logout user
 * @tags Authentication
 * @security BearerAuth
 * @return {object} 200 - Logout successful
 * @return {object} 401 - Unauthorized
 */
auth.post('/logout', verifyAuthToken, controller.logout);

/**
 * GET /auth/profile
 * @summary Get user profile
 * @tags Authentication
 * @security BearerAuth
 * @return {ProfileResponse} 200 - Profile retrieved successfully
 * @return {object} 401 - Unauthorized
 */
auth.get('/profile', verifyAuthToken, controller.getProfile);

export default auth;
