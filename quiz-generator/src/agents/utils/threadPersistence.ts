import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

interface Thread {
  id: string;
  userId: string | null;
  createdAt: string;
  lastActivityAt: string;
  messageCount: number;
  context: Record<string, any>;
  quizzes: string[];
}

interface MessageInput {
  role: string;
  content: string;
  [key: string]: any;
}

interface Message extends MessageInput {
  id: string;
  threadId: string;
  timestamp: string;
}

interface ConversationHistoryItem {
  role: string;
  content: string;
  timestamp: string;
}

class ThreadPersistence {
  private client: RedisClientType | null;
  private isConnected: boolean;

  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async createThread(userId: string | null = null): Promise<string> {
    await this.connect();
    
    const threadId = uuidv4();
    const thread: Thread = {
      id: threadId,
      userId: userId,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      messageCount: 0,
      context: {},
      quizzes: []
    };

    const threadKey = `thread:${threadId}`;
    await this.client!.setEx(threadKey, 86400, JSON.stringify(thread)); // 24 hours expiry

    return threadId;
  }

  async getThread(threadId: string): Promise<Thread | null> {
    await this.connect();
    
    const threadKey = `thread:${threadId}`;
    const threadData = await this.client!.get(threadKey);
    
    if (!threadData) {
      return null;
    }

    return JSON.parse(threadData);
  }

  async updateThread(threadId: string, updates: Partial<Thread>): Promise<Thread> {
    await this.connect();
    
    const thread = await this.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const updatedThread: Thread = {
      ...thread,
      ...updates,
      lastActivityAt: new Date().toISOString()
    };

    const threadKey = `thread:${threadId}`;
    await this.client!.setEx(threadKey, 86400, JSON.stringify(updatedThread));
    
    return updatedThread;
  }

  async addMessage(threadId: string, message: MessageInput): Promise<string> {
    await this.connect();
    
    const thread = await this.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const messageId = uuidv4();
    const messageData: Message = {
      ...message,
      id: messageId,
      threadId: threadId,
      timestamp: new Date().toISOString()
    };

    // Store message
    const messageKey = `message:${messageId}`;
    await this.client!.setEx(messageKey, 86400, JSON.stringify(messageData));

    // Add to thread's message list
    const threadMessagesKey = `thread:${threadId}:messages`;
    await this.client!.lPush(threadMessagesKey, messageId);
    await this.client!.expire(threadMessagesKey, 86400);

    // Update thread
    await this.updateThread(threadId, {
      messageCount: thread.messageCount + 1
    });

    return messageId;
  }

  async getMessages(threadId: string, limit: number = 50): Promise<Message[]> {
    await this.connect();
    
    const threadMessagesKey = `thread:${threadId}:messages`;
    const messageIds = await this.client!.lRange(threadMessagesKey, 0, limit - 1);
    
    const messages: Message[] = [];
    for (const messageId of messageIds) {
      const messageKey = `message:${messageId}`;
      const messageData = await this.client!.get(messageKey);
      if (messageData) {
        messages.push(JSON.parse(messageData));
      }
    }

    return messages.reverse(); // Return in chronological order
  }

  async getConversationHistory(threadId: string, limit: number = 20): Promise<ConversationHistoryItem[]> {
    const messages = await this.getMessages(threadId, limit);
    
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  }

  async setThreadContext(threadId: string, context: Record<string, any>): Promise<void> {
    await this.connect();
    
    const thread = await this.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    await this.updateThread(threadId, {
      context: { ...thread.context, ...context }
    });
  }

  async getThreadContext(threadId: string): Promise<Record<string, any>> {
    const thread = await this.getThread(threadId);
    return thread ? thread.context : {};
  }

  async addQuizToThread(threadId: string, quizId: string): Promise<void> {
    await this.connect();
    
    const thread = await this.getThread(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const updatedQuizzes = [...thread.quizzes, quizId];
    await this.updateThread(threadId, {
      quizzes: updatedQuizzes
    });
  }

  async getThreadQuizzes(threadId: string): Promise<string[]> {
    const thread = await this.getThread(threadId);
    return thread ? thread.quizzes : [];
  }

  async extendThreadExpiry(threadId: string, seconds: number = 86400): Promise<void> {
    await this.connect();
    
    const threadKey = `thread:${threadId}`;
    const threadMessagesKey = `thread:${threadId}:messages`;
    const threadQuizzesKey = `thread:${threadId}:quizzes`;
    
    await this.client!.expire(threadKey, seconds);
    await this.client!.expire(threadMessagesKey, seconds);
    await this.client!.expire(threadQuizzesKey, seconds);
  }
}

export default ThreadPersistence; 