// ─────────────────────────────────────────────────────────
// useChat — Chat hook with WebSocket dependency injection
// Manages message history, sending, and receiving messages
// ─────────────────────────────────────────────────────────

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type {
  ChatMessage,
  ChatMessagePayload,
  ChatMessageReceived,
  ChatTransport,
  MessageStatus,
} from '../types/chat';

// ── State & Reducer ─────────────────────────────────────

interface ChatState {
  messages: ChatMessage[];
  /** Whether the transport is currently connected */
  connected: boolean;
}

type ChatAction =
  | { type: 'ADD_OPTIMISTIC'; payload: ChatMessage }
  | { type: 'CONFIRM_SENT'; payload: { id: string; serverTime: string } }
  | { type: 'MARK_ERROR'; payload: { id: string } }
  | { type: 'RECEIVE'; payload: ChatMessage }
  | { type: 'SET_CONNECTED'; payload: boolean };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_OPTIMISTIC':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'CONFIRM_SENT': {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id
            ? { ...m, status: 'sent' as MessageStatus, timestamp: action.payload.serverTime }
            : m,
        ),
      };
    }

    case 'MARK_ERROR': {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id
            ? { ...m, status: 'error' as MessageStatus }
            : m,
        ),
      };
    }

    case 'RECEIVE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };

    default:
      return state;
  }
}

// ── Helpers ─────────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

// ── Hook ────────────────────────────────────────────────

export interface UseChatReturn {
  /** Array of chat messages in chronological order */
  messages: ChatMessage[];
  /** Whether the underlying transport is connected */
  connected: boolean;
  /** Send a new chat message */
  sendMessage: (content: string, senderName: string) => void;
  /** Retry sending a message that previously failed */
  retryMessage: (message: ChatMessage) => void;
}

/**
 * Custom hook for managing the in-game chat.
 *
 * Accepts a `ChatTransport` as a dependency so it can be tested
 * with a mock transport instead of requiring a real WebSocket.
 */
export function useChat(transport: ChatTransport): UseChatReturn {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    connected: transport.connectionState === 'connected',
  });

  // Keep a ref to the latest transport for use in the incoming handler
  const transportRef = useRef(transport);
  transportRef.current = transport;

  // Track connected state
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTED', payload: transport.connectionState === 'connected' });
  }, [transport.connectionState]);

  // Register handler for incoming messages
  useEffect(() => {
    const handleIncoming = (message: ChatMessageReceived) => {
      const msg: ChatMessage = {
        id: message.payload.id,
        senderName: message.payload.senderName,
        sender: 'other',
        content: message.payload.content,
        timestamp: message.payload.serverTime || message.payload.clientTime,
        status: 'sent',
      };
      dispatch({ type: 'RECEIVE', payload: msg });
    };

    transportRef.current.onChatMessage(handleIncoming);

    return () => {
      transportRef.current.offChatMessage(handleIncoming);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Send a chat message with optimistic UI update.
   * If the transport is disconnected, the message is marked as 'error' immediately.
   */
  const sendMessage = useCallback(
    (content: string, senderName: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const id = generateId();
      const now = new Date().toISOString();

      // 1. Optimistic add with status 'sending'
      const optimistic: ChatMessage = {
        id,
        senderName,
        sender: 'me',
        content: trimmed,
        timestamp: now,
        status: 'sending',
      };
      dispatch({ type: 'ADD_OPTIMISTIC', payload: optimistic });

      // 2. Attempt to send via transport
      if (transportRef.current.connectionState !== 'connected') {
        dispatch({ type: 'MARK_ERROR', payload: { id } });
        return;
      }

      const payload: ChatMessagePayload = {
        type: 'chat',
        payload: {
          id,
          content: trimmed,
          senderName,
          clientTime: now,
        },
      };

      try {
        transportRef.current.sendChatMessage(payload);
        // Optimistically mark as sent (server will relay back with serverTime)
        dispatch({ type: 'CONFIRM_SENT', payload: { id, serverTime: now } });
      } catch {
        dispatch({ type: 'MARK_ERROR', payload: { id } });
      }
    },
    [],
  );

  /**
   * Retry sending a message that previously failed.
   */
  const retryMessage = useCallback(
    (message: ChatMessage) => {
      if (message.status !== 'error') return;
      if (transportRef.current.connectionState !== 'connected') return;

      // Remove the error message and re-send
      const payload: ChatMessagePayload = {
        type: 'chat',
        payload: {
          id: message.id,
          content: message.content,
          senderName: message.senderName,
          clientTime: new Date().toISOString(),
        },
      };

      // Update status to sending
      dispatch({ type: 'CONFIRM_SENT', payload: { id: message.id, serverTime: new Date().toISOString() } });

      try {
        transportRef.current.sendChatMessage(payload);
      } catch {
        dispatch({ type: 'MARK_ERROR', payload: { id: message.id } });
      }
    },
    [],
  );

  return {
    messages: state.messages,
    connected: state.connected,
    sendMessage,
    retryMessage,
  };
}