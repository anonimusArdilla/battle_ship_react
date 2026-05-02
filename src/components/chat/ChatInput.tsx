// ─────────────────────────────────────────────────────────
// ChatInput — Input field with send button
// Handles Enter key submission and client-side rate limiting
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef } from 'react';

export interface ChatInputProps {
  /** Callback when a new message is submitted */
  onSend: (content: string) => void;
  /** Whether the chat transport is connected */
  connected: boolean;
  /** Minimum interval between sends in ms (default 500) */
  rateLimitMs?: number;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input should be disabled */
  disabled?: boolean;
}

/**
 * Text input + send button with client-side rate limiting.
 *
 * Debounce is implemented by tracking the last send timestamp;
 * sends that occur within `rateLimitMs` of the previous one are discarded.
 */
export function ChatInput({
  onSend,
  connected,
  rateLimitMs = 500,
  placeholder = 'Type a message…',
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const lastSendRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = connected && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !canSend) return;

    // Rate-limiting check
    const now = Date.now();
    if (now - lastSendRef.current < rateLimitMs) return;
    lastSendRef.current = now;

    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  }, [value, canSend, rateLimitMs, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat-input" role="form" aria-label="Send a chat message">
      <label htmlFor="chat-input-field" className="chat-input__sr-only">
        Chat message
      </label>
      <input
        ref={inputRef}
        id="chat-input-field"
        className="chat-input__field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={connected ? placeholder : 'Chat disconnected'}
        disabled={!canSend}
        maxLength={500}
        autoComplete="off"
        aria-label="Type a chat message"
      />
      <button
        className="chat-input__send-btn"
        onClick={handleSend}
        disabled={!canSend || value.trim().length === 0}
        aria-label="Send message"
        title="Send message"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}