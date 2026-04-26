// ─────────────────────────────────────────────────────────
// Online Session Transport
// WebSocket-based message transport for real partner play
// ─────────────────────────────────────────────────────────

import type { AttackResult, PlayerId, ShipId } from './models';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface OnlineAttackPayload {
  row: number;
  col: number;
}

export interface OnlineAttackResultPayload {
  row: number;
  col: number;
  result: AttackResult;
  shipId?: ShipId;
  winner?: PlayerId;
}

export type OnlineMessage =
  | { type: 'ready' }
  | { type: 'start'; payload: { startingPlayer: PlayerId } }
  | { type: 'attack'; payload: OnlineAttackPayload }
  | { type: 'attackResult'; payload: OnlineAttackResultPayload }
  | { type: 'opponentDisconnected' }
  | { type: 'error'; message: string }
  | { type: 'sessionCreated'; sessionId: string }
  | { type: 'sessionReady' };

export interface OnlineSessionOptions {
  onConnectionStateChange: (status: ConnectionStatus, role: 'host' | 'guest' | null) => void;
  onRemoteMessage: (message: OnlineMessage) => void;
  serverUrl?: string;
}

function parseMessage(data: string): OnlineMessage | null {
  try {
    return JSON.parse(data) as OnlineMessage;
  } catch {
    return null;
  }
}

export class OnlineSession {
  private ws: WebSocket | null = null;
  private options: OnlineSessionOptions;
  private role: 'host' | 'guest' | null = null;
  private sessionId: string | null = null;
  private serverUrl: string;

  constructor(options: OnlineSessionOptions) {
    this.options = options;
    this.serverUrl = options.serverUrl || this.getServerUrl();
  }

  private getServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // In development, server runs on port 3001
    const port = host === 'localhost' ? '3001' : window.location.port;
    return `${protocol}//${host}:${port}`;
  }

  async createSession(): Promise<string> {
    this.role = 'host';
    this.options.onConnectionStateChange('connecting', this.role);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - make sure the server is running'));
      }, 5000);

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected, sending createSession');
          this.ws!.send(JSON.stringify({ type: 'createSession' }));
        };

        this.ws.onmessage = (event) => {
          const message = parseMessage(event.data);
          if (!message) return;

          if (message.type === 'sessionCreated') {
            clearTimeout(timeout);
            this.sessionId = message.sessionId;
            console.log('Received sessionCreated:', message.sessionId);
            this.options.onConnectionStateChange('connected', this.role);
            this.setupMessageHandler();
            resolve(this.sessionId);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          reject(new Error('Failed to create session'));
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.options.onConnectionStateChange('disconnected', null);
        };
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  async joinSession(sessionId: string): Promise<void> {
    this.role = 'guest';
    this.sessionId = sessionId.toUpperCase();
    this.options.onConnectionStateChange('connecting', this.role);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.ws!.send(JSON.stringify({
            type: 'joinSession',
            sessionId: this.sessionId,
          }));
        };

        this.ws.onmessage = (event) => {
          const message = parseMessage(event.data);
          if (!message) return;

          if (message.type === 'sessionReady') {
            this.options.onConnectionStateChange('connected', this.role);
            this.setupMessageHandler();
            resolve();
          } else if (message.type === 'error') {
            reject(new Error(message.message));
          }
        };

        this.ws.onerror = () => {
          reject(new Error('Failed to join session'));
        };

        this.ws.onclose = () => {
          this.options.onConnectionStateChange('disconnected', null);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private setupMessageHandler() {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (message) {
        this.options.onRemoteMessage(message);
      }
    };

    this.ws.onclose = () => {
      this.options.onConnectionStateChange('disconnected', null);
    };
  }

  sendMessage(message: OnlineMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(message));
  }

  dispose(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.options.onConnectionStateChange('disconnected', null);
    this.role = null;
    this.sessionId = null;
  }
}
