// ─────────────────────────────────────────────────────────
// Local Storage Manager
// Type-safe wrapper around localStorage
// ─────────────────────────────────────────────────────────

import type { UserPreferences, GameStats, Difficulty } from './models';
import { STORAGE_KEYS } from './constants';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — silently fail
  }
}

// ── Preferences ──────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  difficulty: 'medium',
  soundEnabled: true,
};

export function getPreferences(): UserPreferences {
  return safeGet(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  safeSet(STORAGE_KEYS.preferences, { ...current, ...prefs });
}

// ── Stats ────────────────────────────────────────────────

const DEFAULT_STATS: GameStats = {
  wins: 0,
  losses: 0,
  totalGames: 0,
  bestTurnCount: null,
};

export function getStats(): GameStats {
  return safeGet(STORAGE_KEYS.stats, DEFAULT_STATS);
}

export function recordWin(turnCount: number): void {
  const stats = getStats();
  stats.wins++;
  stats.totalGames++;
  if (stats.bestTurnCount === null || turnCount < stats.bestTurnCount) {
    stats.bestTurnCount = turnCount;
  }
  safeSet(STORAGE_KEYS.stats, stats);
}

export function recordLoss(): void {
  const stats = getStats();
  stats.losses++;
  stats.totalGames++;
  safeSet(STORAGE_KEYS.stats, stats);
}

export function resetStats(): void {
  safeSet(STORAGE_KEYS.stats, DEFAULT_STATS);
}
