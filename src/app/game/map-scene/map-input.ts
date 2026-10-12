/** Hasta dónde se oye el grito de un Pokémon que brota (DISENO §5: "grito bajito según distancia"). */
export const CRY_RANGE_M = 60;
/** Con una franja nueva brotan muchos a la vez: como mucho un grito cada tanto. */
export const CRY_GAP_MS = 5000;
const CRY_GAIN_MIN = 0.2;
const CRY_GAIN_MAX = 0.6;

/** Volumen del grito a `distanceM` metros; null si está demasiado lejos para oírlo. */
export function cryGain(distanceM: number): number | null {
  if (distanceM > CRY_RANGE_M) return null;
  return Math.min(CRY_GAIN_MAX, Math.max(CRY_GAIN_MIN, 1 - distanceM / CRY_RANGE_M));
}

export class CryThrottle {
  private last = -Infinity;

  /** true si puede sonar ahora (y cuenta como sonado). */
  take(nowMs: number): boolean {
    if (nowMs - this.last < CRY_GAP_MS) return false;
    this.last = nowMs;
    return true;
  }
}
