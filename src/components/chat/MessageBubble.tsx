// ─────────────────────────────────────────────────────────
// MessageBubble — Single chat message bubble
// Renders plain text only (no HTML) for XSS safety
// ─────────────────────────────────────────────────────────

import React, { memo } from 'react';
import type { ChatMessage } from '../../types/chat';

export interface MessageBubbleProps {
  message: ChatMessage;
  /** If true, the message is from the current user */
  isOwn: boolean;
}

/**
 * Presentational component for a single chat message.
 * Uses React.memo to prevent re-rendering when other messages change.
 * Renders plain text (textContent assignment) to prevent XSS.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
}: MessageBubbleProps) {
  const bubbleClass = [
    'chat-bubble',
    isOwn ? 'chat-bubble--own' : 'chat-bubble--other',
    message.status === 'error' ? 'chat-bubble--error' : '',
    message.status === 'sending' ? 'chat-bubble--sending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const timeLabel = formatTime(message.timestamp);

  return (
    <div className={bubbleClass} role="listitem">
      <div className="chat-bubble__header">
        <span className="chat-bubble__name">{message.senderName}</span>
        <span className="chat-bubble__time">{timeLabel}</span>
      </div>
      <div className="chat-bubble__content">{message.content}</div>
      {message.status === 'sending' && (
        <span className="chat-bubble__status chat-bubble__status--sending">
          Sending…
        </span>
      )}
      {message.status === 'error' && (
        <span className="chat-bubble__status chat-bubble__status--error">
          Failed to send
        </span>
      )}
    </div>
  );
});

// ── Helpers ─────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}