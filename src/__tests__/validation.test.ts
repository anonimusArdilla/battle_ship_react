// ─────────────────────────────────────────────────────────
// Unit Tests: Ship Placement Validation
// ─────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { validatePlacement, allShipsPlaced, getNextShipToPlace } from '../core/validation';
import { createBoard, createPlacedShip, placeShipOnGrid } from '../core/grid';
import { SHIPS } from '../core/constants';
import type { Orientation } from '../core/models';

describe('validatePlacement', () => {
  it('should accept valid horizontal placement', () => {
    const board = createBoard();
    const result = validatePlacement(board, { row: 0, col: 0 }, 3, 'horizontal');
    expect(result.valid).toBe(true);
  });

  it('should accept valid vertical placement', () => {
    const board = createBoard();
    const result = validatePlacement(board, { row: 0, col: 0 }, 3, 'vertical');
    expect(result.valid).toBe(true);
  });

  it('should reject placement going out of bounds horizontally', () => {
    const board = createBoard();
    const result = validatePlacement(board, { row: 0, col: 8 }, 5, 'horizontal');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('validation.outOfBounds');
  });

  it('should reject placement going out of bounds vertically', () => {
    const board = createBoard();
    const result = validatePlacement(board, { row: 8, col: 0 }, 5, 'vertical');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('validation.outOfBounds');
  });

  it('should reject overlapping ships', () => {
    let board = createBoard();
    const ship1 = createPlacedShip(SHIPS[0], { row: 0, col: 0 }, 'horizontal');
    board = {
      ...board,
      grid: placeShipOnGrid(board.grid, ship1),
      ships: [ship1],
    };

    const result = validatePlacement(board, { row: 0, col: 0 }, 3, 'horizontal');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('validation.overlap');
  });

  it('should accept adjacent (non-overlapping) ships', () => {
    let board = createBoard();
    const ship1 = createPlacedShip(SHIPS[0], { row: 0, col: 0 }, 'horizontal');
    board = {
      ...board,
      grid: placeShipOnGrid(board.grid, ship1),
      ships: [ship1],
    };

    // Place next ship below the first one
    const result = validatePlacement(board, { row: 1, col: 0 }, 3, 'horizontal');
    expect(result.valid).toBe(true);
  });
});

describe('allShipsPlaced', () => {
  it('should return false for empty board', () => {
    const board = createBoard();
    expect(allShipsPlaced(board)).toBe(false);
  });

  it('should return true when all ships are placed', () => {
    let board = createBoard();
    for (const ship of SHIPS) {
      const placed = createPlacedShip(ship, { row: board.ships.length, col: 0 }, 'horizontal');
      board = {
        ...board,
        grid: placeShipOnGrid(board.grid, placed),
        ships: [...board.ships, placed],
      };
    }
    expect(allShipsPlaced(board)).toBe(true);
  });
});

describe('getNextShipToPlace', () => {
  it('should return the first ship for empty board', () => {
    const board = createBoard();
    const next = getNextShipToPlace(board);
    expect(next).not.toBeNull();
    expect(next!.id).toBe('carrier');
  });

  it('should return null when all ships are placed', () => {
    let board = createBoard();
    for (const ship of SHIPS) {
      const placed = createPlacedShip(ship, { row: board.ships.length, col: 0 }, 'horizontal');
      board = {
        ...board,
        grid: placeShipOnGrid(board.grid, placed),
        ships: [...board.ships, placed],
      };
    }
    expect(getNextShipToPlace(board)).toBeNull();
  });
});
