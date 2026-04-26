// ─────────────────────────────────────────────────────────
// Online Partner Panel
// Session setup for connecting with a remote player
// ─────────────────────────────────────────────────────────

import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { t } from '../../i18n/translations';
import './SettingsPanel.css';

export function OnlinePanel() {
  const { state, online } = useGame();
  const lang = state.preferences.language;
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const connected = online.connectionState === 'connected';
  const readyEnabled = connected && !online.localReady && state.game.phase === 'setup' && state.game.playerBoard.ships.length === 5;

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await online.joinSession(joinCode.trim().toUpperCase());
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="settings-group online-panel">
      <h3>{t('online.title', lang)}</h3>
      <p className="settings-description">{t('online.description', lang)}</p>

      <div className="setting-group">
        <label className="setting-label">{t('online.connection', lang)}</label>
        <div className="setting-text">{t(`online.status.${online.connectionState}`, lang)}</div>
        <div className="setting-text">{online.role ? t(`online.role.${online.role}`, lang) : t('online.role.unknown', lang)}</div>
        <div className="setting-text">
          {t('online.readyStatus', lang, {
            local: online.localReady ? t('online.ready', lang) : t('online.notReady', lang),
            remote: online.remoteReady ? t('online.ready', lang) : t('online.notReady', lang),
          })}
        </div>
      </div>

      {!online.sessionId && (
        <div className="setting-group">
          <button
            className="btn btn-secondary"
            onClick={() => online.createSession()}
            disabled={online.connectionState === 'connecting'}
          >
            {online.connectionState === 'connecting' ? t('online.connecting', lang) : t('online.createSession', lang)}
          </button>
        </div>
      )}

      {online.sessionId && (
        <div className="setting-group">
          <label className="setting-label">{t('online.sessionCode', lang)}</label>
          <div className="session-code">{online.sessionId}</div>
          <p className="settings-description">{t('online.shareCode', lang)}</p>
        </div>
      )}

      {!online.sessionId && (
        <div className="setting-group">
          <label className="setting-label">{t('online.joinCode', lang)}</label>
          <input
            type="text"
            className="settings-input"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g., ABC123"
            maxLength={6}
            disabled={joining}
          />
          <button
            className="btn btn-secondary"
            onClick={handleJoinSession}
            disabled={!joinCode.trim() || joining}
          >
            {joining ? t('online.connecting', lang) : t('online.joinSession', lang)}
          </button>
        </div>
      )}

      {online.connectionState === 'connected' && (
        <div className="setting-group">
          <button className="btn btn-secondary" onClick={() => online.disconnect()}>
            {t('online.disconnect', lang)}
          </button>
        </div>
      )}

      <div className="setting-group">
        <button className="btn btn-primary" disabled={!readyEnabled} onClick={() => online.sendReady()}>
          {t('online.readyButton', lang)}
        </button>
      </div>

      {online.error && <div className="setting-error">{online.error}</div>}
    </div>
  );
}
