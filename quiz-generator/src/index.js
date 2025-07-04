const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const quizGeneratorService = require('./services/quizGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'quiz-generator',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Generate quiz endpoint
app.post('/generate', async (req, res) => {
  try {
    const { prompt, difficulty = 'medium', numQuestions = 10, timeLimit = 60 } = req.body;
    
    if (!prompt || prompt.length < 10) {
      return res.status(400).json({
        error: 'Prompt is required and must be at least 10 characters long'
      });
    }

    console.log(`🔄 Generating quiz for prompt: "${prompt}"`);
    
    const quiz = await quizGeneratorService.generateQuiz({
      prompt,
      difficulty,
      numQuestions,
      timeLimit
    });
    
    console.log(`✅ Quiz generated successfully: ${quiz.id}`);
    
    res.json({
      success: true,
      quiz: quiz
    });
  } catch (error) {
    console.error('❌ Quiz generation failed:', error);
    res.status(500).json({
      error: 'Quiz generation failed',
      message: error.message
    });
  }
});

// Get quiz status endpoint
app.get('/quiz/:quizId/status', async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // TODO: Implement quiz status check
    // Check if quiz generation is complete, in progress, or failed
    
    res.json({
      message: 'Quiz status endpoint - TODO: Implement status check',
      quizId: quizId
    });
  } catch (error) {
    console.error('Get quiz status error:', error);
    res.status(500).json({ error: 'Failed to get quiz status' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🤖 Quiz Generator service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 