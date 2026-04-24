// ─────────────────────────────────────────────────────────
// Grid Component
// Renders a 10x10 battleship grid with labels
// ─────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import type { Position, Orientation, ShipDefinition, Board, CellState } from '../../core/models';
import { GRID_SIZE, COL_LABELS, ROW_LABELS } from '../../core/constants';
import { posKey, isInBounds, getShipPositions } from '../../core/grid';
import { validatePlacement } from '../../core/validation';
import { useGame } from '../../context/GameContext';
import { t } from '../../i18n/translations';
import './Grid.css';

interface GridProps {
  board: Board;
  isOwner: boolean;          // true = player's own grid, false = enemy grid
  showShips: boolean;        // whether to show ship cells
  onCellClick?: (pos: Position) => void;
  interactive: boolean;
  // Setup mode props
  setupMode?: boolean;
  currentShip?: ShipDefinition | null;
  orientation?: Orientation;
}

export function Grid({
  board,
  isOwner,
  showShips,
  onCellClick,
  interactive,
  setupMode,
  currentShip,
  orientation,
}: GridProps) {
  const { state } = useGame();
  const lang = state.preferences.language as any;
  const [hoverPos, setHoverPos] = useState<Position | null>(null);

  // Compute preview positions for setup mode
  const previewPositions = React.useMemo(() => {
    if (!setupMode || !currentShip || !hoverPos) return { valid: false, positions: [] as Position[] };
    const positions = getShipPositions(hoverPos, currentShip.size, orientation || 'horizontal');
    const allInBounds = positions.every(isInBounds);
    if (!allInBounds) return { valid: false, positions };

    const validation = validatePlacement(board, hoverPos, currentShip.size, orientation || 'horizontal');
    return { valid: validation.valid, positions };
  }, [setupMode, currentShip, hoverPos, orientation, board]);

  const handleCellClick = useCallback((pos: Position) => {
    if (!interactive || !onCellClick) return;
    onCellClick(pos);
  }, [interactive, onCellClick]);

  const handleMouseEnter = useCallback((pos: Position) => {
    setHoverPos(pos);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
  }, []);

  const getCellClass = (row: number, col: number): string => {
    const cell = board.grid[row][col];
    const pos = { row, col };
    const classes = ['cell'];

    // Base state
    if (cell.state === 'hit') classes.push('cell-hit');
    else if (cell.state === 'miss') classes.push('cell-miss');
    else if (cell.state === 'sunk') classes.push('cell-sunk');
    else if (cell.state === 'ship' && showShips) classes.push('cell-ship');
    else classes.push('cell-water');

    // Interactive
    if (interactive) classes.push('cell-interactive');

    // Preview (setup mode)
    if (setupMode && previewPositions.positions.some(p => p.row === row && p.col === col)) {
      classes.push(previewPositions.valid ? 'cell-preview-valid' : 'cell-preview-invalid');
    }

    // Hover
    if (interactive && hoverPos?.row === row && hoverPos?.col === col) {
      classes.push('cell-hover');
    }

    // Ship segment styling
    if (cell.shipId && showShips && cell.state !== 'hit' && cell.state !== 'sunk') {
      const ship = board.ships.find(s => s.id === cell.shipId);
      if (ship) {
        const idx = ship.positions.findIndex(p => p.row === row && p.col === col);
        if (idx === 0) classes.push('ship-start');
        if (idx === ship.positions.length - 1) classes.push('ship-end');
        if (ship.orientation === 'horizontal') classes.push('ship-h');
        else classes.push('ship-v');
      }
    }

    return classes.join(' ');
  };

  const getCellContent = (row: number, col: number): React.ReactNode => {
    const cell = board.grid[row][col];
    if (cell.state === 'hit') return <span className="marker hit-marker">💥</span>;
    if (cell.state === 'miss') return <span className="marker miss-marker">•</span>;
    if (cell.state === 'sunk') return <span className="marker sunk-marker">🔥</span>;
    if (cell.state === 'ship' && showShips) {
      const ship = board.ships.find(s => s.id === cell.shipId);
      return ship ? <span className="ship-icon">{ship.definition.icon}</span> : null;
    }
    return null;
  };

  return (
    <div className="grid-wrapper">
      {/* Column labels */}
      <div className="grid-labels-row">
        <div className="grid-corner" />
        {COL_LABELS.map(label => (
          <div key={label} className="grid-label col-label">{label}</div>
        ))}
      </div>

      {/* Grid rows */}
      {Array.from({ length: GRID_SIZE }, (_, row) => (
        <div key={row} className="grid-row">
          <div className="grid-label row-label">{ROW_LABELS[row]}</div>
          {Array.from({ length: GRID_SIZE }, (_, col) => (
            <div
              key={`${row}-${col}`}
              className={getCellClass(row, col)}
              onClick={() => handleCellClick({ row, col })}
              onMouseEnter={() => handleMouseEnter({ row, col })}
              onMouseLeave={handleMouseLeave}
              data-pos={`${row},${col}`}
            >
              {getCellContent(row, col)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
