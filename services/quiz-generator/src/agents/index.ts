import QuizMakerAgent from './agents/quizMaker';

interface ProcessQuizResult {
  response: string;
  threadId: string;
  quiz?: any;
  context?: any;
  streamId?: string;
}

interface StreamChunkCallback {
  (chunkData: any): void;
}

class AgentService {
  private quizMaker: QuizMakerAgent;

  constructor() {
    this.quizMaker = new QuizMakerAgent();
  }

  async processQuizRequest(message: string, threadId?: string): Promise<ProcessQuizResult> {
    return await this.quizMaker.processMessage(message, threadId);
  }

  async processQuizRequestStream(
    message: string, 
    threadId?: string, 
    onChunk?: StreamChunkCallback
  ): Promise<ProcessQuizResult> {
    return await this.quizMaker.processMessageStream(message, threadId, onChunk);
  }

  async getThread(threadId: string): Promise<any> {
    return await this.quizMaker.getThread(threadId);
  }

  async getThreadQuizzes(threadId: string): Promise<any[]> {
    return await this.quizMaker.getThreadQuizzes(threadId);
  }

  async getConversationHistory(threadId: string, limit: number = 20): Promise<any[]> {
    return await this.quizMaker.getConversationHistory(threadId, limit);
  }
}

export = new AgentService(); 