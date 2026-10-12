/** Hasta dónde se oye el grito de un Pokémon que brota (DISENO §5: "grito bajito según distancia"). */
export const CRY_RANGE_M = 60;
/** Con una franja nueva brotan muchos a la vez: como mucho un grito cada tanto. */
export const CRY_GAP_MS = 5000;
const CRY_GAIN_MIN = 0.2;
const CRY_GAIN_MAX = 0.6;
/** Un toque: el dedo no se mueve más de esto ni se queda más tiempo (si no, es arrastre o pellizco del mapa). */
const TAP_MAX_PX = 10;
const TAP_MAX_MS = 300;

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

export interface PointerMark {
  x: number;
  y: number;
  t: number;
}

export function isTap(down: PointerMark, up: PointerMark): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= TAP_MAX_PX && up.t - down.t <= TAP_MAX_MS;
}

/** Píxeles de pantalla → coordenadas normalizadas (−1..1, y hacia arriba) del elemento del mapa, para el raycast. */
export function toNdc(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}
