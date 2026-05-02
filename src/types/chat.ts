// ─────────────────────────────────────────────────────────
// Chat System — TypeScript Interfaces
// ─────────────────────────────────────────────────────────

/** Possible statuses for an individual chat message */
export type MessageStatus = 'sending' | 'sent' | 'error';

/** Role of the message sender */
export type MessageSender = 'me' | 'other' | 'system';

/** A single chat message */
export interface ChatMessage {
  /** Unique identifier (generated client-side for optimistic updates) */
  id: string;
  /** Display name of the sender */
  senderName: string;
  /** Who sent this message */
  sender: MessageSender;
  /** Plain-text content (no HTML allowed — rendered as text for XSS safety) */
  content: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Current delivery status */
  status: MessageStatus;
}

/**
 * Outgoing chat message payload sent over WebSocket.
 * Kept minimal — the server stamps serverTime on relay.
 */
export interface ChatMessagePayload {
  type: 'chat';
  payload: {
    /** Client-generated unique ID */
    id: string;
    /** The plain-text message body */
    content: string;
    /** Sender display name (set by the client) */
    senderName: string;
    /** Client-side timestamp (ISO-8601) */
    clientTime: string;
  };
}

/**
 * Incoming chat message payload received from WebSocket.
 * The server relays the same shape back to the opponent.
 */
export interface ChatMessageReceived {
  type: 'chat';
  payload: {
    id: string;
    content: string;
    senderName: string;
    clientTime: string;
    /** Server-assigned timestamp for ordering */
    serverTime: string;
  };
}

/**
 * The shape of the dependency injected into useChat.
 * This abstraction lets us test the hook with a mock sender
 * instead of a real WebSocket.
 */
export interface ChatTransport {
  /** Current connection status of the underlying transport */
  connectionState: 'disconnected' | 'connecting' | 'connected';
  /** Send a chat message through the transport */
  sendChatMessage: (message: ChatMessagePayload) => void;
  /** Register a handler for incoming chat messages */
  onChatMessage: (handler: (message: ChatMessageReceived) => void) => void;
  /** Remove a previously-registered handler */
  offChatMessage: (handler: (message: ChatMessageReceived) => void) => void;
}