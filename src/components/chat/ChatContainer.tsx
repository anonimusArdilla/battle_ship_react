// ─────────────────────────────────────────────────────────
// ChatContainer — Main chat wrapper
// Handles auto-scrolling to bottom on new messages
// ─────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatTransport } from '../../types/chat';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export interface ChatContainerProps {
  /** The transport abstraction for sending/receiving chat messages */
  transport: ChatTransport;
  /** Name/identifier for the current player */
  playerName: string;
}

/**
 * Self-contained chat panel that creates its own useChat instance
 * from the provided transport. Collapsible on mobile, sidebar on desktop.
 * Automatically scrolls to the bottom when new messages arrive.
 */
export function ChatContainer({
  transport,
  playerName,
}: ChatContainerProps) {
  const chat = useChat(transport);
  const { messages, connected, sendMessage, retryMessage } = chat;
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content, playerName);
    },
    [sendMessage, playerName],
  );

  const handleRetry = useCallback(
    (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (msg) {
        retryMessage(msg);
      }
    },
    [messages, retryMessage],
  );

  return (
    <aside
      className={`chat-panel ${collapsed ? 'chat-panel--collapsed' : ''}`}
      aria-label="Game chat"
    >
      {/* Header with collapse toggle */}
      <div className="chat-panel__header">
        <h3 className="chat-panel__title">Chat</h3>
        <div className="chat-panel__status">
          <span
            className={`chat-panel__dot ${
              connected ? 'chat-panel__dot--connected' : 'chat-panel__dot--disconnected'
            }`}
            aria-hidden="true"
          />
          <span className="chat-panel__status-text">
            {connected ? 'Connected' : 'Offline'}
          </span>
        </div>
        <button
          className="chat-panel__toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand chat' : 'Collapse chat'}
          title={collapsed ? 'Expand chat' : 'Collapse chat'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Messages */}
      {!collapsed && (
        <>
          <div className="chat-panel__messages">
            <MessageList messages={messages} currentPlayerName={playerName} />
            <div ref={bottomRef} />
          </div>

          {/* Error retry bar */}
          {messages.some((m) => m.status === 'error') && (
            <div className="chat-panel__retry-bar">
              <span>
                Some messages failed to send.{' '}
                {messages.filter((m) => m.status === 'error').length} pending
              </span>
              <button
                className="chat-panel__retry-btn"
                onClick={() => {
                  messages
                    .filter((m) => m.status === 'error')
                    .forEach((m) => handleRetry(m.id));
                }}
              >
                Retry all
              </button>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            connected={connected}
            disabled={!connected}
            placeholder={connected ? 'Type a message…' : 'Chat disconnected'}
          />
        </>
      )}
    </aside>
  );
}