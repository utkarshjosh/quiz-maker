import { Router } from 'express';
import QuizController from './quiz.controller';
import { CreateQuizDto, CreateQuizRoomDto, UpdateQuizDto } from '@/dto/quiz.dto';
import RequestValidator from '@/middlewares/request-validator';
import { verifyAuthToken, optionalAuth } from '@/middlewares/auth';

const quiz: Router = Router();
const controller = new QuizController();

/**
 * Generate quiz body
 * @typedef {object} GenerateQuizBody
 * @property {string} message.required - Quiz generation prompt
 * @property {string} difficulty - Quiz difficulty (easy, medium, hard)
 * @property {number} numQuestions - Number of questions
 * @property {number} timeLimit - Time limit in seconds
 * @property {string} title - Quiz title
 * @property {string} description - Quiz description
 * @property {array<string>} tags - Quiz tags
 */
/**
 * Create quiz room body
 * @typedef {object} CreateQuizRoomBody
 * @property {string} quizId.required - Quiz ID
 * @property {number} maxPlayers - Maximum number of players
 * @property {string} title - Room title
 */
/**
 * Quiz response
 * @typedef {object} QuizResponse
 * @property {string} id - Quiz ID
 * @property {string} title - Quiz title
 * @property {string} description - Quiz description
 * @property {string} difficulty - Quiz difficulty
 * @property {number} timeLimit - Time limit in seconds
 * @property {number} totalQuestions - Total number of questions
 * @property {string} status - Quiz status
 * @property {array<string>} tags - Quiz tags
 * @property {string} createdAt - Creation date
 * @property {string} updatedAt - Update date
 */
/**
 * Quiz room response
 * @typedef {object} QuizRoomResponse
 * @property {string} id - Room ID
 * @property {string} sessionCode - Session code
 * @property {string} title - Room title
 * @property {number} maxParticipants - Maximum participants
 * @property {string} status - Room status
 * @property {string} createdAt - Creation date
 * @property {object} quiz - Quiz details
 */

/**
 * POST /quiz/generate
 * @summary Generate a new quiz
 * @tags Quiz
 * @security BearerAuth
 * @param {GenerateQuizBody} request.body.required - Quiz generation data
 * @return {QuizResponse} 201 - Quiz generated successfully
 * @return {object} 400 - Bad request
 * @return {object} 401 - Unauthorized
 */
quiz.post(
  '/generate',
  verifyAuthToken,
  RequestValidator.validate(CreateQuizDto),
  controller.generateQuiz
);

/**
 * GET /quiz/{quizId}
 * @summary Get quiz by ID
 * @tags Quiz
 * @security BearerAuth
 * @param {string} quizId.path.required - Quiz ID
 * @return {QuizResponse} 200 - Quiz retrieved successfully
 * @return {object} 404 - Quiz not found
 * @return {object} 401 - Unauthorized
 */
quiz.get(
  '/:quizId',
  optionalAuth,
  controller.getQuiz
);

/**
 * GET /quiz/user/my-quizzes
 * @summary Get user's quizzes
 * @tags Quiz
 * @security BearerAuth
 * @param {number} page.query - Page number
 * @param {number} limit.query - Items per page
 * @return {object} 200 - Quizzes retrieved successfully
 * @return {object} 401 - Unauthorized
 */
quiz.get(
  '/user/my-quizzes',
  verifyAuthToken,
  controller.getUserQuizzes
);

/**
 * PUT /quiz/{quizId}
 * @summary Update quiz
 * @tags Quiz
 * @security BearerAuth
 * @param {string} quizId.path.required - Quiz ID
 * @param {UpdateQuizDto} request.body.required - Quiz update data
 * @return {QuizResponse} 200 - Quiz updated successfully
 * @return {object} 404 - Quiz not found
 * @return {object} 401 - Unauthorized
 */
quiz.put(
  '/:quizId',
  verifyAuthToken,
  RequestValidator.validate(UpdateQuizDto),
  controller.updateQuiz
);

/**
 * DELETE /quiz/{quizId}
 * @summary Delete quiz
 * @tags Quiz
 * @security BearerAuth
 * @param {string} quizId.path.required - Quiz ID
 * @return {object} 200 - Quiz deleted successfully
 * @return {object} 404 - Quiz not found
 * @return {object} 401 - Unauthorized
 */
quiz.delete(
  '/:quizId',
  verifyAuthToken,
  controller.deleteQuiz
);

/**
 * POST /quiz/room
 * @summary Create quiz room
 * @tags Quiz
 * @security BearerAuth
 * @param {CreateQuizRoomBody} request.body.required - Room creation data
 * @return {QuizRoomResponse} 201 - Room created successfully
 * @return {object} 400 - Bad request
 * @return {object} 401 - Unauthorized
 */
quiz.post(
  '/room',
  verifyAuthToken,
  RequestValidator.validate(CreateQuizRoomDto),
  controller.createQuizRoom
);

/**
 * GET /quiz/{quizId}/results
 * @summary Get quiz results
 * @tags Quiz
 * @security BearerAuth
 * @param {string} quizId.path.required - Quiz ID
 * @return {object} 200 - Results retrieved successfully
 * @return {object} 404 - Quiz not found
 * @return {object} 401 - Unauthorized
 */
quiz.get(
  '/:quizId/results',
  verifyAuthToken,
  controller.getQuizResults
);

export default quiz; 