// ─────────────────────────────────────────────────────────
// Settings Panel
// Theme, language, difficulty, sound controls
// ─────────────────────────────────────────────────────────

import React from 'react';
import { useGame } from '../../context/GameContext';
import { t } from '../../i18n/translations';
import { LANGUAGES, type LangCode } from '../../i18n/translations';
import type { Difficulty } from '../../core/models';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { state, setTheme, setLanguage, setSound, setDifficulty, restart } = useGame();
  const { preferences } = state;
  const lang = preferences.language as LangCode;

  if (!isOpen) return null;

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ {t('settings.title', lang)}</h3>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          {/* Theme */}
          <div className="setting-group">
            <label className="setting-label">🌓 {t('settings.theme', lang)}</label>
            <div className="setting-options">
              <button
                className={`option-btn ${preferences.theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                ☀️ {t('settings.light', lang)}
              </button>
              <button
                className={`option-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                🌙 {t('settings.dark', lang)}
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="setting-group">
            <label className="setting-label">🌍 {t('settings.language', lang)}</label>
            <div className="setting-options lang-options">
              {(Object.keys(LANGUAGES) as LangCode[]).map(code => (
                <button
                  key={code}
                  className={`option-btn lang-btn ${lang === code ? 'active' : ''}`}
                  onClick={() => setLanguage(code)}
                >
                  {LANGUAGES[code].flag} {LANGUAGES[code].name}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="setting-group">
            <label className="setting-label">🎯 {t('settings.difficulty', lang)}</label>
            <div className="setting-options">
              {difficulties.map(d => (
                <button
                  key={d}
                  className={`option-btn ${preferences.difficulty === d ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {t(`settings.${d}`, lang)}
                </button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div className="setting-group">
            <label className="setting-label">🔊 {t('settings.sound', lang)}</label>
            <div className="setting-options">
              <button
                className={`option-btn ${preferences.soundEnabled ? 'active' : ''}`}
                onClick={() => setSound(true)}
              >
                🔊 ON
              </button>
              <button
                className={`option-btn ${!preferences.soundEnabled ? 'active' : ''}`}
                onClick={() => setSound(false)}
              >
                🔇 OFF
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="setting-group stats-group">
            <label className="setting-label">📊 {t('stats.title', lang)}</label>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-num">{state.stats.wins}</span>
                <span className="stat-desc">{t('stats.wins', lang)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{state.stats.losses}</span>
                <span className="stat-desc">{t('stats.losses', lang)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{state.stats.totalGames}</span>
                <span className="stat-desc">{t('stats.games', lang)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{state.stats.bestTurnCount ?? '—'}</span>
                <span className="stat-desc">{t('stats.best', lang)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={restart}>
            🔄 {t('action.restart', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
