// ─────────────────────────────────────────────────────────
// Game Over Overlay
// Victory/defeat screen with stats
// ─────────────────────────────────────────────────────────

import React from 'react';
import { useGame } from '../../context/GameContext';
import { t } from '../../i18n/translations';
import './GameOver.css';

export function GameOver() {
  const { state, restart } = useGame();
  const { game } = state;
  const lang = state.preferences.language as any;

  if (game.phase !== 'gameover') return null;

  const isWin = game.winner === 'player';

  return (
    <div className="gameover-overlay">
      <div className={`gameover-card ${isWin ? 'victory' : 'defeat'}`}>
        <div className="gameover-icon">
          {isWin ? '🏆' : '💀'}
        </div>
        <h2 className="gameover-title">
          {isWin ? t('game.youWin', lang) : t('game.youLose', lang)}
        </h2>
        <div className="gameover-stats">
          <div className="stat-item">
            <span className="stat-value">{game.turnCount}</span>
            <span className="stat-label">{t('footer.turns', lang, { turn: '' }).trim()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{state.stats.wins}</span>
            <span className="stat-label">{t('stats.wins', lang)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{state.stats.losses}</span>
            <span className="stat-label">{t('stats.losses', lang)}</span>
          </div>
        </div>
        <button className="btn btn-primary btn-play-again" onClick={restart}>
          🔄 {t('action.playAgain', lang)}
        </button>
      </div>
    </div>
  );
}
