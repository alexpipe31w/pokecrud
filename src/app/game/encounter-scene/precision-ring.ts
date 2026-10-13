import type { ThrowQuality } from '@shared/engine/capture';

/**
 * Círculo de precisión (F2-05, ARQUITECTURA §6): un aro de color que encoge sobre el Pokémon una y otra vez. Si la
 * bola entra DENTRO del aro, cuanto más pequeño esté el aro en ese momento, mejor: Bien / Genial / Excelente. El
 * radio va en unidades de la caja del Pokémon (1 = toda la caja), igual que el punto de impacto (u, v) de
 * `throw-physics.ts`. El cliente solo lo propone: el servidor rebaja los "excelente" inverosímiles (D-028).
 */
export const RING_PERIOD_MS = 1600;
export const RING_MIN = 0.2;

/** Radio del aro en el instante `tMs`: de 1 a RING_MIN y vuelta a empezar. */
export function ringRadius(tMs: number): number {
  const k = (((tMs % RING_PERIOD_MS) + RING_PERIOD_MS) % RING_PERIOD_MS) / RING_PERIOD_MS;
  return 1 - (1 - RING_MIN) * k;
}

export function throwQuality(u: number, v: number, ring: number): ThrowQuality {
  if (Math.hypot(u, v) > ring) return 'none';
  if (ring > 0.7) return 'nice';
  if (ring > 0.4) return 'great';
  return 'excellent';
}

/** Color del aro por la probabilidad de captura (como Pokémon GO): token de DISENO §2. */
export function ringToken(chance: number): '--success' | '--gold' | '--t-fire' | '--danger' {
  if (chance >= 0.6) return '--success';
  if (chance >= 0.3) return '--gold';
  if (chance >= 0.15) return '--t-fire';
  return '--danger';
}

export const QUALITY_TEXT: Readonly<Record<ThrowQuality, string>> = {
  none: '',
  nice: '¡Bien!',
  great: '¡Genial!',
  excellent: '¡Excelente!',
};
