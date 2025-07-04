const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const router = express.Router();

// TODO: Import auth middleware
// const { authenticateToken } = require('../middleware/auth');

// Generate quiz endpoint
router.post('/generate', [
  body('prompt').isLength({ min: 10 }).trim(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('numQuestions').optional().isInt({ min: 5, max: 50 }),
  body('timeLimit').optional().isInt({ min: 30, max: 300 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { prompt, difficulty = 'medium', numQuestions = 10, timeLimit = 60 } = req.body;
    
    // TODO: Forward request to quiz generator service
    // const quizGeneratorUrl = process.env.QUIZ_GENERATOR_URL || 'http://localhost:3001';
    // const response = await axios.post(`${quizGeneratorUrl}/generate`, {
    //   prompt, difficulty, numQuestions, timeLimit
    // });
    
    res.json({
      message: 'Quiz generation endpoint - TODO: Forward to quiz generator service',
      request: { prompt, difficulty, numQuestions, timeLimit }
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Quiz generation failed' });
  }
});

// Get quiz by ID
router.get('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // TODO: Fetch quiz from database/cache
    // 1. Check Redis cache first
    // 2. If not found, check database
    // 3. Return quiz data
    
    res.json({
      message: 'Get quiz endpoint - TODO: Implement quiz retrieval',
      quizId: quizId
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz' });
  }
});

// Get all quizzes for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: Fetch user's quizzes from database
    // 1. Query database for quizzes created by user
    // 2. Return paginated results
    
    res.json({
      message: 'Get user quizzes endpoint - TODO: Implement user quiz retrieval',
      userId: userId
    });
  } catch (error) {
    console.error('Get user quizzes error:', error);
    res.status(500).json({ error: 'Failed to retrieve user quizzes' });
  }
});

// Create quiz room (for real-time quiz)
router.post('/room', [
  body('quizId').isMongoId(),
  body('maxPlayers').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { quizId, maxPlayers = 50 } = req.body;
    
    // TODO: Create room in realtime service
    // const realtimeServiceUrl = process.env.REALTIME_SERVICE_URL || 'http://localhost:8080';
    // const response = await axios.post(`${realtimeServiceUrl}/room`, {
    //   quizId, maxPlayers
    // });
    
    res.json({
      message: 'Create quiz room endpoint - TODO: Forward to realtime service',
      request: { quizId, maxPlayers }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create quiz room' });
  }
});

// Get quiz results/leaderboard
router.get('/:quizId/results', async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // TODO: Fetch quiz results from database
    // 1. Get all player scores for the quiz
    // 2. Calculate leaderboard
    // 3. Return results
    
    res.json({
      message: 'Get quiz results endpoint - TODO: Implement results retrieval',
      quizId: quizId
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz results' });
  }
});

module.exports = router; 