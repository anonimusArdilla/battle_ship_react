// ─────────────────────────────────────────────────────────
// MessageList — Scrollable list of chat messages
// Uses aria-live for screen reader announcements
// ─────────────────────────────────────────────────────────

import React from 'react';
import type { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: ChatMessage[];
  /** ID of the current player, used to determine "own" messages */
  currentPlayerName: string;
}

/**
 * Renders the full list of chat messages.
 * The container uses `aria-live="polite"` so screen readers
 * announce new messages without interrupting the user.
 */
export function MessageList({ messages, currentPlayerName }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div
        className="chat-message-list chat-message-list--empty"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <p className="chat-message-list__empty-text">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div
      className="chat-message-list"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.senderName === currentPlayerName && msg.sender === 'me'}
        />
      ))}
    </div>
  );
}