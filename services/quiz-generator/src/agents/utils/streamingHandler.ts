import { EventEmitter } from 'events';

interface StreamChunk {
  timestamp: Date;
  content: string;
  type: 'chunk';
}

interface StreamInfo {
  id: string;
  threadId: string;
  type: string;
  startTime: Date;
  status: 'active' | 'completed' | 'error';
  chunks: StreamChunk[];
  metadata: Record<string, any>;
  endTime?: Date;
  finalData?: any;
  error?: Error;
}

interface StreamControl {
  streamId: string;
  emit: (chunk: string) => void;
  complete: (finalData?: any) => void;
  error: (error: Error) => void;
}

interface ChunkEvent {
  streamId: string;
  threadId: string;
  chunk: string;
  chunkIndex: number;
}

interface CompleteEvent {
  streamId: string;
  threadId: string;
  finalData?: any;
  duration: number;
  totalChunks: number;
}

interface ErrorEvent {
  streamId: string;
  threadId: string;
  error: Error;
  duration: number;
}

interface LLMChunkData {
  content: string;
  delta: string;
  fullResponse: string;
  timestamp: Date;
}

interface LLMCompleteData {
  fullResponse: string;
  timestamp: Date;
}

interface LLMMessage {
  role: string;
  content: string;
}

interface LLMStream {
  stream: (messages: LLMMessage[]) => AsyncIterable<{ content?: string }>;
}

class StreamingHandler extends EventEmitter {
  private activeStreams: Map<string, StreamInfo>;

  constructor() {
    super();
    this.activeStreams = new Map();
  }

  async createStream(threadId: string, type: string = 'chat'): Promise<StreamControl> {
    const streamId = `${threadId}_${Date.now()}`;
    
    const streamInfo: StreamInfo = {
      id: streamId,
      threadId: threadId,
      type: type,
      startTime: new Date(),
      status: 'active',
      chunks: [],
      metadata: {}
    };

    this.activeStreams.set(streamId, streamInfo);
    
    return {
      streamId,
      emit: (chunk: string) => this.emitChunk(streamId, chunk),
      complete: (finalData?: any) => this.completeStream(streamId, finalData),
      error: (error: Error) => this.errorStream(streamId, error)
    };
  }

  emitChunk(streamId: string, chunk: string): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) return;

    streamInfo.chunks.push({
      timestamp: new Date(),
      content: chunk,
      type: 'chunk'
    });

    this.emit('chunk', {
      streamId,
      threadId: streamInfo.threadId,
      chunk,
      chunkIndex: streamInfo.chunks.length - 1
    } as ChunkEvent);
  }

  completeStream(streamId: string, finalData: any = null): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) return;

    streamInfo.status = 'completed';
    streamInfo.endTime = new Date();
    streamInfo.finalData = finalData;

    this.emit('complete', {
      streamId,
      threadId: streamInfo.threadId,
      finalData,
      duration: streamInfo.endTime.getTime() - streamInfo.startTime.getTime(),
      totalChunks: streamInfo.chunks.length
    } as CompleteEvent);

    // Clean up after some time
    setTimeout(() => {
      this.activeStreams.delete(streamId);
    }, 30000); // 30 seconds cleanup
  }

  errorStream(streamId: string, error: Error): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) return;

    streamInfo.status = 'error';
    streamInfo.error = error;
    streamInfo.endTime = new Date();

    this.emit('error', {
      streamId,
      threadId: streamInfo.threadId,
      error,
      duration: streamInfo.endTime.getTime() - streamInfo.startTime.getTime()
    } as ErrorEvent);

    // Clean up immediately on error
    this.activeStreams.delete(streamId);
  }

  getStreamInfo(streamId: string): StreamInfo | undefined {
    return this.activeStreams.get(streamId);
  }

  getActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values());
  }

  // For future LLM streaming integration
  async streamLLMResponse(
    llm: LLMStream,
    messages: LLMMessage[],
    onChunk?: (chunk: LLMChunkData) => void,
    onComplete?: (data: LLMCompleteData) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const stream = await llm.stream(messages);
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.content || '';
        fullResponse += content;
        
        if (onChunk) {
          onChunk({
            content,
            delta: content,
            fullResponse: fullResponse,
            timestamp: new Date()
          });
        }
      }
      
      if (onComplete) {
        onComplete({
          fullResponse,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

export default new StreamingHandler(); 