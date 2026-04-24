// ─────────────────────────────────────────────────────────
// Grid Factory
// Pure functions for creating and manipulating grids
// ─────────────────────────────────────────────────────────

import type { Position, Orientation, PlacedShip, ShipDefinition, Board, CellState, Cell, Grid } from './models';
import { GRID_SIZE } from './constants';

/** Create an empty cell */
export function createCell(row: number, col: number): Cell {
  return {
    position: { row, col },
    state: 'empty',
    shipId: null,
  };
}

/** Create an empty 10x10 grid */
export function createGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => createCell(row, col))
  );
}

/** Create an empty board */
export function createBoard(): Board {
  return {
    grid: createGrid(),
    ships: [],
    shotsReceived: new Set(),
  };
}

/** Position to string key for Set/Map usage */
export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

/** String key back to Position */
export function keyToPos(key: string): Position {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/** Get all positions a ship would occupy */
export function getShipPositions(
  start: Position,
  size: number,
  orientation: Orientation
): Position[] {
  const positions: Position[] = [];
  for (let i = 0; i < size; i++) {
    positions.push({
      row: orientation === 'vertical' ? start.row + i : start.row,
      col: orientation === 'horizontal' ? start.col + i : start.col,
    });
  }
  return positions;
}

/** Check if a position is within grid bounds */
export function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
}

/** Place a ship on the grid (mutates grid in place) */
export function placeShipOnGrid(
  grid: Grid,
  ship: PlacedShip
): Grid {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  for (const pos of ship.positions) {
    newGrid[pos.row][pos.col] = {
      ...newGrid[pos.row][pos.col],
      state: 'ship',
      shipId: ship.id,
    };
  }
  return newGrid;
}

/** Create a PlacedShip from definition + placement params */
export function createPlacedShip(
  definition: ShipDefinition,
  startPos: Position,
  orientation: Orientation
): PlacedShip {
  return {
    id: definition.id,
    definition,
    positions: getShipPositions(startPos, definition.size, orientation),
    orientation,
    hits: new Set(),
    isSunk: false,
  };
}

/** Check if all cells of a ship are hit → sunk */
export function checkIfSunk(ship: PlacedShip): boolean {
  return ship.hits.size === ship.definition.size;
}

/** Get cell display state considering both boards */
export function getDisplayState(cell: Cell, isOwnerBoard: boolean): CellState {
  if (cell.state === 'ship' && !isOwnerBoard) {
    return 'empty'; // hide enemy ships
  }
  return cell.state;
}

/** Deep clone a board */
export function cloneBoard(board: Board): Board {
  return {
    grid: board.grid.map(row =>
      row.map(cell => ({ ...cell }))
    ),
    ships: board.ships.map(ship => ({
      ...ship,
      hits: new Set(ship.hits),
      positions: [...ship.positions],
    })),
    shotsReceived: new Set(board.shotsReceived),
  };
}
