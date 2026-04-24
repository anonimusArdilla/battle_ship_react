// ─────────────────────────────────────────────────────────
// Game Constants
// ─────────────────────────────────────────────────────────

import type { ShipDefinition } from './models';

export const GRID_SIZE = 10;

/** Standard Battleship fleet */
export const SHIPS: ShipDefinition[] = [
  { id: 'carrier',    name: 'ships.carrier',    size: 5, icon: '🚢' },
  { id: 'battleship', name: 'ships.battleship', size: 4, icon: '⛴️' },
  { id: 'cruiser',    name: 'ships.cruiser',    size: 3, icon: '🛥️' },
  { id: 'submarine',  name: 'ships.submarine',  size: 3, icon: '🔱' },
  { id: 'destroyer',  name: 'ships.destroyer',  size: 2, icon: '🚤' },
];

/** Column labels for the grid */
export const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/** Row labels for the grid */
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/** AI attack delay in ms */
export const AI_DELAY_MS = 600;

/** Attack animation duration in ms */
export const ATTACK_ANIM_MS = 400;

/** AI difficulty settings */
export const AI_CONFIG = {
  easy: {
    huntProbability: 0.7,     // chance of random shot even in target mode
    targetDepth: 2,           // how many adjacent cells to check
  },
  medium: {
    huntProbability: 0.0,
    targetDepth: 4,
  },
  hard: {
    huntProbability: 0.0,
    targetDepth: 8,
    useParity: true,          // checkerboard pattern in hunt mode
  },
} as const;

/** Cell size in pixels (responsive via CSS, this is base) */
export const CELL_SIZE = 40;

/** Local storage keys */
export const STORAGE_KEYS = {
  preferences: 'battleship_preferences',
  stats: 'battleship_stats',
} as const;
