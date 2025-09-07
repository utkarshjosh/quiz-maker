import { useCallback, useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type {
  Message,
  MessageType,
  StateMessage,
  QuestionMessage,
  RevealMessage,
  ErrorMessage,
  JoinedMessage,
  LeftMessage,
  KickedMessage,
  ScoreMessage,
  EndMessage,
  PongMessage,
} from "@quiz-maker/ts";
import {
  isStateMessage,
  isQuestionMessage,
  isRevealMessage,
  isErrorMessage,
} from "@quiz-maker/ts";

export interface WebSocketMessageHandlers {
  onState?: (message: StateMessage) => void;
  onQuestion?: (message: QuestionMessage) => void;
  onReveal?: (message: RevealMessage) => void;
  onError?: (message: ErrorMessage) => void;
  onJoined?: (message: JoinedMessage) => void;
  onLeft?: (message: LeftMessage) => void;
  onKicked?: (message: KickedMessage) => void;
  onScore?: (message: ScoreMessage) => void;
  onEnd?: (message: EndMessage) => void;
  onPong?: (message: PongMessage) => void;
  onUnknown?: (message: Message) => void;
}

/**
 * Hook for handling WebSocket messages with type safety
 * Automatically routes messages to appropriate handlers based on message type
 */
export const useWebSocketMessages = (handlers: WebSocketMessageHandlers) => {
  const { state } = useWebSocket();

  const handleMessage = useCallback(
    (message: Message) => {
      switch (message.type) {
        case MessageType.STATE:
          if (isStateMessage(message.data)) {
            handlers.onState?.(message.data);
          }
          break;

        case MessageType.QUESTION:
          if (isQuestionMessage(message.data)) {
            handlers.onQuestion?.(message.data);
          }
          break;

        case MessageType.REVEAL:
          if (isRevealMessage(message.data)) {
            handlers.onReveal?.(message.data);
          }
          break;

        case MessageType.ERROR:
          if (isErrorMessage(message.data)) {
            handlers.onError?.(message.data);
          }
          break;

        case MessageType.JOINED:
          handlers.onJoined?.(message.data as JoinedMessage);
          break;

        case MessageType.LEFT:
          handlers.onLeft?.(message.data as LeftMessage);
          break;

        case MessageType.KICKED:
          handlers.onKicked?.(message.data as KickedMessage);
          break;

        case MessageType.SCORE:
          handlers.onScore?.(message.data as ScoreMessage);
          break;

        case MessageType.END:
          handlers.onEnd?.(message.data as EndMessage);
          break;

        case MessageType.PONG:
          handlers.onPong?.(message.data as PongMessage);
          break;

        default:
          handlers.onUnknown?.(message);
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    if (state.lastMessage) {
      handleMessage(state.lastMessage);
    }
  }, [state.lastMessage, handleMessage]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
  };
};
