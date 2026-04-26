// ─────────────────────────────────────────────────────────
// Game HUD
// Status bar, turn indicator, and ship tracker during play
// ─────────────────────────────────────────────────────────

import { useGame } from '../../context/GameContext';
import { t } from '../../i18n/translations';
import { countRemainingShips } from '../../core/attack';
import { SHIPS } from '../../core/constants';
import './GameHUD.css';

export function GameHUD() {
  const { state } = useGame();
  const { game } = state;
  const lang = state.preferences.language as any;

  if (game.phase !== 'playing' && game.phase !== 'gameover') return null;

  const playerRemaining = countRemainingShips(game.playerBoard);
  const enemyRemaining = game.enemyBoard.ships.length > 0
    ? countRemainingShips(game.enemyBoard)
    : null;
  const isPlayerTurn = game.currentPlayer === 'player';

  return (
    <div className="game-hud">
      {/* Turn indicator */}
      {game.phase === 'playing' && (
        <div className={`turn-indicator ${isPlayerTurn ? 'player-turn' : 'enemy-turn'}`}>
          <span className="turn-dot" />
          <span className="turn-text">
            {isPlayerTurn
              ? t('game.yourTurn', lang)
              : t('game.enemyTurn', lang)}
          </span>
        </div>
      )}

      {/* Ship status */}
      <div className="ship-status">
        <div className="status-col">
          <span className="status-label">{t('grid.yourShips', lang)}</span>
          <div className="ship-pips">
            {SHIPS.map(ship => {
              const placed = game.playerBoard.ships.find(s => s.id === ship.id);
              const sunk = placed?.isSunk ?? false;
              return (
                <span
                  key={ship.id}
                  className={`ship-pip ${sunk ? 'sunk' : ''}`}
                  title={t(ship.name, lang)}
                >
                  {ship.icon}
                </span>
              );
            })}
          </div>
          <span className="status-count">{playerRemaining}/{SHIPS.length}</span>
        </div>
        <div className="status-vs">VS</div>
        <div className="status-col">
          <span className="status-label">{t('grid.enemyWaters', lang)}</span>
          <div className="ship-pips">
            {SHIPS.map(ship => {
              const placed = game.enemyBoard.ships.find(s => s.id === ship.id);
              const sunk = placed?.isSunk ?? false;
              return (
                <span
                  key={ship.id}
                  className={`ship-pip ${sunk ? 'sunk' : ''}`}
                  title={t(ship.name, lang)}
                >
                  {ship.icon}
                </span>
              );
            })}
          </div>
          <span className="status-count">
            {enemyRemaining !== null
              ? `${enemyRemaining}/${SHIPS.length}`
              : t('online.enemyUnknown', lang)}
          </span>
        </div>
      </div>

      {/* Turn counter */}
      <div className="turn-counter">
        {t('footer.turns', lang, { turn: game.turnCount })}
      </div>
    </div>
  );
}
