import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  HttpNotFoundError,
  HttpBadRequestError,
  HttpUnAuthorizedError,
} from '@/lib/errors';
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
      tags = [],
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
        timeLimit: Math.floor(timeLimit / numQuestions),
      })),
      metadata: {
        totalQuestions: numQuestions,
        difficulty,
        estimatedTime: timeLimit,
        topics: tags,
      },
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
        tags: {
          create: tags.map((tagId) => ({
            tagId,
          })),
        },
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
      },
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
          },
        },
      },
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

  public async getUserQuizzes(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
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
      }),
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
      },
    };
  }

  public async updateQuiz(
    quizId: string,
    userId: string,
    updates: Partial<CreateQuizRequest>
  ) {
    // Check if quiz exists and belongs to user
    const existingQuiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!existingQuiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.difficulty !== undefined)
      updateData.difficulty = updates.difficulty;
    if (updates.timeLimit !== undefined)
      updateData.timeLimit = updates.timeLimit;
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
      },
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

  public async createQuizRoom(
    quizId: string,
    userId: string,
    maxPlayers: number = 50,
    title?: string
  ) {
    // Check if quiz exists and belongs to user
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId },
    });

    if (!quiz) {
      throw new HttpNotFoundError('Quiz not found or access denied');
    }

    if (quiz.status !== 'published') {
      throw new HttpBadRequestError('Quiz must be published to create a room', [
        'Quiz is not published',
      ]);
    }

    // Generate unique session code
    const sessionCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const quizTitle: string = quiz.title;
    const hostingSession = await prisma.hostingSession.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        quizId,
        sessionCode,
        title: title ?? `${quizTitle} - Live Session`,
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
          },
        },
      },
    });

    logger.info('Quiz room created successfully', {
      sessionId: hostingSession.id,
      userId,
      quizId,
    });

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
                  },
                },
              },
            },
          },
        },
      },
    });

    return hostingSessions;
  }

  public async getTags(limit: number = 10) {
    const primaryTags = await prisma.tag.findMany({
      where: { isPrimary: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
        quizzes: {
          select: {
            quizId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return primaryTags.map((tag) => ({
      ...tag,
      quizCount: tag.quizzes.length,
      quizzes: undefined,
    }));
  }

  public async getSecondaryTags(primaryTagId: string) {
    // First verify the primary tag exists
    const primaryTag = await prisma.tag.findFirst({
      where: { id: primaryTagId, isPrimary: true },
    });

    if (!primaryTag) {
      throw new HttpNotFoundError('Primary tag not found');
    }

    // Get all quizzes with this primary tag
    const quizzes = await prisma.quiz.findMany({
      where: {
        tags: {
          some: {
            tagId: primaryTagId,
          },
        },
        status: 'published',
      },
      select: {
        id: true,
        title: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Group by secondary tags
    const secondaryTagsMap = new Map();

    quizzes.forEach((quiz) => {
      quiz.tags.forEach(({ tag }) => {
        if (!tag.isPrimary) {
          if (!secondaryTagsMap.has(tag.id)) {
            secondaryTagsMap.set(tag.id, {
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              icon: tag.icon,
              color: tag.color,
              description: tag.description,
              quizCount: 0,
              recentQuizzes: [],
            });
          }

          const tagData = secondaryTagsMap.get(tag.id);
          tagData.quizCount++;

          // Keep only 3 most recent quizzes
          if (tagData.recentQuizzes.length < 3) {
            tagData.recentQuizzes.push({
              id: quiz.id,
              title: quiz.title,
            });
          }
        }
      });
    });

    return Array.from(secondaryTagsMap.values()).sort(
      (a, b) => b.quizCount - a.quizCount
    );
  }

  public async getQuizzesByCategory(
    primaryTagId: string,
    secondaryTagId?: string,
    page: number = 1,
    limit: number = 10
  ) {
    // Verify the primary tag exists
    const primaryTag = await prisma.tag.findFirst({
      where: { id: primaryTagId, isPrimary: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    if (!primaryTag) {
      throw new HttpNotFoundError('Primary tag not found');
    }

    // Base query conditions for published quizzes with primary tag
    const baseWhere: Prisma.QuizWhereInput = {
      status: 'published',
      tags: {
        some: {
          tagId: primaryTagId,
        },
      },
    };

    // If secondary tag is provided, add it to the conditions
    if (secondaryTagId) {
      const secondaryTag = await prisma.tag.findFirst({
        where: { id: secondaryTagId, isPrimary: false },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          color: true,
          description: true,
        },
      });

      if (!secondaryTag) {
        throw new HttpNotFoundError('Secondary tag not found');
      }

      const skip = (page - 1) * limit;
      const where = {
        ...baseWhere,
        tags: {
          some: {
            tagId: {
              in: [primaryTagId, secondaryTagId],
            },
          },
        },
      };

      // Get quizzes for specific secondary tag
      const [quizzes, totalCount] = await Promise.all([
        prisma.quiz.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            totalQuestions: true,
            timeLimit: true,
            createdAt: true,
            user: {
              select: {
                username: true,
              },
            },
            _count: {
              select: {
                hostingSessions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.quiz.count({ where }),
      ]);

      return {
        primaryTag,
        groups: [
          {
            tag: secondaryTag,
            quizzes: quizzes.map((quiz) => ({
              ...quiz,
              playCount: quiz._count.hostingSessions,
              _count: undefined,
            })),
            totalQuizzes: totalCount,
          },
        ],
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      };
    } else {
      // Get all secondary tags and their quizzes
      const allQuizzes = await prisma.quiz.findMany({
        where: baseWhere,
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          totalQuestions: true,
          timeLimit: true,
          createdAt: true,
          user: {
            select: {
              username: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  icon: true,
                  color: true,
                  description: true,
                  isPrimary: true,
                },
              },
            },
          },
          _count: {
            select: {
              hostingSessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group quizzes by secondary tags
      const groupedQuizzes = new Map<
        string,
        {
          tag: any;
          quizzes: any[];
          totalQuizzes: number;
        }
      >();

      allQuizzes.forEach((quiz) => {
        const secondaryTags = quiz.tags.filter(({ tag }) => !tag.isPrimary);

        secondaryTags.forEach(({ tag }) => {
          if (!groupedQuizzes.has(tag.id)) {
            groupedQuizzes.set(tag.id, {
              tag: {
                id: tag.id,
                name: tag.name,
                slug: tag.slug,
                icon: tag.icon,
                color: tag.color,
                description: tag.description,
              },
              quizzes: [],
              totalQuizzes: 0,
            });
          }

          const group = groupedQuizzes.get(tag.id) as any;

          // Only add quiz if within pagination range for this group
          if (group.quizzes.length < limit) {
            group.quizzes.push({
              ...quiz,
              tags: undefined,
              playCount: quiz._count.hostingSessions,
              _count: undefined,
            });
          }
          group.totalQuizzes++;
        });
      });

      // Convert map to array and sort by quiz count
      const groups = Array.from(groupedQuizzes.values()).sort(
        (a, b) => b.totalQuizzes - a.totalQuizzes
      );

      return {
        primaryTag,
        groups,
        pagination: {
          page,
          limit,
          totalGroups: groups.length,
          totalQuizzes: allQuizzes.length,
        },
      };
    }
  }

  public async getQuizzesByTags(
    primaryTagId?: string,
    secondaryTagIds?: string[],
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    // Base query conditions
    const where: Prisma.QuizWhereInput = {
      status: 'published',
    };

    // Add tag conditions if provided
    if (primaryTagId ?? (secondaryTagIds && secondaryTagIds.length > 0)) {
      where.tags = {
        some: {},
      };

      if (primaryTagId) {
        where.tags.some = {
          tag: {
            id: primaryTagId,
            isPrimary: true,
          },
        };
      }

      if (secondaryTagIds && secondaryTagIds.length > 0) {
        where.tags.some = {
          tag: {
            id: { in: secondaryTagIds },
            isPrimary: false,
          },
        };
      }
    }

    const [quizzes, totalCount] = await Promise.all([
      prisma.quiz.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
          user: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quiz.count({ where }),
    ]);

    // If primary tag is provided, group by secondary tags
    let groupedQuizzes = quizzes;
    if (primaryTagId) {
      const grouped: any = {
        recentlyAdded: quizzes.slice(0, 3),
        mostPlayed: [], // TODO: Implement this based on hosting sessions count
        bySecondaryTags: {},
      };

      // Group by secondary tags
      quizzes.forEach((quiz) => {
        quiz.tags.forEach(({ tag }) => {
          if (!tag.isPrimary) {
            if (!grouped.bySecondaryTags[tag.id]) {
              grouped.bySecondaryTags[tag.id] = {
                tag: {
                  id: tag.id,
                  name: tag.name,
                  slug: tag.slug,
                  icon: tag.icon,
                  color: tag.color,
                },
                quizzes: [],
              };
            }
            grouped.bySecondaryTags[tag.id].quizzes.push(quiz);
          }
        });
      });

      // Get most played quizzes
      const mostPlayedQuizIds = await prisma.hostingSession.groupBy({
        by: ['quizId'],
        _count: true,
        orderBy: {
          _count: {
            quizId: 'desc',
          },
        },
        take: 3,
        where: {
          quiz: {
            tags: {
              some: {
                tagId: primaryTagId,
              },
            },
          },
        },
      });

      if (mostPlayedQuizIds.length > 0) {
        const mostPlayedQuizzes = await prisma.quiz.findMany({
          where: {
            id: {
              in: mostPlayedQuizIds.map((mp) => mp.quizId),
            },
          },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            user: {
              select: {
                username: true,
              },
            },
          },
        });
        grouped.mostPlayed = mostPlayedQuizzes;
      }

      groupedQuizzes = grouped;
    }

    return {
      quizzes: groupedQuizzes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }
}
