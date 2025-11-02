import type { Prisma, QuizGameSession } from '@prisma/client';
import type { SubmitGameResultsDto } from './dto/submit-game-results.dto';
import prisma from '@/lib/prisma';
import {
  HttpBadRequestError,
  HttpNotFoundError,
  HttpUnAuthorizedError,
} from '@/lib/errors';
import logger from '@/lib/logger';

interface SubmitGameResultsResponse {
  success: boolean;
  message: string;
  game_id: string;
}

type QuizAnswerWithUser = Prisma.QuizAnswerGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

interface GameResultsResponse {
  session: QuizGameSession;
  answers: QuizAnswerWithUser[];
}

export default class GameService {
  /**
   * Submit game results from the socket service
   */
  public async submitGameResults(
    data: SubmitGameResultsDto
  ): Promise<SubmitGameResultsResponse> {
    try {
      // Verify room exists
      const room = await prisma.quizRoom.findUnique({
        where: { id: data.room_id },
      });

      if (!data.player_results.length || !data.answers.length) {
        const missingSections: string[] = [];
        if (!data.player_results.length) {
          missingSections.push(
            'player_results must include at least one player entry'
          );
        }
        if (!data.answers.length) {
          missingSections.push(
            'answers must include at least one answer entry'
          );
        }
        throw new HttpBadRequestError(
          'Game results payload must include player results and answers',
          missingSections
        );
      }

      if (!room) {
        throw new HttpNotFoundError('Room not found');
      }

      if (room.hostUserId !== data.host_id) {
        throw new HttpUnAuthorizedError(
          'Only the host can submit game results for this room'
        );
      }

      // Verify quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: data.quiz_id },
      });

      if (!quiz) {
        throw new HttpNotFoundError('Quiz not found');
      }

      // Use transaction to ensure all data is saved atomically
      const playerCount = data.player_results.length;
      const totalAnswerSubmissions = data.player_results.reduce(
        (sum, player) => sum + player.total_answers,
        0
      );
      const cumulativeScore = data.player_results.reduce(
        (sum, player) => sum + player.final_score,
        0
      );
      const completionRate =
        playerCount > 0
          ? totalAnswerSubmissions / (data.total_questions * playerCount)
          : 0;
      const averageScore = playerCount > 0 ? cumulativeScore / playerCount : 0;

      const result = await prisma.$transaction(async (tx) => {
        // Create game session record
        const session = await tx.quizGameSession.create({
          data: {
            roomId: data.room_id,
            quizId: data.quiz_id,
            hostId: data.host_id,
            startedAt: new Date(data.started_at),
            endedAt: new Date(data.ended_at),
            durationMs: BigInt(data.duration_ms),
            totalQuestions: data.total_questions,
            totalPlayers: playerCount,
            completionRate,
            averageScore,
          },
        });

        // Save all answers
        await Promise.all(
          data.answers.map(async (answer) => {
            await tx.quizAnswer.create({
              data: {
                roomId: data.room_id,
                userId: answer.user_id,
                questionIndex: answer.question_index,
                answer: answer.answer.trim(),
                isCorrect: answer.is_correct,
                answerTimeMs: BigInt(answer.response_time_ms),
                scoreDelta: answer.score_delta,
                createdAt: new Date(answer.answered_at),
              },
            });
          })
        );

        // Update room status
        await tx.quizRoom.update({
          where: { id: data.room_id },
          data: {
            status: 'ended',
            endedAt: new Date(data.ended_at),
          },
        });

        return session;
      });

      logger.info('Game results saved successfully', {
        roomId: data.room_id,
        quizId: data.quiz_id,
        sessionId: result.id,
      });

      return {
        success: true,
        message: 'Game results saved successfully',
        game_id: result.id,
      };
    } catch (error) {
      logger.error('Error submitting game results', {
        error,
        roomId: data.room_id,
        quizId: data.quiz_id,
      });
      throw error;
    }
  }

  /**
   * Get game session by room ID
   */
  public async getGameSession(roomId: string): Promise<QuizGameSession> {
    const session = await prisma.quizGameSession.findUnique({
      where: { roomId },
    });

    if (!session) {
      throw new HttpNotFoundError('Game session not found');
    }

    return session;
  }

  /**
   * Get game results with answers and player stats
   */
  public async getGameResults(roomId: string): Promise<GameResultsResponse> {
    const session = await prisma.quizGameSession.findUnique({
      where: { roomId },
    });

    if (!session) {
      throw new HttpNotFoundError('Game session not found');
    }

    const answers = await prisma.quizAnswer.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ questionIndex: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      session,
      answers,
    };
  }
}
