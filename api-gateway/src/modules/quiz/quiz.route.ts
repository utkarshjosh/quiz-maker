import { Router } from 'express';
import QuizController from './quiz.controller';
import OAuthMiddleware from '@/middlewares/oauth.middleware';
import RequestValidator from '@/middlewares/request-validator';
import { CreateQuizDto, UpdateQuizDto } from '@/dto/quiz.dto';

const router = Router();
const quizController = new QuizController();

// Public routes
router.get('/tags', quizController.getTags);
router.get('/tags/:primaryTag/secondary', quizController.getSecondaryTags);
router.get('/category/:primaryTag?', quizController.getQuizzesByCategory);
router.get('/by-tags', quizController.getQuizzesByTags);

// Protected routes - require authentication
router.use(OAuthMiddleware.requireAuth());

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
router.post(
  '/generate',
  RequestValidator.validate(CreateQuizDto),
  quizController.generateQuiz
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
router.get('/:quizId', quizController.getQuiz);

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
router.get('/user/my-quizzes', quizController.getUserQuizzes);

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
router.put(
  '/:quizId',
  RequestValidator.validate(UpdateQuizDto),
  quizController.updateQuiz
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
router.delete('/:quizId', quizController.deleteQuiz);

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
router.get('/:quizId/results', quizController.getQuizResults);

export default router;
