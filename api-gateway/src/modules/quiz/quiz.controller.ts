import { type NextFunction, type Request, type Response } from 'express';
import { HttpStatusCode } from 'axios';
import QuizService from './quiz.service';
import { type CustomResponse } from '@/types/common.type';
import { type AuthenticatedRequest } from '@/middlewares/auth';
import Api from '@/lib/api';

export default class QuizController extends Api {
  private readonly quizService = new QuizService();

  public generateQuiz = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      const quiz = await this.quizService.generateQuiz(userId, req.body);
      this.send(res, quiz, HttpStatusCode.Created, 'Quiz generated successfully');
    } catch (e) {
      next(e);
    }
  };

  public getQuiz = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { quizId } = req.params;
      const userId = req.user?.id;
      
      const quiz = await this.quizService.getQuizById(quizId, userId);
      this.send(res, quiz, HttpStatusCode.Ok, 'Quiz retrieved successfully');
    } catch (e) {
      next(e);
    }
  };

  public getUserQuizzes = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.quizService.getUserQuizzes(userId, page, limit);
      this.send(res, result, HttpStatusCode.Ok, 'Quizzes retrieved successfully');
    } catch (e) {
      next(e);
    }
  };

  public updateQuiz = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { quizId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      const quiz = await this.quizService.updateQuiz(quizId, userId, req.body);
      this.send(res, quiz, HttpStatusCode.Ok, 'Quiz updated successfully');
    } catch (e) {
      next(e);
    }
  };

  public deleteQuiz = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { quizId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      await this.quizService.deleteQuiz(quizId, userId);
      this.send(res, { message: 'Quiz deleted successfully' }, HttpStatusCode.Ok, 'Quiz deleted successfully');
    } catch (e) {
      next(e);
    }
  };

  public createQuizRoom = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      const { quizId, maxPlayers, title } = req.body;
      
      const room = await this.quizService.createQuizRoom(quizId, userId, maxPlayers, title);
      this.send(res, room, HttpStatusCode.Created, 'Quiz room created successfully');
    } catch (e) {
      next(e);
    }
  };

  public getQuizResults = async (
    req: AuthenticatedRequest,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { quizId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.send(res, { message: 'User not authenticated' }, HttpStatusCode.Unauthorized, 'User not authenticated');
      }

      const results = await this.quizService.getQuizResults(quizId, userId);
      this.send(res, results, HttpStatusCode.Ok, 'Quiz results retrieved successfully');
    } catch (e) {
      next(e);
    }
  };
} 