import { type NextFunction, type Request, type Response } from 'express';
import { HttpStatusCode } from 'axios';
import AuthService from './auth.service';
import { type CustomResponse } from '@/types/common.type';
import { type AuthenticatedRequest } from '@/middlewares/auth';
import Api from '@/lib/api';

export default class AuthController extends Api {
  private readonly authService = new AuthService();

  public register = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { email, username, password } = req.body;
      const result = await this.authService.register(email, username, password);
      this.send(res, result, HttpStatusCode.Created, 'User registered successfully');
    } catch (e) {
      next(e);
    }
  };

  public login = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      this.send(res, result, HttpStatusCode.Ok, 'Login successful');
    } catch (e) {
      next(e);
    }
  };

  public refreshToken = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshToken(refreshToken);
      this.send(res, tokens, HttpStatusCode.Ok, 'Token refreshed successfully');
    } catch (e) {
      next(e);
    }
  };

  public logout = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const sessionId = req.session?.id;
      if (!sessionId) {
        return this.send(res, { message: 'No active session' }, HttpStatusCode.BadRequest, 'No active session');
      }
      
      await this.authService.logout(sessionId);
      this.send(res, { message: 'Logged out successfully' }, HttpStatusCode.Ok, 'Logout successful');
    } catch (e) {
      next(e);
    }
  };

  public getProfile = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }
      
      const profile = await this.authService.getProfile(userId);
      this.send(res, profile, HttpStatusCode.Ok, 'Profile retrieved successfully');
    } catch (e) {
      next(e);
    }
  };
} 