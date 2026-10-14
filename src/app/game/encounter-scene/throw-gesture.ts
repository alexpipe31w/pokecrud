/**
 * Gesto de lanzar la Poké Ball (F2-05, DISENO §4.6): el dedo arrastra la bola 1:1 y al soltarla sale con la
 * velocidad de los últimos ~80 ms. Si antes de lanzar se dibuja un círculo con la bola (casi una vuelta del dedo),
 * sale con efecto (curva, ×1,7 en la captura, D-027). Píxeles CSS y ms, con la Y de la pantalla hacia abajo.
 */
export interface GestureSample {
  x: number;
  y: number;
  t: number;
}

/** Velocidad al soltar, px/s (vy < 0 = hacia arriba). */
export interface Release {
  vx: number;
  vy: number;
}

export const RELEASE_WINDOW_MS = 80;
/** Por debajo de esto hacia arriba no es un lanzamiento: la bola vuelve a la mano. */
export const MIN_FLICK_PX_S = 350;
/**
 * Zona buena (D-050): cualquier lanzamiento entre estas velocidades llega justo al centro del Pokémon (potencia 1).
 * Medido en el Samsung A36: un dedo de verdad suelta entre ~1.100 y ~3.300 px/s sin proponérselo, y con una sola
 * velocidad "correcta" (1.800 ± 4 %) se acertaban 3 de 117. Lo difícil queda en la puntería, los saltos y el aro.
 */
export const GOOD_MIN_PX_S = 1000;
export const GOOD_MAX_PX_S = 3600;
export const MAX_AIM_RAD = Math.PI / 4;
/** ~0,9 vueltas del dedo (un círculo dibujado con la bola) = con efecto. */
export const CURVE_MIN_SPIN_RAD = Math.PI * 1.8;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Velocidad entre la muestra más vieja de la ventana y la última; null si no hay movimiento medible. */
export function releaseVelocity(
  samples: readonly GestureSample[],
  windowMs = RELEASE_WINDOW_MS,
): Release | null {
  if (samples.length < 2) return null;
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i].t <= windowMs; i--)
    first = samples[i];
  const dt = (last.t - first.t) / 1000;
  if (dt < 0.008) return null;
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** Tramos más cortos que esto no cuentan para el rumbo del dedo (temblor). */
export const MIN_TURN_SEGMENT_PX = 4;

/**
 * Cuánto ha girado el RUMBO del dedo (radianes, + = sentido horario en pantalla): un círculo dibujado = 2π esté donde
 * esté (D-050; medirlo alrededor del punto de agarre no valía: ese punto queda en el borde del círculo). Devuelve el
 * giro máximo alcanzado, para que el tirón final hacia arriba no lo deshaga.
 */
export function turnAngle(samples: readonly GestureSample[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  let peak = 0;
  let heading: number | null = null;
  let { x: ax, y: ay } = samples[0];
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - ax;
    const dy = samples[i].y - ay;
    if (Math.hypot(dx, dy) < MIN_TURN_SEGMENT_PX) continue;
    const h = Math.atan2(dy, dx);
    if (heading !== null) {
      let d = h - heading;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      sum += d;
      if (Math.abs(sum) > Math.abs(peak)) peak = sum;
    }
    heading = h;
    ax = samples[i].x;
    ay = samples[i].y;
  }
  return peak;
}

/** Sentido de la curva: 1 si giró en sentido horario (se abre a la derecha), −1 al revés, 0 sin efecto. */
export function curveOf(samples: readonly GestureSample[]): -1 | 0 | 1 {
  const a = turnAngle(samples);
  if (Math.abs(a) < CURVE_MIN_SPIN_RAD) return 0;
  return a > 0 ? 1 : -1;
}

/**
 * Potencia (1 = justo al centro) y puntería (radianes, + = derecha) del lanzamiento; null si no es hacia arriba.
 * Dentro de la zona buena la potencia es 1; por debajo se queda corta y por encima se pasa, en proporción.
 */
export function swipeToThrow(r: Release): { power: number; aim: number } | null {
  const up = -r.vy;
  if (up < MIN_FLICK_PX_S) return null;
  const power = up < GOOD_MIN_PX_S ? up / GOOD_MIN_PX_S : up > GOOD_MAX_PX_S ? up / GOOD_MAX_PX_S : 1;
  return {
    power: clamp(power, 0.3, 2),
    aim: clamp(Math.atan2(r.vx, -r.vy), -MAX_AIM_RAD, MAX_AIM_RAD),
  };
}
