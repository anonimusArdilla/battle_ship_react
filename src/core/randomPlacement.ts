// ─────────────────────────────────────────────────────────
// Random Ship Placement (for AI and quick-start)
// ─────────────────────────────────────────────────────────

import type { Board, Orientation, PlacedShip, ShipDefinition } from './models';
import { GRID_SIZE, SHIPS } from './constants';
import { createPlacedShip, placeShipOnGrid, createBoard } from './grid';
import { validatePlacement } from './validation';

/** Place a single ship randomly on a board */
function placeShipRandomly(
  board: Board,
  definition: ShipDefinition
): Board | null {
  const orientations: Orientation[] = ['horizontal', 'vertical'];
  const attempts = 200;

  for (let i = 0; i < attempts; i++) {
    const orientation = orientations[Math.floor(Math.random() * 2)];
    const maxRow = orientation === 'vertical' ? GRID_SIZE - definition.size : GRID_SIZE - 1;
    const maxCol = orientation === 'horizontal' ? GRID_SIZE - definition.size : GRID_SIZE - 1;

    const row = Math.floor(Math.random() * (maxRow + 1));
    const col = Math.floor(Math.random() * (maxCol + 1));
    const startPos = { row, col };

    const validation = validatePlacement(board, startPos, definition.size, orientation);
    if (validation.valid) {
      const ship = createPlacedShip(definition, startPos, orientation);
      const newGrid = placeShipOnGrid(board.grid, ship);
      return {
        ...board,
        grid: newGrid,
        ships: [...board.ships, ship],
      };
    }
  }

  return null; // Failed to place (shouldn't happen with standard fleet)
}

/** Place all ships randomly on a new board */
export function placeAllShipsRandomly(): Board {
  let board = createBoard();

  for (const shipDef of SHIPS) {
    const result = placeShipRandomly(board, shipDef);
    if (!result) {
      // Retry from scratch (extremely rare)
      return placeAllShipsRandomly();
    }
    board = result;
  }

  return board;
}
