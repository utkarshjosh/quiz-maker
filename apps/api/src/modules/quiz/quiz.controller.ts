import { type NextFunction, type Request } from 'express';
import { HttpStatusCode } from 'axios';
import QuizService from './quiz.service';
import { type CustomResponse } from '@/types/common.type';
import { type AuthenticatedRequest } from '@/middlewares/oauth.middleware';
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
        return this.send(
          res,
          { message: 'User not authenticated' },
          HttpStatusCode.Unauthorized,
          'User not authenticated'
        );
      }

      const quiz = await this.quizService.generateQuiz(userId, req.body);
      this.send(
        res,
        quiz,
        HttpStatusCode.Created,
        'Quiz generated successfully'
      );
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
        return this.send(
          res,
          { message: 'User not authenticated' },
          HttpStatusCode.Unauthorized,
          'User not authenticated'
        );
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.quizService.getUserQuizzes(userId, page, limit);
      this.send(
        res,
        result,
        HttpStatusCode.Ok,
        'Quizzes retrieved successfully'
      );
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
        return this.send(
          res,
          { message: 'User not authenticated' },
          HttpStatusCode.Unauthorized,
          'User not authenticated'
        );
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
        return this.send(
          res,
          { message: 'User not authenticated' },
          HttpStatusCode.Unauthorized,
          'User not authenticated'
        );
      }

      await this.quizService.deleteQuiz(quizId, userId);
      this.send(
        res,
        { message: 'Quiz deleted successfully' },
        HttpStatusCode.Ok,
        'Quiz deleted successfully'
      );
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
        return this.send(
          res,
          { message: 'User not authenticated' },
          HttpStatusCode.Unauthorized,
          'User not authenticated'
        );
      }

      const results = await this.quizService.getQuizResults(quizId, userId);
      this.send(
        res,
        results,
        HttpStatusCode.Ok,
        'Quiz results retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  public getTags = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { limit = 10 } = req.query;
      const tags = await this.quizService.getTags(parseInt(limit as string));
      this.send(
        res,
        tags,
        HttpStatusCode.Ok,
        'Primary tags retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  public getSecondaryTags = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { primaryTag } = req.params;
      console.log(primaryTag);
      if (!primaryTag) {
        return this.send(
          res,
          { message: 'Primary tag ID is required' },
          HttpStatusCode.BadRequest,
          'Primary tag ID is required'
        );
      }

      const tags = await this.quizService.getSecondaryTags(primaryTag);
      this.send(
        res,
        tags,
        HttpStatusCode.Ok,
        'Secondary tags retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  public getQuizzesByCategory = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { primaryTag } = req.params;
      const { secondaryTag } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const quizLimit = parseInt(req.query.limit as string) || 5;
      const groupLimit = parseInt(req.query.groupLimit as string) || 5;
      const quizzes = await this.quizService.getQuizzesByCategory(
        primaryTag,
        secondaryTag as string | undefined,
        page,
        quizLimit,
        groupLimit
      );

      this.send(
        res,
        quizzes,
        HttpStatusCode.Ok,
        'Quizzes retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  public getQuizzesByTags = async (
    req: Request,
    res: CustomResponse<any>,
    next: NextFunction
  ) => {
    try {
      const { primaryTagId, secondaryTagIds } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const parsedSecondaryTagIds = secondaryTagIds
        ? Array.isArray(secondaryTagIds)
          ? secondaryTagIds
          : [secondaryTagIds]
        : undefined;

      const quizzes = await this.quizService.getQuizzesByTags(
        primaryTagId as string | undefined,
        parsedSecondaryTagIds as string[] | undefined,
        page,
        limit
      );

      this.send(
        res,
        quizzes,
        HttpStatusCode.Ok,
        'Quizzes retrieved successfully'
      );
    } catch (e) {
      next(e);
    }
  };
}
