// ─────────────────────────────────────────────────────────
// Battleship App — Main Game Board
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Grid } from './components/game/Grid';
import { SetupPanel } from './components/game/SetupPanel';
import { GameHUD } from './components/game/GameHUD';
import { GameOver } from './components/game/GameOver';
import { SettingsPanel } from './components/ui/SettingsPanel';
import { useAI } from './hooks/useAI';
import { t } from './i18n/translations';
import { getNextShipToPlace } from './core/validation';
import { resumeAudio, playShot, playHit, playMiss, playSunk } from './core/sound';
import './App.css';

function GameBoard() {
  const {
    state,
    placeShip,
    playerAttack,
    online,
  } = useGame();
  const { game, preferences, orientation } = state;
  const lang = preferences.language;
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hook for AI turns
  useAI();

  // Setup mode: click on player grid to place ships
  const handlePlayerGridClick = useCallback((pos: { row: number; col: number }) => {
    if (game.phase !== 'setup') return;
    resumeAudio();

    const nextShip = getNextShipToPlace(game.playerBoard);
    if (!nextShip) return;

    placeShip(pos, orientation, nextShip);
  }, [game.phase, game.playerBoard, orientation, placeShip]);

  // Playing mode: click on enemy grid to attack
  const handleEnemyGridClick = useCallback((pos: { row: number; col: number }) => {
    if (game.phase !== 'playing' || game.currentPlayer !== 'player') return;
    if (state.isAttacking) return;

    if (state.preferences.gameMode === 'online') {
      if (online.connectionState !== 'connected') return;
      const cell = game.enemyBoard.grid[pos.row][pos.col];
      if (cell.state !== 'empty' && cell.state !== 'ship') return;

      resumeAudio();
      playShot();
      online.sendAttack(pos);
      return;
    }

    // Don't attack already-attacked cells
    const cell = game.enemyBoard.grid[pos.row][pos.col];
    if (cell.state !== 'empty' && cell.state !== 'ship') return;

    playerAttack(pos);

    // Play result sound after short delay
    setTimeout(() => {
      const newCell = game.enemyBoard.grid[pos.row]?.[pos.col];
      if (newCell?.state === 'hit') playHit();
      else if (newCell?.state === 'miss') playMiss();
      else if (newCell?.state === 'sunk') playSunk();
    }, 100);
  }, [game.phase, game.currentPlayer, game.enemyBoard, state.isAttacking, playerAttack, online, state.preferences.gameMode, online.connectionState]);

  const nextShip = game.phase === 'setup' ? getNextShipToPlace(game.playerBoard) : null;

  return (
    <div className={`app theme-${preferences.theme}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">⚓</span>
            {t('app.title', lang)}
          </h1>
          <span className="app-subtitle">{t('app.subtitle', lang)}</span>
        </div>
        <div className="header-right">
          <button
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            title={t('settings.title', lang)}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="game-main">
        {/* Setup phase: single grid + setup panel */}
        {game.phase === 'setup' && (
          <div className="setup-layout">
            <div className="grid-section">
              <h2 className="grid-title">{t('grid.yourShips', lang)}</h2>
              <Grid
                board={game.playerBoard}
                isOwner={true}
                showShips={true}
                onCellClick={handlePlayerGridClick}
                interactive={true}
                setupMode={true}
                currentShip={nextShip}
                orientation={orientation}
              />
            </div>
            <SetupPanel />
          </div>
        )}

        {/* Playing/Game Over: two grids side by side */}
        {(game.phase === 'playing' || game.phase === 'gameover') && (
          <>
            <GameHUD />
            <div className="battle-layout">
              <div className="grid-section">
                <h2 className="grid-title">{t('grid.yourShips', lang)}</h2>
                <Grid
                  board={game.playerBoard}
                  isOwner={true}
                  showShips={true}
                  onCellClick={() => {}}
                  interactive={false}
                />
              </div>
              <div className="grid-divider">⚔️</div>
              <div className="grid-section">
                <h2 className="grid-title">{t('grid.enemyWaters', lang)}</h2>
                <Grid
                  board={game.enemyBoard}
                  isOwner={false}
                  showShips={game.phase === 'gameover'}
                  onCellClick={handleEnemyGridClick}
                  interactive={
                    game.phase === 'playing' &&
                    game.currentPlayer === 'player' &&
                    !state.isAttacking &&
                    (state.preferences.gameMode === 'ai' || online.connectionState === 'connected')
                  }
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>Battleship — React Edition</span>
      </footer>

      {/* Overlays */}
      <GameOver />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameBoard />
    </GameProvider>
  );
}
