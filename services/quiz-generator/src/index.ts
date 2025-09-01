import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import agentService from './agents';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'quiz-generator',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Chat endpoint - Main interface for the agent
app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, threadId }: { message: string; threadId?: string } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string'
      });
    }

    console.log(`💬 Processing chat message: "${message}" (Thread: ${threadId || 'new'})`);
    
    const result = await agentService.processQuizRequest(message, threadId);
    
    console.log(`✅ Chat processed successfully: ${result.threadId}`);
    
    res.json({
      success: true,
      response: result.response,
      threadId: result.threadId,
      quiz: result.quiz,
      context: result.context
    });
  } catch (error: any) {
    console.error('❌ Chat processing failed:', error);
    res.status(500).json({
      error: 'Chat processing failed',
      message: error.message
    });
  }
});

// Streaming chat endpoint
app.post('/chat/stream', (req: Request, res: Response) => {
  const { message, threadId }: { message: string; threadId?: string } = req.body;
  
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Message is required and must be a non-empty string'
    });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  console.log(`🔄 Starting streaming chat: "${message}" (Thread: ${threadId || 'new'})`);

  // Process message with streaming
  agentService.processQuizRequestStream(message, threadId, (chunkData: any) => {
    // Send chunk to client
    res.write(`data: ${JSON.stringify({
      type: 'chunk',
      data: chunkData
    })}\n\n`);
  })
  .then((result) => {
    // Send final result
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      data: {
        success: true,
        response: result.response,
        threadId: result.threadId,
        quiz: result.quiz,
        context: result.context,
        streamId: result.streamId
      }
    })}\n\n`);
    
    res.write(`data: [DONE]\n\n`);
    res.end();
    
    console.log(`✅ Streaming completed: ${result.threadId}`);
  })
  .catch((error: any) => {
    console.error('❌ Streaming failed:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      data: {
        error: 'Chat processing failed',
        message: error.message
      }
    })}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log('📡 Client disconnected from stream');
  });
});

// Legacy generate endpoint - now proxies to agent
app.post('/generate', async (req: Request, res: Response) => {
  try {
    const { 
      prompt, 
      difficulty = 'medium', 
      numQuestions = 10, 
      timeLimit = 60 
    }: { 
      prompt: string; 
      difficulty?: string; 
      numQuestions?: number; 
      timeLimit?: number; 
    } = req.body;
    
    if (!prompt || prompt.length < 10) {
      return res.status(400).json({
        error: 'Prompt is required and must be at least 10 characters long'
      });
    }

    console.log(`🔄 Generating quiz for prompt: "${prompt}" (Legacy endpoint)`);
    
    // Convert to chat format
    const message = `Generate a quiz on "${prompt}" with ${numQuestions} questions, ${difficulty} difficulty, and ${timeLimit} minutes time limit.`;
    
    const result = await agentService.processQuizRequest(message);
    
    console.log(`✅ Quiz generated successfully: ${result.threadId}`);
    
    res.json({
      success: true,
      quiz: result.quiz,
      threadId: result.threadId,
      response: result.response
    });
  } catch (error: any) {
    console.error('❌ Quiz generation failed:', error);
    res.status(500).json({
      error: 'Quiz generation failed',
      message: error.message
    });
  }
});

// Thread management endpoints
app.get('/thread/:threadId', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    
    const thread = await agentService.getThread(threadId);
    
    if (!thread) {
      return res.status(404).json({
        error: 'Thread not found',
        threadId: threadId
      });
    }
    
    res.json({
      success: true,
      thread: thread
    });
  } catch (error: any) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

app.get('/thread/:threadId/history', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const { limit = '20' } = req.query;
    
    const history = await agentService.getConversationHistory(threadId, parseInt(limit as string));
    
    res.json({
      success: true,
      threadId: threadId,
      history: history,
      count: history.length
    });
  } catch (error: any) {
    console.error('Get thread history error:', error);
    res.status(500).json({ error: 'Failed to get thread history' });
  }
});

app.get('/thread/:threadId/quizzes', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    
    const quizzes = await agentService.getThreadQuizzes(threadId);
    
    res.json({
      success: true,
      threadId: threadId,
      quizzes: quizzes,
      count: quizzes.length
    });
  } catch (error: any) {
    console.error('Get thread quizzes error:', error);
    res.status(500).json({ error: 'Failed to get thread quizzes' });
  }
});

// System monitoring endpoints
app.get('/system/status', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      system: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      redis: {
        connected: true, // Would check actual Redis connection
        ttl: '24 hours'
      }
    });
  } catch (error: any) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🤖 Quiz Generator Agent service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🧠 Agent Architecture: LangGraph + LangChain`);
  console.log(`💾 Persistence: Redis-based thread management`);
}); 