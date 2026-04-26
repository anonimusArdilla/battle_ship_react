// ─────────────────────────────────────────────────────────
// Attack Resolution Engine
// Pure functions for resolving attacks
// ─────────────────────────────────────────────────────────

import type { Board, Position, AttackResult, AttackEvent, PlayerId } from './models';
import { posKey, cloneBoard } from './grid';

/** Resolve an attack on a board. Returns [updatedBoard, result, sunkShipId?] */
export function resolveAttack(
  board: Board,
  target: Position,
  attacker: PlayerId
): { board: Board; result: AttackResult; sunkShipId?: string; event: AttackEvent } {
  const newBoard = cloneBoard(board);
  const key = posKey(target);

  // Already attacked this cell?
  if (newBoard.shotsReceived.has(key)) {
    throw new Error(`Cell ${key} already attacked`);
  }

  newBoard.shotsReceived.add(key);
  const cell = newBoard.grid[target.row][target.col];

  if (cell.shipId) {
    // HIT
    cell.state = 'hit';
    const ship = newBoard.ships.find(s => s.id === cell.shipId);
    if (ship) {
      ship.hits.add(key);
      ship.isSunk = ship.hits.size === ship.definition.size;

      if (ship.isSunk) {
        // Mark all ship cells as sunk
        for (const pos of ship.positions) {
          newBoard.grid[pos.row][pos.col].state = 'sunk';
        }
        return {
          board: newBoard,
          result: 'sunk',
          sunkShipId: ship.id,
          event: {
            attacker,
            target,
            result: 'sunk',
            shipId: ship.id,
            timestamp: Date.now(),
          },
        };
      }
    }

    return {
      board: newBoard,
      result: 'hit',
      event: {
        attacker,
        target,
        result: 'hit',
        shipId: cell.shipId,
        timestamp: Date.now(),
      },
    };
  } else {
    // MISS
    cell.state = 'miss';
    return {
      board: newBoard,
      result: 'miss',
      event: {
        attacker,
        target,
        result: 'miss',
        timestamp: Date.now(),
      },
    };
  }
}

/** Check if all ships on a board are sunk */
export function allShipsSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(s => s.isSunk);
}

/** Count remaining (non-sunk) ships */
export function countRemainingShips(board: Board): number {
  return board.ships.filter(s => !s.isSunk).length;
}

/** Get remaining ship sizes for display */
export function getRemainingShipSizes(board: Board): number[] {
  return board.ships.filter(s => !s.isSunk).map(s => s.definition.size);
}
