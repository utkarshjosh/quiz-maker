/**
 * WebSocket Service - Pure TypeScript service for WebSocket communication
 * Unity-style: Clean service layer with no React dependencies
 * 
 * This replaces the messy Context + Hook combo with a clean singleton service
 */

import type { Message, QuizSettings } from '@quiz-maker/ts';
import { MessageType } from '@quiz-maker/ts';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
}

export type MessageHandler = (message: Message) => void;
export type StatusHandler = (status: WebSocketStatus) => void;
export type ErrorHandler = (error: Error) => void;

/**
 * WebSocket Service - Singleton pattern for WebSocket management
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private manualDisconnect = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      pingInterval: 25000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    // Prevent multiple simultaneous connections
    if (this.status === 'connected') {
      console.log('[WebSocket] Already connected - ignoring duplicate connect call');
      return;
    }

    if (this.status === 'connecting') {
      console.log('[WebSocket] Connection already in progress - ignoring duplicate connect call');
      return;
    }

    // Close existing connection if any
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      console.log('[WebSocket] Closing existing connection before reconnecting');
      this.ws.close();
      this.ws = null;
    }

    this.manualDisconnect = false;
    this.setStatus('connecting');

    try {
      const wsUrl = `${this.config.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl, this.config.protocols);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.handleError(new Error('Failed to create WebSocket connection'));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.manualDisconnect = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Send a message to the server
   */
  send(message: Message): void {
    if (!this.ws || this.status !== 'connected') {
      console.warn('[WebSocket] Cannot send message - not connected', message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.log('[WebSocket] Sent:', message.type);
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      this.notifyError(new Error('Failed to send message'));
    }
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status); // Immediately call with current status
    return () => this.statusHandlers.delete(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  // ==================== Game Actions ====================

  /**
   * Create a new game room
   */
  createRoom(quizId: string, settings: QuizSettings): void {
    this.send({
      v: 1,
      type: MessageType.CREATE_ROOM,
      msg_id: this.generateMessageId(),
      data: { quiz_id: quizId, settings },
    });
  }

  /**
   * Join a game room
   */
  joinRoom(pin: string, displayName: string): void {
    this.send({
      v: 1,
      type: MessageType.JOIN,
      msg_id: this.generateMessageId(),
      data: { pin, display_name: displayName },
    });
  }

  /**
   * Leave the current room
   */
  leaveRoom(): void {
    this.send({
      v: 1,
      type: MessageType.LEAVE,
      msg_id: this.generateMessageId(),
      data: {},
    });
  }

  /**
   * Start the quiz
   */
  startQuiz(): void {
    this.send({
      v: 1,
      type: MessageType.START,
      msg_id: this.generateMessageId(),
      data: {},
    });
  }

  /**
   * Submit an answer
   */
  submitAnswer(questionIndex: number, choice: string): void {
    this.send({
      v: 1,
      type: MessageType.ANSWER,
      msg_id: this.generateMessageId(),
      data: { question_index: questionIndex, choice },
    });
  }

  /**
   * End the quiz
   */
  endQuiz(): void {
    this.send({
      v: 1,
      type: MessageType.END,
      msg_id: this.generateMessageId(),
      data: {},
    });
  }

  // ==================== Private Methods ====================

  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.startPing();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: Message = JSON.parse(event.data);
      
      // Auto-respond to pings
      if (message.type === MessageType.PING) {
        this.send({
          v: 1,
          type: MessageType.PONG,
          msg_id: this.generateMessageId(),
          data: { timestamp: Date.now() },
        });
        return;
      }

      // Notify all handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[WebSocket] Handler error:', error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Closed:', event.code, event.reason);
    this.cleanup();
    this.setStatus('disconnected');

    // Don't reconnect if manually disconnected
    if (this.manualDisconnect) {
      return;
    }

    // Don't reconnect on auth errors
    if (event.code === 1008 || event.code === 1002 || event.code === 1003) {
      this.notifyError(new Error('Authentication failed'));
      return;
    }

    // Attempt to reconnect
    this.attemptReconnect();
  }

  private handleError(error: Event | Error): void {
    console.error('[WebSocket] Error:', error);
    this.setStatus('error');
    
    if (error instanceof Error) {
      this.notifyError(error);
    } else {
      this.notifyError(new Error('WebSocket connection error'));
    }
  }

  private attemptReconnect(): void {
    const maxAttempts = this.config.reconnectAttempts!;
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.notifyError(new Error('Connection failed after maximum attempts'));
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${maxAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      // Note: This requires the token to be available
      // In practice, you'd need to fetch a new token here
      console.warn('[WebSocket] Reconnect requires new token - not implemented');
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          v: 1,
          type: MessageType.PING,
          msg_id: this.generateMessageId(),
          data: { timestamp: Date.now() },
        });
      }
    }, this.config.pingInterval);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private cleanup(): void {
    this.stopPing();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private setStatus(status: WebSocketStatus): void {
    if (this.status === status) return;
    
    this.status = status;
    console.log('[WebSocket] Status:', status);
    
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (error) {
        console.error('[WebSocket] Status handler error:', error);
      }
    });
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error('[WebSocket] Error handler error:', err);
      }
    });
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Singleton instance
let wsServiceInstance: WebSocketService | null = null;

/**
 * Get or create the WebSocket service instance
 */
export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  if (!wsServiceInstance) {
    if (!config) {
      // Use default config if none provided
      config = {
        url: 'ws://localhost:5000/ws',
        protocols: ['quiz-protocol'],
      };
    }
    wsServiceInstance = new WebSocketService(config);
  }
  return wsServiceInstance;
}

/**
 * Destroy the WebSocket service instance
 */
export function destroyWebSocketService(): void {
  if (wsServiceInstance) {
    wsServiceInstance.disconnect();
    wsServiceInstance = null;
    console.log('[WebSocketService] Instance destroyed - can be recreated');
  }
}

