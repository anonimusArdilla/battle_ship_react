// ─────────────────────────────────────────────────────────
// AI Opponent Logic
// Hunt/Target algorithm with difficulty scaling
// ─────────────────────────────────────────────────────────

import type { Board, Position, AIState, Difficulty, AttackResult } from './models';
import { GRID_SIZE, AI_CONFIG } from './constants';
import { posKey, isInBounds } from './grid';

/** Create initial AI state */
export function createAIState(): AIState {
  return {
    mode: 'hunt',
    targetQueue: [],
    lastHit: null,
    hitChain: [],
  };
}

/** Get all valid attack positions (not yet attacked) */
function getValidTargets(board: Board): Position[] {
  const targets: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!board.shotsReceived.has(posKey({ row, col }))) {
        targets.push({ row, col });
      }
    }
  }
  return targets;
}

/** Get adjacent cells (up, down, left, right) */
function getAdjacentCells(pos: Position): Position[] {
  return [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ].filter(isInBounds);
}

/** Get smart adjacent targets based on hit chain */
function getSmartTargets(hitChain: Position[], board: Board): Position[] {
  if (hitChain.length === 0) return [];

  const candidates = new Set<string>();
  
  // If we have multiple hits, determine the line direction
  if (hitChain.length >= 2) {
    const sameRow = hitChain.every(p => p.row === hitChain[0].row);
    const sameCol = hitChain.every(p => p.col === hitChain[0].col);

    if (sameRow) {
      // Continue in horizontal direction
      const cols = hitChain.map(p => p.col).sort((a, b) => a - b);
      const leftCol = cols[0] - 1;
      const rightCol = cols[cols.length - 1] + 1;
      if (leftCol >= 0) candidates.add(posKey({ row: hitChain[0].row, col: leftCol }));
      if (rightCol < GRID_SIZE) candidates.add(posKey({ row: hitChain[0].row, col: rightCol }));
    } else if (sameCol) {
      // Continue in vertical direction
      const rows = hitChain.map(p => p.row).sort((a, b) => a - b);
      const topRow = rows[0] - 1;
      const bottomRow = rows[rows.length - 1] + 1;
      if (topRow >= 0) candidates.add(posKey({ row: topRow, col: hitChain[0].col }));
      if (bottomRow < GRID_SIZE) candidates.add(posKey({ row: bottomRow, col: hitChain[0].col }));
    } else {
      // Mixed — try all adjacents of all hits
      for (const hit of hitChain) {
        for (const adj of getAdjacentCells(hit)) {
          candidates.add(posKey(adj));
        }
      }
    }
  } else {
    // Single hit — try all 4 adjacents
    for (const adj of getAdjacentCells(hitChain[0])) {
      candidates.add(posKey(adj));
    }
  }

  // Filter to unattacked cells
  return [...candidates]
    .filter(key => !board.shotsReceived.has(key))
    .map(key => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    });
}

/** Checkerboard pattern for hunt mode (hard difficulty) */
function getParityTargets(board: Board): Position[] {
  const targets: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Checkerboard: (row + col) % 2 === 0
      if ((row + col) % 2 === 0 && !board.shotsReceived.has(posKey({ row, col }))) {
        targets.push({ row, col });
      }
    }
  }
  return targets;
}

/** Choose the next AI target */
export function chooseAITarget(
  board: Board,
  aiState: AIState,
  difficulty: Difficulty
): { target: Position; newState: AIState } {
  const config = AI_CONFIG[difficulty];
  let newState = { ...aiState, targetQueue: [...aiState.targetQueue], hitChain: [...aiState.hitChain] };

  // TARGET MODE: we have hits to follow up on
  if (newState.mode === 'target' && newState.hitChain.length > 0) {
    // Get smart adjacent targets
    let smartTargets = getSmartTargets(newState.hitChain, board);

    // Filter out already-queued targets that are already attacked
    smartTargets = smartTargets.filter(t => !board.shotsReceived.has(posKey(t)));

    if (smartTargets.length > 0) {
      const target = smartTargets[0];
      return { target, newState };
    } else {
      // No valid targets around hits — switch back to hunt
      newState.mode = 'hunt';
      newState.hitChain = [];
      newState.targetQueue = [];
    }
  }

  // HUNT MODE: pick a random cell
  let candidates: Position[];

  if (config.useParity && difficulty === 'hard') {
    candidates = getParityTargets(board);
    if (candidates.length === 0) {
      candidates = getValidTargets(board); // fallback
    }
  } else {
    candidates = getValidTargets(board);
  }

  if (candidates.length === 0) {
    // Should not happen in a valid game
    throw new Error('No valid targets available');
  }

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  return { target, newState };
}

/** Update AI state after an attack result */
export function updateAIState(
  aiState: AIState,
  target: Position,
  result: AttackResult
): AIState {
  const newState = {
    ...aiState,
    targetQueue: [...aiState.targetQueue],
    hitChain: [...aiState.hitChain],
  };

  if (result === 'hit') {
    newState.mode = 'target';
    newState.lastHit = target;
    newState.hitChain.push(target);
  } else if (result === 'sunk') {
    // Ship destroyed — reset target mode
    newState.mode = 'hunt';
    newState.hitChain = [];
    newState.targetQueue = [];
    newState.lastHit = null;
  }
  // 'miss' → keep current mode

  return newState;
}
