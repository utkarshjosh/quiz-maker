import { ChatGroq } from '@langchain/groq';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, START, END } from '@langchain/langgraph';
import { tools } from '../tools';
import SYSTEM_PROMPTS from '../prompts/system';
import ThreadPersistence from '../utils/threadPersistence.js';
import streamingHandler from '../utils/streamingHandler.js';

interface QuizMakerState {
  messages: any[];
  threadId: string | null;
  currentQuiz: any | null;
  context: Record<string, any>;
}

interface ProcessResult {
  response: string;
  threadId: string;
  quiz?: any;
  context?: Record<string, any>;
  streamId?: string;
}

interface ChunkData {
  chunk: string;
  index: number;
  total: number;
  threadId: string;
  isLast: boolean;
}

interface StreamChunkCallback {
  (data: ChunkData): void;
}

class QuizMakerAgent {
  private llm: ChatGroq;
  private llmWithTools: any;
  private persistence: ThreadPersistence;
  private graph: any;

  constructor() {
    this.llm = new ChatGroq({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      apiKey: process.env.GROQ_API_KEY
    });

    // Bind tools to LLM
    this.llmWithTools = this.llm.bindTools(tools);
    
    this.persistence = new ThreadPersistence();
    this.graph = this.createGraph();
  }

  createGraph(): any {
    // Use a simpler approach for now to avoid complex StateGraph issues
    return {
      invoke: async (state: QuizMakerState) => {
        // Simple sequential processing instead of complex graph
        let currentState = { ...state };
        
        // Run agent node
        const agentResult = await this.agentNode(currentState);
        currentState = { ...currentState, ...agentResult };
        
        // Check if tools are needed
        const lastMessage = currentState.messages[currentState.messages.length - 1];
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          const toolsResult = await this.toolsNode(currentState);
          currentState = { ...currentState, ...toolsResult };
        }
        
        return currentState;
      }
    };
  }

  async agentNode(state: QuizMakerState): Promise<Partial<QuizMakerState>> {
    const { messages, threadId, context } = state;
    
    // Get conversation history if threadId exists
    let conversationHistory: any[] = [];
    if (threadId) {
      try {
        conversationHistory = await this.persistence.getConversationHistory(threadId);
      } catch (error) {
        console.error('Error getting conversation history:', error);
      }
    }

    // Build system message with context
    const systemMessage = new SystemMessage(SYSTEM_PROMPTS.QUIZ_MAKER_AGENT);
    
    // Combine system message, history, and current messages
    const allMessages = [
      systemMessage,
      ...conversationHistory.map((msg: any) => 
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
      ),
      ...messages
    ];

    // Get response from LLM
    const response = await this.llmWithTools.invoke(allMessages);
    
    return {
      messages: [response]
    };
  }

  async toolsNode(state: QuizMakerState): Promise<Partial<QuizMakerState>> {
    const { messages, threadId, currentQuiz } = state;
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return { messages: [] };
    }

    const toolResults: any[] = [];
    
    for (const toolCall of lastMessage.tool_calls) {
      const tool = tools.find((t: any) => t.name === toolCall.name);
      
      if (tool) {
        try {
          let toolArgs = toolCall.args;
          
          // Add threadId to tool arguments if available
          if (threadId && ['save_quiz', 'get_quiz'].includes(toolCall.name)) {
            toolArgs = { ...toolArgs, threadId };
          }
          
          const result = await tool.invoke(toolArgs);
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: JSON.stringify(result)
          });

          // Update state based on tool results
          if (toolCall.name === 'generate_quiz' && result.success) {
            // Save quiz to thread context
            if (threadId) {
              await this.persistence.addQuizToThread(threadId, result.quiz.id);
            }
            return {
              messages: [{ role: 'tool', ...toolResults[0] }],
              currentQuiz: result.quiz
            };
          }
          
        } catch (error: any) {
          console.error(`Error executing tool ${toolCall.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: JSON.stringify({ error: error.message })
          });
        }
      }
    }

    return {
      messages: toolResults.map(result => ({ role: 'tool', ...result }))
    };
  }

  async processMessage(message: string, threadId?: string): Promise<ProcessResult> {
    try {
      // Create or get thread
      let actualThreadId: string;
      if (!threadId) {
        actualThreadId = await this.persistence.createThread();
      } else {
        actualThreadId = threadId;
      }

      // Save user message to thread
      await this.persistence.addMessage(actualThreadId, {
        role: 'user',
        content: message
      });

      // Get thread context
      const context = await this.persistence.getThreadContext(actualThreadId);

      // Process with agent
      const initialState: QuizMakerState = {
        messages: [new HumanMessage(message)],
        threadId: actualThreadId,
        context: context,
        currentQuiz: null
      };

      const result = await this.graph.invoke(initialState);
      
      // Get the final AI response
      const aiResponse = result.messages[result.messages.length - 1];
      let responseContent = aiResponse.content;
      
      // Format markdown if it's a quiz
      if (result.currentQuiz) {
        responseContent = this.formatQuizAsMarkdown(result.currentQuiz);
      }

      // Save AI response to thread
      await this.persistence.addMessage(actualThreadId, {
        role: 'assistant',
        content: responseContent
      });

      // Extend thread expiry
      await this.persistence.extendThreadExpiry(actualThreadId);

      return {
        response: responseContent,
        threadId: actualThreadId,
        quiz: result.currentQuiz || null,
        context: result.context || {}
      };

    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  formatQuizAsMarkdown(quiz: any): string {
    let markdown = `# ${quiz.title}\n\n`;
    
    if (quiz.description) {
      markdown += `${quiz.description}\n\n`;
    }
    
    markdown += `**Difficulty:** ${quiz.difficulty}\n`;
    markdown += `**Time Limit:** ${quiz.timeLimit} minutes\n`;
    markdown += `**Total Questions:** ${quiz.totalQuestions}\n\n`;
    
    markdown += `---\n\n`;
    
    quiz.questions.forEach((q: any, index: number) => {
      markdown += `## Question ${index + 1}\n\n`;
      markdown += `${q.question}\n\n`;
      
      Object.entries(q.options).forEach(([key, value]: [string, any]) => {
        const isCorrect = key === q.correctAnswer;
        markdown += `${isCorrect ? '**' : ''}${key}. ${value}${isCorrect ? '**' : ''}\n`;
      });
      
      markdown += `\n**Correct Answer:** ${q.correctAnswer}\n`;
      markdown += `**Explanation:** ${q.explanation}\n\n`;
    });
    
    return markdown;
  }

  async getThread(threadId: string): Promise<any> {
    return await this.persistence.getThread(threadId);
  }

  async getThreadQuizzes(threadId: string): Promise<any[]> {
    return await this.persistence.getThreadQuizzes(threadId);
  }

  async getConversationHistory(threadId: string, limit: number = 20): Promise<any[]> {
    return await this.persistence.getConversationHistory(threadId, limit);
  }

  async processMessageStream(message: string, threadId?: string, onChunk?: StreamChunkCallback): Promise<ProcessResult> {
    try {
      // Create or get thread
      let actualThreadId: string;
      if (!threadId) {
        actualThreadId = await this.persistence.createThread();
      } else {
        actualThreadId = threadId;
      }

      // Get thread context
      const context = await this.persistence.getThreadContext(actualThreadId);

      // Create streaming handler
      const stream = await streamingHandler.createStream(actualThreadId, 'quiz_generation');
      
      // Process message
      let result: any;
      if (stream && onChunk) {
        result = await this.processWithStreaming(message, actualThreadId, context, stream, onChunk);
      } else {
        result = await this.processRegular(message, actualThreadId, context);
      }

      // Extend thread expiry
      await this.persistence.extendThreadExpiry(actualThreadId);

      return {
        response: result.response,
        threadId: actualThreadId,
        quiz: result.quiz || null,
        context: result.context || {},
        streamId: stream.streamId
      };

    } catch (error) {
      console.error('Error processing message stream:', error);
      throw error;
    }
  }

  async processWithStreaming(message: string, threadId: string, context: any, stream: any, onChunk: StreamChunkCallback): Promise<any> {
    // Save user message
    await this.persistence.addMessage(threadId, {
      role: 'user',
      content: message
    });

    // Process message and stream response
    const response = await this.processMessage(message, threadId);
    
    // Simulate streaming by chunking the response
    const chunks = this.chunkResponse(response.response);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkData: ChunkData = {
        chunk,
        index: i,
        total: chunks.length,
        threadId,
        isLast: i === chunks.length - 1
      };
      
      onChunk(chunkData);
      
      // Small delay between chunks for realistic streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    stream.complete(response);
    
    return response;
  }

  async processRegular(message: string, threadId: string, context: any): Promise<any> {
    return await this.processMessage(message, threadId);
  }

  chunkResponse(response: string, chunkSize: number = 50): string[] {
    const words = response.split(' ');
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }
}

export default QuizMakerAgent; 