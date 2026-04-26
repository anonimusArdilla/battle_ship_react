// ─────────────────────────────────────────────────────────
// Game Context & Reducer
// Central state management for the entire game
// ─────────────────────────────────────────────────────────

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  GameState, Position, Orientation,
  ShipDefinition, Difficulty, AttackEvent, Board, UserPreferences, GameStats,
  GameMode, ConnectionStatus, OnlineState, PlayerId,
} from '../core/models';
import { createBoard, createPlacedShip, placeShipOnGrid } from '../core/grid';
import { validatePlacement, allShipsPlaced } from '../core/validation';
import { useOnline } from '../hooks/useOnline';
import { resolveAttack, allShipsSunk } from '../core/attack';
import { createAIState, updateAIState } from '../core/ai';
import type { AIState } from '../core/models';
import { placeAllShipsRandomly } from '../core/randomPlacement';
import { getPreferences, savePreferences, getStats, recordWin, recordLoss } from '../core/storage';
import { type LangCode } from '../i18n/translations';
import {
  playShot, playHit, playMiss, playSunk, playVictory, playDefeat, playPlace,
  setSoundEnabled, resumeAudio,
} from '../core/sound';

// ── Actions ──────────────────────────────────────────────

export type GameAction =
  | { type: 'PLACE_SHIP'; startPos: Position; orientation: Orientation; ship: ShipDefinition }
  | { type: 'REMOVE_SHIP'; shipId: string }
  | { type: 'RANDOMIZE_PLAYER_SHIPS' }
  | { type: 'CLEAR_PLAYER_SHIPS' }
  | { type: 'START_GAME' }
  | { type: 'START_ONLINE_GAME'; startingPlayer: PlayerId }
  | { type: 'PLAYER_ATTACK'; position: Position }
  | { type: 'AI_ATTACK_RESULT'; position: Position; result: 'hit' | 'miss' | 'sunk'; board: Board }
  | { type: 'ONLINE_ATTACK_RESULT'; board: Board; event: AttackEvent; winner: PlayerId | null }
  | { type: 'RECEIVE_ONLINE_ATTACK'; board: Board; event: AttackEvent; winner: PlayerId | null }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_THEME'; theme: 'light' | 'dark' }
  | { type: 'SET_LANGUAGE'; language: LangCode }
  | { type: 'SET_SOUND'; enabled: boolean }
  | { type: 'SET_GAME_MODE'; mode: GameMode }
  | { type: 'SET_ONLINE_STATUS'; status: ConnectionStatus; localRole: 'host' | 'guest' | null }
  | { type: 'SET_LOCAL_READY'; ready: boolean }
  | { type: 'SET_REMOTE_READY'; ready: boolean }
  | { type: 'RESTART' }
  | { type: 'SET_ORIENTATION'; orientation: Orientation }
  | { type: 'SET_ATTACKING'; attacking: boolean };

// ── Extended State ───────────────────────────────────────

export interface GameContextState {
  game: GameState;
  aiState: AIState;
  preferences: UserPreferences;
  stats: GameStats;
  orientation: Orientation;
  isAttacking: boolean;       // animation lock
  lastAttackEvent: AttackEvent | null;
  online: OnlineState;
}

// ── Initial State ────────────────────────────────────────

function createInitialState(): GameContextState {
  const prefs = getPreferences();
  setSoundEnabled(prefs.soundEnabled);

  return {
    game: {
      phase: 'setup',
      currentPlayer: 'player',
      playerBoard: createBoard(),
      enemyBoard: createBoard(),
      winner: null,
      attackHistory: [],
      turnCount: 0,
      difficulty: prefs.difficulty,
      mode: prefs.gameMode,
    },
    aiState: createAIState(),
    preferences: prefs,
    stats: getStats(),
    orientation: 'horizontal',
    isAttacking: false,
    lastAttackEvent: null,
    online: {
      connectionStatus: 'disconnected',
      localRole: null,
      localReady: false,
      remoteReady: false,
    },
  };
}

