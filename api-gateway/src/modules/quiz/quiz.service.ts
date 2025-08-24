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
        imageUrl: true,
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
          imageUrl: true,
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

  public async getSecondaryTags(primaryTag: string) {
    // First verify the primary tag exists
    const tagSlug = primaryTag.toLowerCase();
    const primaryTagData = await prisma.tag.findFirst({
      where: { slug: tagSlug, isPrimary: true },
    });

    if (!primaryTagData) {
      throw new HttpNotFoundError('Primary tag not found');
    }

    // Get all quizzes with this primary tag
    const quizzes = await prisma.quiz.findMany({
      where: {
        tags: {
          some: {
            tagId: primaryTagData.id,
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

    // Sort by quiz count and limit to top 20 most commonly used tags
    return Array.from(secondaryTagsMap.values())
      .sort((a, b) => b.quizCount - a.quizCount)
      .slice(0, 20);
  }

  public async getQuizzesByCategory(
    primaryTag?: string,
    secondaryTag?: string,
    page: number = 1,
    quizLimit: number = 10,
    groupLimit: number = 10
  ) {
    // If primary tag is not provided, return quizzes grouped by top primary tags
    if (!primaryTag) {
      return this.getQuizzesByTopPrimaryTags(page, quizLimit, groupLimit);
    }

    // Verify the primary tag exists
    const primaryTagData = await this.validateAndGetPrimaryTag(primaryTag);

    // If secondary tag is provided, return paginated quizzes for that specific combination
    if (secondaryTag) {
      return this.getQuizzesByPrimaryAndSecondaryTag(
        primaryTagData,
        secondaryTag,
        page,
        quizLimit
      );
    }

    // If no secondary tag, group by secondary tags of the primary tag
    return this.getQuizzesGroupedBySecondaryTags(
      primaryTagData,
      primaryTag,
      page,
      quizLimit,
      groupLimit
    );
  }

  private async getQuizzesByTopPrimaryTags(
    page: number,
    quizLimit: number,
    groupLimit: number
  ) {
    // Calculate pagination for groups (tags)
    const skip = (page - 1) * groupLimit;
    
    // First get total count of primary tags for pagination info
    const totalPrimaryTags = await prisma.tag.count({
      where: { isPrimary: true },
    });
    
    // Fetch primary tags with pagination based on groupLimit
    const topPrimaryTags = await prisma.tag.findMany({
      where: { isPrimary: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
      orderBy: {
        quizzes: {
          _count: 'desc',
        },
      },
      skip, // Apply pagination skip
      take: groupLimit, // Apply group limit here
    });

    const groups = await Promise.all(
      topPrimaryTags.map(async (tag) => {
        const tagWhere: Prisma.QuizWhereInput = {
          status: 'published',
          tags: {
            some: {
              tagId: tag.id,
            },
          },
        };

        const [quizzes, totalCount] = await Promise.all([
          this.getQuizzesForTag(tagWhere, quizLimit),
          prisma.quiz.count({ where: tagWhere }),
        ]);

        return {
          tag: {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            icon: tag.icon,
            color: tag.color,
            description: tag.description,
          },
          quizzes: this.formatQuizzesWithPlayCount(quizzes),
          totalQuizzes: totalCount,
        };
      })
    );

    return {
      primaryTag: undefined,
      groups,
      pagination: {
        page,
        limit: groupLimit, // Use groupLimit instead of quizLimit for pagination
        totalGroups: totalPrimaryTags, // Total available groups
        totalPages: Math.ceil(totalPrimaryTags / groupLimit),
        hasNext: page < Math.ceil(totalPrimaryTags / groupLimit),
        hasPrev: page > 1,
        totalQuizzes: groups.reduce((acc, g) => acc + g.totalQuizzes, 0),
      },
    };
  }

  private async validateAndGetPrimaryTag(primaryTag: string) {
    const primaryTagData = await prisma.tag.findFirst({
      where: { slug: primaryTag.toLowerCase(), isPrimary: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    if (!primaryTagData) {
      throw new HttpNotFoundError('Primary tag not found');
    }

    return primaryTagData;
  }

  private async getQuizzesByPrimaryAndSecondaryTag(
    primaryTagData: any,
    secondaryTag: string,
    page: number,
    quizLimit: number
  ) {
    const secondaryTagData = await prisma.tag.findFirst({
      where: { slug: secondaryTag.toLowerCase(), isPrimary: false },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
      },
    });

    if (!secondaryTagData) {
      throw new HttpNotFoundError('Secondary tag not found');
    }

    const skip = (page - 1) * quizLimit;
    const where: Prisma.QuizWhereInput = {
      status: 'published',
      AND: [
        { tags: { some: { tagId: primaryTagData.id } } },
        { tags: { some: { tagId: secondaryTagData.id } } },
      ],
    };

    // Get quizzes for specific secondary tag
    const [quizzes, totalCount] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: this.getQuizSelectFields(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: quizLimit,
      }),
      prisma.quiz.count({ where }),
    ]);

    return {
      primaryTag: primaryTagData.slug,
      groups: [
        {
          tag: secondaryTagData,
          quizzes: this.formatQuizzesWithPlayCount(quizzes),
          totalQuizzes: totalCount,
        },
      ],
      pagination: {
        page,
        limit: quizLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / quizLimit),
        hasNext: page < Math.ceil(totalCount / quizLimit),
        hasPrev: page > 1,
      },
    };
  }

  private async getQuizzesGroupedBySecondaryTags(
    primaryTagData: any,
    primaryTag: string,
    page: number,
    quizLimit: number,
    groupLimit: number
  ) {
    // First, get all secondary tags associated with the primary tag, ordered by quiz count
    const secondaryTagsWithCounts = await prisma.tag.findMany({
      where: {
        isPrimary: false,
        quizzes: {
          some: {
            quiz: {
              status: 'published',
              tags: {
                some: {
                  tagId: primaryTagData.id,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
        description: true,
        _count: {
          select: {
            quizzes: {
              where: {
                quiz: {
                  status: 'published',
                  tags: {
                    some: {
                      tagId: primaryTagData.id,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        quizzes: {
          _count: 'desc',
        },
      },
    });

    // Calculate pagination for groups (secondary tags)
    const skip = (page - 1) * groupLimit;
    const totalSecondaryTags = secondaryTagsWithCounts.length;
    
    // Apply pagination to secondary tags
    const paginatedSecondaryTags = secondaryTagsWithCounts.slice(skip, skip + groupLimit);

    // Now fetch quizzes for each paginated secondary tag
    const groups = await Promise.all(
      paginatedSecondaryTags.map(async (tag) => {
        const baseWhere: Prisma.QuizWhereInput = {
          status: 'published',
          tags: {
            some: {
              tagId: primaryTagData.id,
            },
          },
          AND: {
            tags: {
              some: {
                tagId: tag.id,
              },
            },
          },
        };

        const [quizzes, totalCount] = await Promise.all([
          this.getQuizzesForTag(baseWhere, quizLimit),
          prisma.quiz.count({ where: baseWhere }),
        ]);

        return {
          tag: {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            icon: tag.icon,
            color: tag.color,
            description: tag.description,
          },
          quizzes: this.formatQuizzesWithPlayCount(quizzes),
          totalQuizzes: totalCount,
        };
      })
    );

    return {
      primaryTag,
      groups,
      pagination: {
        page,
        limit: groupLimit, // Use groupLimit for pagination
        totalGroups: totalSecondaryTags, // Total available secondary tag groups
        totalPages: Math.ceil(totalSecondaryTags / groupLimit),
        hasNext: page < Math.ceil(totalSecondaryTags / groupLimit),
        hasPrev: page > 1,
        totalQuizzes: groups.reduce((acc, g) => acc + g.totalQuizzes, 0),
      },
    };
  }

  private groupQuizzesBySecondaryTags(allQuizzes: any[], quizLimit: number) {
    const groupedQuizzes = new Map<
      string,
      {
        tag: any;
        quizzes: any[];
        totalQuizzes: number;
      }
    >();

    allQuizzes.forEach((quiz) => {
      const secondaryTags = quiz.tags.filter(({ tag }: any) => !tag.isPrimary);

      secondaryTags.forEach(({ tag }: any) => {
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
        if (group.quizzes.length < quizLimit) {
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

    return groupedQuizzes;
  }

  private getQuizSelectFields() {
    return {
      id: true,
      title: true,
      imageUrl: true,
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
    };
  }

  private async getQuizzesForTag(where: Prisma.QuizWhereInput, limit: number) {
    return prisma.quiz.findMany({
      where,
      select: this.getQuizSelectFields(),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private formatQuizzesWithPlayCount(quizzes: any[]) {
    return quizzes.map((quiz) => ({
      ...quiz,
      playCount: quiz._count.hostingSessions,
      _count: undefined,
    }));
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
