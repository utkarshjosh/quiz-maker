import { type NextFunction, type Request } from 'express';
import { HttpStatusCode } from 'axios';
import GameService from './game.service';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';

export default class GameController extends Api {
  private readonly gameService = new GameService();

  /**
   * Internal endpoint to receive game results from socket service
   * This endpoint is called by the Go socket service when a game ends
   */
  public submitGameResults = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      // TODO: Add internal service authentication check
      // For now, this endpoint should only be accessible from internal network
      
      const result = await this.gameService.submitGameResults(req.body);
      
      this.send(
        res,
        result,
        HttpStatusCode.Created,
        'Game results saved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  /**
   * Get game session by room ID
   */
  public getGameSession = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { roomId } = req.params;
      const session = await this.gameService.getGameSession(roomId);
      
      this.send(
        res,
        session,
        HttpStatusCode.Ok,
        'Game session retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  /**
   * Get full game results with answers
   */
  public getGameResults = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { roomId } = req.params;
      const results = await this.gameService.getGameResults(roomId);
      
      this.send(
        res,
        results,
        HttpStatusCode.Ok,
        'Game results retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };
}