// ── Reducer ──────────────────────────────────────────────

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {

    case 'PLACE_SHIP': {
      if (state.game.phase !== 'setup') return state;
      const { startPos, orientation, ship } = action;
      const board = state.game.playerBoard;

      const validation = validatePlacement(board, startPos, ship.size, orientation);
      if (!validation.valid) return state;

      const placedShip = createPlacedShip(ship, startPos, orientation);
      const newGrid = placeShipOnGrid(board.grid, placedShip);

      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: {
            ...board,
            grid: newGrid,
            ships: [...board.ships, placedShip],
          },
        },
      };
    }

    case 'REMOVE_SHIP': {
      if (state.game.phase !== 'setup') return state;
      const board = state.game.playerBoard;
      const ship = board.ships.find(s => s.id === action.shipId);
      if (!ship) return state;

      const newGrid = board.grid.map(row =>
        row.map(cell =>
          cell.shipId === action.shipId
            ? { ...cell, state: 'empty' as const, shipId: null }
            : { ...cell }
        )
      );

      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: {
            ...board,
            grid: newGrid,
            ships: board.ships.filter(s => s.id !== action.shipId),
          },
        },
      };
    }

    case 'RANDOMIZE_PLAYER_SHIPS': {
      if (state.game.phase !== 'setup') return state;
      const newBoard = placeAllShipsRandomly();
      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: newBoard,
        },
      };
    }

    case 'CLEAR_PLAYER_SHIPS': {
      if (state.game.phase !== 'setup') return state;
      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: createBoard(),
        },
      };
    }

    case 'START_GAME': {
      if (!allShipsPlaced(state.game.playerBoard)) return state;
      if (state.game.mode === 'online') {
        return {
          ...state,
          game: {
            ...state.game,
            phase: 'playing',
            currentPlayer: state.online.localRole === 'host' ? 'player' : 'enemy',
          },
        };
      }
      const enemyBoard = placeAllShipsRandomly();
      return {
        ...state,
        game: {
          ...state.game,
          phase: 'playing',
          currentPlayer: 'player',
          enemyBoard,
        },
        aiState: createAIState(),
      };
    }

    case 'START_ONLINE_GAME': {
      if (!allShipsPlaced(state.game.playerBoard)) return state;
      return {
        ...state,
        game: {
          ...state.game,
          phase: 'playing',
          currentPlayer: action.startingPlayer,
        },
      };
    }

    case 'PLAYER_ATTACK': {
      if (state.game.phase !== 'playing' || state.game.currentPlayer !== 'player') return state;
      if (state.isAttacking) return state;

      const { position } = action;
      const { board, result, event } = resolveAttack(
        state.game.enemyBoard, position, 'player'
      );

      const newHistory = [...state.game.attackHistory, event];

      if (allShipsSunk(board)) {
        const newTurn = state.game.turnCount + 1;
        recordWin(newTurn);
        // Play sound synchronously
        if (result === 'sunk') playSunk(); else if (result === 'hit') playHit(); else playMiss();
        playVictory();
        return {
          ...state,
          game: {
            ...state.game,
            enemyBoard: board,
            attackHistory: newHistory,
            turnCount: newTurn,
            phase: 'gameover',
            winner: 'player',
          },
          lastAttackEvent: event,
          stats: getStats(),
        };
      }

      // Play result sound for non-winning attacks
      if (result === 'sunk') playSunk(); else if (result === 'hit') playHit(); else playMiss();

      return {
        ...state,
        game: {
          ...state.game,
          enemyBoard: board,
          attackHistory: newHistory,
          currentPlayer: 'enemy',
          turnCount: state.game.turnCount + 1,
        },
        isAttacking: true,
        lastAttackEvent: event,
      };
    }

    case 'AI_ATTACK_RESULT': {
      const { position, result, board } = action;
      const event: AttackEvent = {
        attacker: 'enemy',
        target: position,
        result,
        timestamp: Date.now(),
      };

      // Play result sound
      if (result === 'sunk') playSunk(); else if (result === 'hit') playHit(); else playMiss();

      const newHistory = [...state.game.attackHistory, event];
      const newAiState = updateAIState(state.aiState, position, result);

      if (allShipsSunk(board)) {
        recordLoss();
        playDefeat();
        return {
          ...state,
          game: {
            ...state.game,
            playerBoard: board,
            attackHistory: newHistory,
            phase: 'gameover',
            winner: 'enemy',
          },
          aiState: newAiState,
          isAttacking: false,
          lastAttackEvent: event,
          stats: getStats(),
        };
      }

      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: board,
          attackHistory: newHistory,
          currentPlayer: 'player',
        },
        aiState: newAiState,
        isAttacking: false,
        lastAttackEvent: event,
      };
    }

    case 'ONLINE_ATTACK_RESULT': {
      const { board, event, winner } = action;
      const newTurn = state.game.turnCount + 1;
      const nextState = {
        ...state,
        game: {
          ...state.game,
          enemyBoard: board,
          attackHistory: [...state.game.attackHistory, event],
          turnCount: newTurn,
          currentPlayer: winner ? state.game.currentPlayer : 'enemy',
          phase: winner ? 'gameover' : 'playing',
          winner: winner ?? null,
        },
        isAttacking: false,
        lastAttackEvent: event,
      } as GameContextState;

      return nextState;
    }

    case 'RECEIVE_ONLINE_ATTACK': {
      const { board, event, winner } = action;
      return {
        ...state,
        game: {
          ...state.game,
          playerBoard: board,
          attackHistory: [...state.game.attackHistory, event],
          currentPlayer: winner ? 'enemy' : 'player',
          phase: winner ? 'gameover' : 'playing',
          winner: winner ?? null,
        },
        isAttacking: false,
        lastAttackEvent: event,
      };
    }

    case 'SET_ORIENTATION':
      return { ...state, orientation: action.orientation };

    case 'SET_ATTACKING':
      return { ...state, isAttacking: action.attacking };

    case 'SET_DIFFICULTY': {
      savePreferences({ difficulty: action.difficulty });
      return {
        ...state,
        preferences: { ...state.preferences, difficulty: action.difficulty },
        game: { ...state.game, difficulty: action.difficulty },
      };
    }

    case 'SET_GAME_MODE': {
      savePreferences({ gameMode: action.mode });
      return {
        ...state,
        preferences: { ...state.preferences, gameMode: action.mode },
        game: { ...state.game, mode: action.mode },
        online: {
          connectionStatus: 'disconnected',
          localRole: null,
          localReady: false,
          remoteReady: false,
        },
      };
    }

    case 'SET_ONLINE_STATUS': {
      return {
        ...state,
        online: {
          ...state.online,
          connectionStatus: action.status,
          localRole: action.localRole,
        },
      };
    }

    case 'SET_LOCAL_READY': {
      return {
        ...state,
        online: {
          ...state.online,
          localReady: action.ready,
        },
      };
    }

    case 'SET_REMOTE_READY': {
      return {
        ...state,
        online: {
          ...state.online,
          remoteReady: action.ready,
        },
      };
    }

    case 'SET_THEME': {
      savePreferences({ theme: action.theme });
      return {
        ...state,
        preferences: { ...state.preferences, theme: action.theme },
      };
    }

    case 'SET_LANGUAGE': {
      savePreferences({ language: action.language });
      return {
        ...state,
        preferences: { ...state.preferences, language: action.language },
      };
    }

    case 'SET_SOUND': {
      savePreferences({ soundEnabled: action.enabled });
      setSoundEnabled(action.enabled);
      return {
        ...state,
        preferences: { ...state.preferences, soundEnabled: action.enabled },
      };
    }

    case 'RESTART': {
      const prefs = getPreferences();
      const baseState = createInitialState();
      const onlineState = state.preferences.gameMode === 'online'
        ? { ...state.online, localReady: false, remoteReady: false }
        : baseState.online;
      return {
        ...baseState,
        preferences: prefs,
        stats: getStats(),
        online: onlineState,
      };
    }

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────

