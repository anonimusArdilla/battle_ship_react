// ─────────────────────────────────────────────────────────
// Setup Panel
// Ship placement controls during setup phase
// ─────────────────────────────────────────────────────────

import { useGame } from '../../context/GameContext';
import { SHIPS } from '../../core/constants';
import { t } from '../../i18n/translations';
import { allShipsPlaced, getNextShipToPlace } from '../../core/validation';
import { OnlinePanel } from '../ui/OnlinePanel';
import './SetupPanel.css';

export function SetupPanel() {
  const { state, randomizeShips, clearShips, startGame, setOrientation } = useGame();
  const { playerBoard, phase } = state.game;
  const lang = state.preferences.language;
  const placed = allShipsPlaced(playerBoard);
  const nextShip = getNextShipToPlace(playerBoard);

  if (phase !== 'setup') return null;

  return (
    <div className="setup-panel">
      <h3 className="setup-title">{t('phase.setup', lang)}</h3>
      <p className="setup-instruction">{t('setup.instruction', lang)}</p>

      {/* Ship list */}
      <div className="ship-list">
        {SHIPS.map(ship => {
          const isPlaced = playerBoard.ships.some(s => s.id === ship.id);
          const isNext = nextShip?.id === ship.id;
          return (
            <div
              key={ship.id}
              className={`ship-item ${isPlaced ? 'placed' : ''} ${isNext ? 'next' : ''}`}
            >
              <span className="ship-icon">{ship.icon}</span>
              <span className="ship-name">{t(ship.name, lang)}</span>
              <span className="ship-size">
                {Array.from({ length: ship.size }, (_, i) => (
                  <span key={i} className={`size-dot ${isPlaced ? 'filled' : ''}`} />
                ))}
              </span>
              {isPlaced && <span className="check-mark">✓</span>}
            </div>
          );
        })}
      </div>

      {/* Orientation toggle */}
      <div className="orientation-toggle">
        <span className="label">{t('setup.orientation', lang)}</span>
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${state.orientation === 'horizontal' ? 'active' : ''}`}
            onClick={() => setOrientation('horizontal')}
          >
            ↔ {t('setup.horizontal', lang)}
          </button>
          <button
            className={`toggle-btn ${state.orientation === 'vertical' ? 'active' : ''}`}
            onClick={() => setOrientation('vertical')}
          >
            ↕ {t('setup.vertical', lang)}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="setup-actions">
        <button className="btn btn-secondary" onClick={randomizeShips}>
          🎲 {t('setup.randomize', lang)}
        </button>
        <button className="btn btn-secondary" onClick={clearShips}>
          🗑️ {t('setup.clear', lang)}
        </button>
      </div>

      {state.preferences.gameMode === 'online' && <OnlinePanel />}

      {/* Status / Start */}
      {state.preferences.gameMode !== 'online' && (placed ? (
        <div className="setup-ready">
          <p className="ready-text">{t('setup.allPlaced', lang)}</p>
          <button className="btn btn-primary btn-start" onClick={startGame}>
            ⚔️ {t('setup.start', lang)}
          </button>
        </div>
      ) : (
        <p className="setup-progress">
          {t('setup.shipNext', lang, { ship: nextShip ? t(nextShip.name, lang) : '' })}
        </p>
      ))}
    </div>
  );
}
