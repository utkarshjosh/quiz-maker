import { Router } from 'express';
import GameController from './game.controller';
import { SubmitGameResultsDto } from './dto/submit-game-results.dto';
import RequestValidator from '@/middlewares/request-validator';

const router = Router();
const gameController = new GameController();

/**
 * POST /api/internal/game-results
 * @summary Submit game results from socket service (internal only)
 * @tags Game
 * @param {SubmitGameResultsDto} request.body.required - Game results data
 * @return {object} 201 - Results saved successfully
 * @return {object} 400 - Bad request
 */
router.post(
  '/game-results',
  RequestValidator.validate(SubmitGameResultsDto),
  gameController.submitGameResults
);

/**
 * GET /api/internal/game-session/:roomId
 * @summary Get game session by room ID
 * @tags Game
 * @param {string} roomId.path.required - Room ID
 * @return {object} 200 - Session retrieved successfully
 * @return {object} 404 - Session not found
 */
router.get('/game-session/:roomId', gameController.getGameSession);

/**
 * GET /api/internal/game-results/:roomId
 * @summary Get full game results with answers
 * @tags Game
 * @param {string} roomId.path.required - Room ID
 * @return {object} 200 - Results retrieved successfully
 * @return {object} 404 - Results not found
 */
router.get('/game-results/:roomId', gameController.getGameResults);

export default router;