interface GameContextValue {
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
  // Convenience actions
  placeShip: (startPos: Position, orientation: Orientation, ship: ShipDefinition) => void;
  removeShip: (shipId: string) => void;
  randomizeShips: () => void;
  clearShips: () => void;
  startGame: () => void;
  playerAttack: (position: Position) => void;
  setOrientation: (orientation: Orientation) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: LangCode) => void;
  setSound: (enabled: boolean) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setGameMode: (mode: GameMode) => void;
  restart: () => void;
  online: {
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
  };
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const onlineApi = useOnline({
    gameMode: state.preferences.gameMode,
    game: state.game,
    isAttacking: state.isAttacking,
    dispatch,
  });

  const placeShip = useCallback((startPos: Position, orientation: Orientation, ship: ShipDefinition) => {
    resumeAudio();
    playPlace();
    dispatch({ type: 'PLACE_SHIP', startPos, orientation, ship });
  }, []);

  const removeShip = useCallback((shipId: string) => {
    dispatch({ type: 'REMOVE_SHIP', shipId });
  }, []);

  const randomizeShips = useCallback(() => {
    resumeAudio();
    playPlace();
    dispatch({ type: 'RANDOMIZE_PLAYER_SHIPS' });
  }, []);

  const clearShips = useCallback(() => {
    dispatch({ type: 'CLEAR_PLAYER_SHIPS' });
  }, []);

  const startGame = useCallback(() => {
    resumeAudio();
    dispatch({ type: 'START_GAME' });
  }, []);

  const playerAttack = useCallback((position: Position) => {
    resumeAudio();
    playShot();
    dispatch({ type: 'PLAYER_ATTACK', position });
  }, []);

  const setOrientation = useCallback((orientation: Orientation) => {
    dispatch({ type: 'SET_ORIENTATION', orientation });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  const setLanguage = useCallback((language: LangCode) => {
    dispatch({ type: 'SET_LANGUAGE', language });
  }, []);

  const setSound = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_SOUND', enabled });
  }, []);

  const setDifficulty = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'SET_DIFFICULTY', difficulty });
  }, []);

  const setGameMode = useCallback((mode: GameMode) => {
    dispatch({ type: 'SET_GAME_MODE', mode });
  }, []);

  const restart = useCallback(() => {
    if (state.preferences.gameMode === 'online') {
      onlineApi.resetReadyState();
    }
    dispatch({ type: 'RESTART' });
  }, [onlineApi, state.preferences.gameMode]);

  const value: GameContextValue = {
    state,
    dispatch,
    placeShip,
    removeShip,
    randomizeShips,
    clearShips,
    startGame,
    playerAttack,
    setOrientation,
    setTheme,
    setLanguage,
    setSound,
    setDifficulty,
    setGameMode,
    restart,
    online: {
      connectionState: onlineApi.connectionState,
      role: onlineApi.role,
      sessionId: onlineApi.sessionId,
      localReady: onlineApi.localReady,
      remoteReady: onlineApi.remoteReady,
      error: onlineApi.error,
      createSession: onlineApi.createSession,
      joinSession: onlineApi.joinSession,
      sendReady: onlineApi.sendReady,
      sendAttack: onlineApi.sendAttack,
      disconnect: onlineApi.disconnect,
      resetReadyState: onlineApi.resetReadyState,
    },
  };

  return React.createElement(GameContext.Provider, { value }, children);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
