// ─────────────────────────────────────────────────────────
// Online game hook
// Manages WebSocket session state and partner communication
// ─────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Position, GameMode, ConnectionStatus, PlayerId } from '../core/models';
import type { OnlineSession as RemoteOnlineSession, OnlineMessage } from '../core/online';
import { OnlineSession } from '../core/online';
import { resolveAttack, allShipsSunk } from '../core/attack';
import type { GameAction } from '../context/GameContext';
import type { ChatTransport, ChatMessagePayload, ChatMessageReceived } from '../types/chat';

export interface OnlineApi {
  connectionState: ConnectionStatus;
  role: 'host' | 'guest' | null;
  sessionId: string;
  localReady: boolean;
  remoteReady: boolean;
  error: string | null;
  createSession: () => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  sendReady: () => void;
  sendAttack: (position: Position) => void;
  disconnect: () => void;
  resetReadyState: () => void;
  /** Chat transport adapter for useChat hook */
  chatTransport: ChatTransport;
}

interface UseOnlineParams {
  gameMode: GameMode;
  game: GameState;
  isAttacking: boolean;
  dispatch: React.Dispatch<GameAction>;
}

export function useOnline({ gameMode, game, isAttacking, dispatch }: UseOnlineParams): OnlineApi {
  const sessionRef = useRef<RemoteOnlineSession | null>(null);
  const stateRef = useRef<GameState>(game);
  const roleRef = useRef<'host' | 'guest' | null>(null);
  const localReadyRef = useRef(false);
  const remoteReadyRef = useRef(false);
  const [connectionState, setConnectionState] = useState<ConnectionStatus>('disconnected');
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stateRef.current = game;
  }, [game]);

  useEffect(() => {
    if (gameMode !== 'online') {
      sessionRef.current?.dispose();
      sessionRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectionState('disconnected');
      setRole(null);
      setSessionId('');
      setLocalReady(false);
      setRemoteReady(false);
      setError(null);
    }
  }, [gameMode]);

  useEffect(() => {
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    localReadyRef.current = localReady;
  }, [localReady]);

  useEffect(() => {
    remoteReadyRef.current = remoteReady;
  }, [remoteReady]);

  const handleRemoteMessage = useCallback((message: OnlineMessage) => {
    if (message.type === 'ready') {
      setRemoteReady(true);
      if (roleRef.current === 'host' && localReadyRef.current) {
        const startingPlayer: PlayerId = 'player';
        sessionRef.current?.sendMessage({ type: 'start', payload: { startingPlayer: 'enemy' } });
        dispatch({ type: 'START_ONLINE_GAME', startingPlayer });
      }
      return;
    }

    if (message.type === 'start') {
      dispatch({ type: 'START_ONLINE_GAME', startingPlayer: message.payload.startingPlayer });
      return;
    }

    if (message.type === 'attack') {
      const currentState = stateRef.current;
      if (currentState.phase !== 'playing') return;

      const result = resolveAttack(currentState.playerBoard, message.payload, 'enemy');
      const winner = allShipsSunk(result.board) ? 'enemy' : null;
      dispatch({
        type: 'RECEIVE_ONLINE_ATTACK',
        board: result.board,
        event: result.event,
        winner,
      });

      const payloadWinner = winner === 'enemy' ? 'player' : winner === 'player' ? 'enemy' : null;
      sessionRef.current?.sendMessage({
        type: 'attackResult',
        payload: {
          row: message.payload.row,
          col: message.payload.col,
          result: result.result,
          shipId: result.sunkShipId,
          winner: payloadWinner ?? undefined,
        },
      });
      return;
    }

    if (message.type === 'attackResult') {
      const payload = message.payload;
      const currentEnemyBoard = stateRef.current.enemyBoard;
      const boardUpdate = { ...currentEnemyBoard, grid: currentEnemyBoard.grid.map(row => row.map(cell => ({ ...cell }))), shotsReceived: new Set(currentEnemyBoard.shotsReceived) };
      const key = `${payload.row},${payload.col}`;
      const cell = boardUpdate.grid[payload.row][payload.col];
      boardUpdate.shotsReceived.add(key);
      boardUpdate.grid[payload.row][payload.col] = {
        ...cell,
        state: payload.result === 'miss' ? 'miss' : payload.result === 'hit' ? 'hit' : 'sunk',
      };

      dispatch({
        type: 'ONLINE_ATTACK_RESULT',
        board: boardUpdate,
        event: {
          attacker: 'player',
          target: { row: payload.row, col: payload.col },
          result: payload.result,
          shipId: payload.shipId,
          timestamp: Date.now(),
        },
        winner: payload.winner ?? null,
      });
      return;
    }

    if (message.type === 'opponentDisconnected') {
      setError('Opponent disconnected');
      sessionRef.current?.dispose();
      sessionRef.current = null;
      setConnectionState('disconnected');
      return;
    }
  }, [dispatch, localReady, role]);

  const ensureSession = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = new OnlineSession({
        onConnectionStateChange: (status, newRole) => {
          setConnectionState(status);
          setRole(newRole);
          if (status === 'disconnected') {
            setLocalReady(false);
            setRemoteReady(false);
          }
        },
        onRemoteMessage: handleRemoteMessage,
      });
    } else {
      // Update the callback if state changed
      sessionRef.current.setRemoteMessageHandler(handleRemoteMessage);
    }
    return sessionRef.current;
  }, [handleRemoteMessage]);

  // Ensure handler is always up-to-date whenever state changes
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.setRemoteMessageHandler(handleRemoteMessage);
    }
  }, [handleRemoteMessage]);

  const createSession = useCallback(async () => {
    try {
      const session = ensureSession();
      setError(null);
      console.log('Creating session...');
      const sid = await session.createSession();
      console.log('Session created with ID:', sid);
      setSessionId(sid);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError((err as Error).message);
    }
  }, [ensureSession]);

  const joinSession = useCallback(async (sid: string) => {
    try {
      const session = ensureSession();
      setError(null);
      await session.joinSession(sid);
      setSessionId(sid);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [ensureSession]);

  const sendReady = useCallback(() => {
    if (connectionState !== 'connected') return;
    setLocalReady(true);
    sessionRef.current?.sendMessage({ type: 'ready' });

    if (roleRef.current === 'host' && remoteReadyRef.current) {
      const startingPlayer: PlayerId = 'player';
      sessionRef.current?.sendMessage({ type: 'start', payload: { startingPlayer: 'enemy' } });
      dispatch({ type: 'START_ONLINE_GAME', startingPlayer });
    }
  }, [connectionState, dispatch]);

  const sendAttack = useCallback((position: Position) => {
    if (game.phase !== 'playing' || game.currentPlayer !== 'player' || isAttacking) return;
    sessionRef.current?.sendMessage({ type: 'attack', payload: position });
    dispatch({ type: 'SET_ATTACKING', attacking: true });
  }, [dispatch, game, isAttacking]);

  const resetReadyState = useCallback(() => {
    setLocalReady(false);
    setRemoteReady(false);
    localReadyRef.current = false;
    remoteReadyRef.current = false;
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setConnectionState('disconnected');
    setRole(null);
    setSessionId('');
    resetReadyState();
    setError(null);
  }, [resetReadyState]);

  /**
   * Chat transport adapter for useChat hook.
   * Delegates to the current online session's chat methods.
   */
  const chatTransport: ChatTransport = useMemo(() => ({
    connectionState,
    sendChatMessage: (payload: ChatMessagePayload) => {
      sessionRef.current?.sendChatMessage(payload);
    },
    onChatMessage: (handler: (message: ChatMessageReceived) => void) => {
      // Ensure session exists before registering handler
      const session = ensureSession();
      session.onChatMessage(handler);
    },
    offChatMessage: (handler: (message: ChatMessageReceived) => void) => {
      sessionRef.current?.offChatMessage(handler);
    },
  }), [connectionState, ensureSession]);

  return {
    connectionState,
    role,
    sessionId,
    localReady,
    remoteReady,
    error,
    createSession,
    joinSession,
    sendReady,
    sendAttack,
    disconnect,
    resetReadyState,
    chatTransport,
  };
}
