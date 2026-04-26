// ─────────────────────────────────────────────────────────
// Battleship Core Models
// All types and interfaces for the game domain
// ─────────────────────────────────────────────────────────

/** Unique identifier for a ship */
export type ShipId = string;

/** Unique identifier for a player */
export type PlayerId = 'player' | 'enemy';

/** Possible states of a single cell on the grid */
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

/** Orientation for ship placement */
export type Orientation = 'horizontal' | 'vertical';

/** Result of an attack action */
export type AttackResult = 'hit' | 'miss' | 'sunk';

/** Game phases */
export type GamePhase = 
  | 'setup'      // Player placing ships
  | 'playing'    // Active gameplay
  | 'gameover';  // Game finished

/** Difficulty levels */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Game modes */
export type GameMode = 'ai' | 'online';

/** Online connection states */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/** Coordinates on the grid */
export interface Position {
  row: number;
  col: number;
}

/** Ship definition (template) */
export interface ShipDefinition {
  id: ShipId;
  name: string;         // i18n key
  size: number;
  icon: string;         // emoji representation
}

/** A placed ship instance on the board */
export interface PlacedShip {
  id: ShipId;
  definition: ShipDefinition;
  positions: Position[];
  orientation: Orientation;
  hits: Set<string>;     // Set of "row,col" strings that were hit
  isSunk: boolean;
}

/** A single cell on the grid */
export interface Cell {
  position: Position;
  state: CellState;
  shipId: ShipId | null;
}

/** The 10x10 grid board */
export type Grid = Cell[][];

/** Board state for one player */
export interface Board {
  grid: Grid;
  ships: PlacedShip[];
  shotsReceived: Set<string>;  // positions attacked as "row,col"
}

/** State of a single attack for animation/feedback */
export interface AttackEvent {
  attacker: PlayerId;
  target: Position;
  result: AttackResult;
  shipId?: ShipId;
  timestamp: number;
}

/** Full game state */
export interface GameState {
  phase: GamePhase;
  currentPlayer: PlayerId;
  playerBoard: Board;
  enemyBoard: Board;
  winner: PlayerId | null;
  attackHistory: AttackEvent[];
  turnCount: number;
  difficulty: Difficulty;
  mode: GameMode;
}

/** Online state for the current session */
export interface OnlineState {
  connectionStatus: ConnectionStatus;
  localRole: 'host' | 'guest' | null;
  localReady: boolean;
  remoteReady: boolean;
}

/** User preferences stored in localStorage */
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  difficulty: Difficulty;
  soundEnabled: boolean;
  gameMode: GameMode;
}

/** Game statistics */
export interface GameStats {
  wins: number;
  losses: number;
  totalGames: number;
  bestTurnCount: number | null;
}

/** Ship placement validation result */
export interface PlacementValidation {
  valid: boolean;
  reason?: string;
}

/** AI state for tracking hunt/target mode */
export interface AIState {
  mode: 'hunt' | 'target';
  targetQueue: Position[];
  lastHit: Position | null;
  hitChain: Position[];
}
