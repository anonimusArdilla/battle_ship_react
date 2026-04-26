// ─────────────────────────────────────────────────────────
// Online game hook
// Manages WebSocket session state and partner communication
// ─────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, Position, GameMode, ConnectionStatus, PlayerId } from '../core/models';
import type { OnlineSession as RemoteOnlineSession, OnlineMessage } from '../core/online';
import { OnlineSession } from '../core/online';
import { resolveAttack, allShipsSunk } from '../core/attack';

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
}

interface UseOnlineParams {
  gameMode: GameMode;
  game: GameState;
  isAttacking: boolean;
  dispatch: React.Dispatch<any>;
}

export function useOnline({ gameMode, game, isAttacking, dispatch }: UseOnlineParams): OnlineApi {
  const sessionRef = useRef<RemoteOnlineSession | null>(null);
  const stateRef = useRef<GameState>(game);
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

  const handleRemoteMessage = useCallback((message: OnlineMessage) => {
    if (message.type === 'ready') {
      setRemoteReady(true);
      if (role === 'host' && localReady) {
        const startingPlayer: PlayerId = 'player';
        sessionRef.current?.sendMessage({ type: 'start', payload: { startingPlayer } });
        dispatch({ type: 'START_ONLINE_GAME', startingPlayer });
      }
      return;
    }

    if (message.type === 'start') {
      dispatch({ type: 'START_ONLINE_GAME', startingPlayer: (message as any).payload.startingPlayer });
      return;
    }

    if (message.type === 'attack') {
      const currentState = stateRef.current;
      if (currentState.phase !== 'playing') return;

      const result = resolveAttack(currentState.playerBoard, (message as any).payload, 'enemy');
      const winner = allShipsSunk(result.board) ? 'enemy' : null;
      dispatch({
        type: 'RECEIVE_ONLINE_ATTACK',
        board: result.board,
        event: result.event,
        winner,
      });

      sessionRef.current?.sendMessage({
        type: 'attackResult',
        payload: {
          row: (message as any).payload.row,
          col: (message as any).payload.col,
          result: result.result,
          shipId: result.sunkShipId,
          winner: winner ?? undefined,
        },
      });
      return;
    }

    if (message.type === 'attackResult') {
      const payload = (message as any).payload;
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
    }
    return sessionRef.current;
  }, [handleRemoteMessage]);

  const createSession = useCallback(async () => {
    try {
      const session = ensureSession();
      setError(null);
      const sid = await session.createSession();
      setSessionId(sid);
    } catch (err) {
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
  }, [connectionState]);

  const sendAttack = useCallback((position: Position) => {
    if (game.phase !== 'playing' || game.currentPlayer !== 'player' || isAttacking) return;
    sessionRef.current?.sendMessage({ type: 'attack', payload: position });
    dispatch({ type: 'SET_ATTACKING', attacking: true });
  }, [dispatch, game, isAttacking]);

  const disconnect = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setConnectionState('disconnected');
    setRole(null);
    setSessionId('');
    setLocalReady(false);
    setRemoteReady(false);
    setError(null);
  }, []);

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
  };
}
