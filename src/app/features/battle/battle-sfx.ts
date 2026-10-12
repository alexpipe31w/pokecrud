import type { BattleEvent } from '@shared/engine/battle/types';

import type { SfxName } from '../../services/game/sfx-synth';

/** Golpe de un movimiento según cómo fue (DISENO §4.10: el sonido cuenta lo mismo que el texto). */
export function hitSfx(crit: boolean, multiplier: number): SfxName {
  if (crit) return 'hit-crit';
  if (multiplier > 1) return 'hit-super';
  if (multiplier < 1) return 'hit-weak';
  return 'hit';
}

/**
 * Efecto de un evento del combate, o null si no lleva. El daño lo resuelve `hitSfx` (necesita el crítico y la eficacia
 * que llegan en eventos anteriores); el daño que no es de un movimiento (veneno, quemadura, retroceso) suena flojo.
 */
export function eventSfx(e: BattleEvent): SfxName | null {
  switch (e.kind) {
    case 'damage':
      return e.source === 'move' ? null : 'hit-weak';
    case 'miss':
      return 'miss';
    case 'faint':
      return 'faint';
    case 'heal':
      return 'heal';
    case 'status':
    case 'confused':
      return 'status';
    case 'stat':
      return e.change > 0 ? 'stat-up' : 'stat-down';
    default:
      return null;
  }
}
