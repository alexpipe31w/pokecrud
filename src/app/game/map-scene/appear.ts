/** DISENO §5: la hierba se agita sola, luego el Pokémon sale de un salto y queda balanceándose. */
export const SHAKE_MS = 700;
export const APPEAR_MS = 1100;
export const DISAPPEAR_MS = 300;
const REST = { y: 1, scale: 1, opacity: 1, grassAmp: 0.15 };

export interface SpritePose {
  /** Metros sobre el suelo (base del sprite). */
  y: number;
  /** Multiplicador del tamaño. */
  scale: number;
  opacity: number;
  /** 0..1, amplitud del agitado de la hierba. */
  grassAmp: number;
}

const easeOut = (x: number): number => 1 - (1 - x) ** 3;

/** Pose `ms` milisegundos después de aparecer. Nunca escala desde 0 (DISENO §4.3). */
export function appearPose(ms: number): SpritePose {
  if (ms >= APPEAR_MS) return { ...REST };
  if (ms < SHAKE_MS) return { y: -2, scale: 0.95, opacity: 0, grassAmp: 1 };
  const k = (ms - SHAKE_MS) / (APPEAR_MS - SHAKE_MS); // 0..1
  const jump = Math.sin(k * Math.PI) * 0.8; // arco del salto
  return {
    // En k = 1: −2 + 3 + 0 = 1 → enlaza con el reposo.
    y: -2 + 3 * easeOut(k) + jump,
    scale: 0.95 + 0.05 * easeOut(k),
    opacity: Math.min(1, k * 2.5),
    grassAmp: 1 - 0.85 * k,
  };
}

/** Pose `ms` milisegundos después de empezar a irse. */
export function disappearPose(ms: number): SpritePose {
  const k = Math.min(1, ms / DISAPPEAR_MS);
  return { y: 1, scale: 1 - 0.05 * k, opacity: 1 - k, grassAmp: 0.15 * (1 - k) };
}
