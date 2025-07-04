const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  // TODO: Add checks for dependent services
  const healthChecks = {
    database: 'unknown', // TODO: Check MongoDB connection
    redis: 'unknown',    // TODO: Check Redis connection
    quizGenerator: 'unknown', // TODO: Check quiz generator service
    realtimeService: 'unknown' // TODO: Check realtime service
  };

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: process.env.npm_package_version || '1.0.0',
    dependencies: healthChecks
  });
});

module.exports = router; 