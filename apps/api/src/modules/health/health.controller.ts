import { type NextFunction, type Request } from 'express';
import { HttpStatusCode } from 'axios';
import HealthService from './health.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';

export default class HealthController extends Api {
  private readonly healthService = new HealthService();

  public getBasicHealth = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const health = await this.healthService.getBasicHealth();
      this.send(res, health, HttpStatusCode.Ok, 'Health check successful');
    } catch (e) {
      next(e);
    }
  };

  public getDetailedHealth = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const health = await this.healthService.getDetailedHealth();
      const statusCode =
        health.status === 'healthy'
          ? HttpStatusCode.Ok
          : HttpStatusCode.ServiceUnavailable;
      this.send(res, health, statusCode, 'Detailed health check completed');
    } catch (e) {
      next(e);
    }
  };
}
