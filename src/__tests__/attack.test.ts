// ─────────────────────────────────────────────────────────
// Unit Tests: Attack Logic
// ─────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { resolveAttack, allShipsSunk, countRemainingShips } from '../core/attack';
import { createBoard, createPlacedShip, placeShipOnGrid } from '../core/grid';
import { SHIPS } from '../core/constants';

function createBoardWithShip() {
  let board = createBoard();
  const ship = createPlacedShip(SHIPS[4], { row: 0, col: 0 }, 'horizontal'); // Destroyer (size 2)
  board = {
    ...board,
    grid: placeShipOnGrid(board.grid, ship),
    ships: [ship],
  };
  return { board, ship };
}

describe('resolveAttack', () => {
  it('should return "miss" for empty cell', () => {
    const board = createBoard();
    const { result } = resolveAttack(board, { row: 5, col: 5 }, 'player');
    expect(result).toBe('miss');
  });

  it('should return "hit" for ship cell', () => {
    const { board } = createBoardWithShip();
    const { result } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    expect(result).toBe('hit');
  });

  it('should return "sunk" when all ship cells are hit', () => {
    const { board } = createBoardWithShip();
    const { board: b1 } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    const { result, sunkShipId } = resolveAttack(b1, { row: 0, col: 1 }, 'player');
    expect(result).toBe('sunk');
    expect(sunkShipId).toBe('destroyer');
  });

  it('should throw when attacking same cell twice', () => {
    const board = createBoard();
    const { board: b1 } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    expect(() => resolveAttack(b1, { row: 0, col: 0 }, 'player')).toThrow();
  });

  it('should mark cells as "sunk" when ship is destroyed', () => {
    const { board } = createBoardWithShip();
    const { board: b1 } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    const { board: b2 } = resolveAttack(b1, { row: 0, col: 1 }, 'player');
    expect(b2.grid[0][0].state).toBe('sunk');
    expect(b2.grid[0][1].state).toBe('sunk');
  });
});

describe('allShipsSunk', () => {
  it('should return false when no ships are sunk', () => {
    const { board } = createBoardWithShip();
    expect(allShipsSunk(board)).toBe(false);
  });

  it('should return true when all ships are sunk', () => {
    const { board } = createBoardWithShip();
    const { board: b1 } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    const { board: b2 } = resolveAttack(b1, { row: 0, col: 1 }, 'player');
    expect(allShipsSunk(b2)).toBe(true);
  });
});

describe('countRemainingShips', () => {
  it('should return total ships when none sunk', () => {
    const { board } = createBoardWithShip();
    expect(countRemainingShips(board)).toBe(1);
  });

  it('should return 0 when all sunk', () => {
    const { board } = createBoardWithShip();
    const { board: b1 } = resolveAttack(board, { row: 0, col: 0 }, 'player');
    const { board: b2 } = resolveAttack(b1, { row: 0, col: 1 }, 'player');
    expect(countRemainingShips(b2)).toBe(0);
  });
});
