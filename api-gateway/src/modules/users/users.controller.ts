import { type NextFunction, type Request } from 'express';
import { HttpStatusCode } from 'axios';
import UserService from './users.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import { type AuthenticatedRequest } from '@/middlewares/auth';

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

  public getUser = async (req: AuthenticatedRequest, res: CustomResponse<any>, next: NextFunction) => {
    try {
      const user = req.user;
      this.send(res, user, HttpStatusCode.Ok, 'getUser');
    } catch (e) {
      next(e);
    }
  };
}
