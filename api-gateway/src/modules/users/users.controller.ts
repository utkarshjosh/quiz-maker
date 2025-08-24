import { type NextFunction, type Request } from 'express';
import { HttpStatusCode } from 'axios';
import UserService from './users.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import { type AuthenticatedRequest } from '@/middlewares/oauth.middleware';

export default class UserController extends Api {
  private readonly userService = new UserService();

  public createUser = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const user = await this.userService.createUser(req.body);
      this.send(res, user, HttpStatusCode.Created, 'createUser');
    } catch (e) {
      next(e);
    }
  };

  public getUser = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const user = req.user;
      this.send(res, user, HttpStatusCode.Ok, 'getUser');
    } catch (e) {
      next(e);
    }
  };

  public updateProfile = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(
          res,
          null,
          HttpStatusCode.Unauthorized,
          'updateProfile',
          'User not authenticated'
        );
      }

      const updateData = req.body;
      const user = await this.userService.updateUser(userId, updateData);
      this.send(res, user, HttpStatusCode.Ok, 'updateProfile');
    } catch (e) {
      next(e);
    }
  };

  public verifyEmail = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(
          res,
          null,
          HttpStatusCode.Unauthorized,
          'verifyEmail',
          'User not authenticated'
        );
      }

      const user = await this.userService.verifyUserEmail(userId);
      this.send(res, user, HttpStatusCode.Ok, 'verifyEmail');
    } catch (e) {
      next(e);
    }
  };

  public getUserById = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUser(id);

      if (!user) {
        return this.send(
          res,
          null,
          HttpStatusCode.NotFound,
          'getUserById',
          'User not found'
        );
      }

      this.send(res, user, HttpStatusCode.Ok, 'getUserById');
    } catch (e) {
      next(e);
    }
  };

  public deleteUser = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(
          res,
          null,
          HttpStatusCode.Unauthorized,
          'deleteUser',
          'User not authenticated'
        );
      }

      await this.userService.deleteUser(userId);
      this.send(
        res,
        { message: 'User deleted successfully' },
        HttpStatusCode.Ok,
        'deleteUser'
      );
    } catch (e) {
      next(e);
    }
  };
}
