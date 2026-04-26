// ─────────────────────────────────────────────────────────
// Ship Placement Validation
// Pure functions for validating ship placements
// ─────────────────────────────────────────────────────────

import type { Position, Orientation, PlacementValidation, Board } from './models';
import { GRID_SIZE, SHIPS } from './constants';
import { getShipPositions, isInBounds, posKey } from './grid';

/** Validate a ship placement on a board */
export function validatePlacement(
  board: Board,
  startPos: Position,
  size: number,
  orientation: Orientation,
  excludeShipId?: string
): PlacementValidation {
  const positions = getShipPositions(startPos, size, orientation);

  // Check bounds
  for (const pos of positions) {
    if (!isInBounds(pos)) {
      return { valid: false, reason: 'validation.outOfBounds' };
    }
  }

  // Check overlap
  const occupied = new Set<string>();
  for (const ship of board.ships) {
    if (ship.id === excludeShipId) continue;
    for (const pos of ship.positions) {
      occupied.add(posKey(pos));
    }
  }

  for (const pos of positions) {
    if (occupied.has(posKey(pos))) {
      return { valid: false, reason: 'validation.overlap' };
    }
  }

  return { valid: true };
}

/** Check if all ships are placed */
export function allShipsPlaced(board: Board): boolean {
  return board.ships.length === SHIPS.length;
}

/** Check if a ship with given ID is already placed */
export function isShipPlaced(board: Board, shipId: string): boolean {
  return board.ships.some(s => s.id === shipId);
}

/** Get the next ship that needs to be placed */
export function getNextShipToPlace(board: Board): typeof SHIPS[number] | null {
  for (const ship of SHIPS) {
    if (!isShipPlaced(board, ship.id)) {
      return ship;
    }
  }
  return null;
}

/** Get all valid positions for a given ship on the board */
export function getValidPositions(
  board: Board,
  size: number,
  orientation: Orientation
): Position[] {
  const valid: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const result = validatePlacement(board, { row, col }, size, orientation);
      if (result.valid) {
        valid.push({ row, col });
      }
    }
  }
  return valid;
}

/** Preview positions for a ship being placed (for hover effect) */
export function getPreviewPositions(
  startPos: Position,
  size: number,
  orientation: Orientation
): Position[] {
  return getShipPositions(startPos, size, orientation);
}
