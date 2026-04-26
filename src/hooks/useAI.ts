// ─────────────────────────────────────────────────────────
// useAI Hook
// Handles AI turn execution with delays
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { chooseAITarget } from '../core/ai';
import { resolveAttack } from '../core/attack';
import { AI_DELAY_MS } from '../core/constants';

export function useAI() {
  const { state, dispatch } = useGame();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only act when AI mode is selected and it's the AI's turn
    if (state.preferences.gameMode !== 'ai' || state.game.phase !== 'playing' || state.game.currentPlayer !== 'enemy') {
      return;
    }

    timerRef.current = setTimeout(() => {
      const { game, aiState } = state;

      // Choose target
      const { target } = chooseAITarget(
        game.playerBoard,
        aiState,
        game.difficulty
      );

      // Resolve
      const { board, result } = resolveAttack(game.playerBoard, target, 'enemy');

      // Dispatch result
      dispatch({
        type: 'AI_ATTACK_RESULT',
        position: target,
        result,
        board,
      });
    }, AI_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.game.phase, state.game.currentPlayer, state.isAttacking, dispatch, state]);
}
