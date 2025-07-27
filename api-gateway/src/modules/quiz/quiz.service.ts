import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { HttpNotFoundError, HttpBadRequestError, HttpUnAuthorizedError } from '@/lib/errors';
import logger from '@/lib/logger';

export interface QuizData {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
  }>;
  metadata: {
    totalQuestions: number;
    difficulty: string;
    estimatedTime: number;
    topics: string[];
  };
}

export interface CreateQuizRequest {
  message: string;
  difficulty?: string;
  numQuestions?: number;
  timeLimit?: number;
  title?: string;
  description?: string;
  tags?: string[];
}

export default class QuizService {
  public async generateQuiz(userId: string, data: CreateQuizRequest) {
    // TODO: This should integrate with the quiz generator service
    // For now, we'll create a placeholder quiz
    const {
      message,
      difficulty = 'medium',
      numQuestions = 10,
      timeLimit = 1800, // 30 minutes
      title = 'Generated Quiz',
      description = 'Quiz generated from prompt',
      tags = []
    } = data;

    // Mock quiz data - in production, this would come from the AI service
    const quizData: QuizData = {
      questions: Array.from({ length: numQuestions }, (_, i) => ({
        id: crypto.randomUUID(),
        question: `Sample question ${i + 1} based on: ${message.substring(0, 50)}...`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
        explanation: `This is the explanation for question ${i + 1}`,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        timeLimit: Math.floor(timeLimit / numQuestions)
      })),
      metadata: {
        totalQuestions: numQuestions,
        difficulty,
        estimatedTime: timeLimit,
        topics: tags
      }
    };

    // Create quiz in database
    const quiz = await prisma.quiz.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        title,
        description,
        difficulty,
        timeLimit,
        totalQuestions: numQuestions,
        quizData: quizData as any,
        status: 'draft',
        tags,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        difficulty: true,
        timeLimit: true,
        totalQuestions: true,
        status: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    logger.info('Quiz generated successfully', { quizId: quiz.id, userId });

    return quiz;
  }

  public async getQuizById(quizId: string, userId?: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    if (!quiz) {
      throw new HttpNotFoundError('Quiz not found');
    }

    // Check if user has access to this quiz
    if (quiz.status === 'draft' && quiz.userId !== userId) {
      throw new HttpUnAuthorizedError('Access denied to this quiz');
    }

    return quiz;
  }

  public async getUserQuizzes(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [quizzes, totalCount] = await Promise.all([
      prisma.quiz.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          timeLimit: true,
          totalQuestions: true,
          status: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quiz.count({
        where: { userId },
      })
    ]);

    return {
      quizzes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      }
    };
  }

  public async updateQuiz(quizId: string, userId: string, updates: Partial<CreateQuizRequest>) {
    // Check if quiz exists and belongs to user
    const existingQuiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!existingQuiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
    if (updates.timeLimit !== undefined) updateData.timeLimit = updates.timeLimit;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        difficulty: true,
        timeLimit: true,
        totalQuestions: true,
        status: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    logger.info('Quiz updated successfully', { quizId, userId });

    return updatedQuiz;
  }

  public async deleteQuiz(quizId: string, userId: string) {
    // Check if quiz exists and belongs to user
    const existingQuiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!existingQuiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    logger.info('Quiz deleted successfully', { quizId, userId });
  }

  public async createQuizRoom(quizId: string, userId: string, maxPlayers: number = 50, title?: string) {
    // Check if quiz exists and belongs to user
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    if (quiz.status !== 'published') {
      throw new HttpBadRequestError('Quiz must be published to create a room', ['Quiz is not published']);
    }

    // Generate unique session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const hostingSession = await prisma.hostingSession.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        quizId,
        sessionCode,
        title: title || `${quiz.title} - Live Session`,
        maxParticipants: maxPlayers,
        status: 'created',
      },
      select: {
        id: true,
        sessionCode: true,
        title: true,
        maxParticipants: true,
        status: true,
        createdAt: true,
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
            timeLimit: true,
          }
        }
      }
    });

    logger.info('Quiz room created successfully', { sessionId: hostingSession.id, userId, quizId });

    return hostingSession;
  }

  public async getQuizResults(quizId: string, userId: string) {
    // Check if quiz exists and belongs to user
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    // Get hosting sessions for this quiz
    const hostingSessions = await prisma.hostingSession.findMany({
      where: { quizId },
      include: {
        results: {
          include: {
            participant: {
              select: {
                nickname: true,
                user: {
                  select: {
                    username: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    return hostingSessions;
  }
} 