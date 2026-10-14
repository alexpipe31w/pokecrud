/**
 * Vuelo de la Poké Ball (F2-05). Se calcula entero AL SOLTAR: dónde está el Pokémon cuando llegue la bola se sabe
 * (sus saltos están programados, `pokemon-motion.ts`), así que acierto/fallo y el punto de impacto se conocen ya y la
 * animación solo lo reproduce (y la petición al servidor sale antes, D-046).
 *
 * Marco del lanzamiento: `fwd` = metros hacia donde apuntaba el móvil (horizontal), `lat` = a su derecha, `up` =
 * altura respecto a la cámara (el suelo está en −EYE_HEIGHT_M). Gravedad real.
 *
 * Normalizado por distancia (como Pokémon GO): con potencia 1 y puntería 0 la bola llega al centro del Pokémon esté
 * a 2 m o a 12 m. Con más potencia pasa por encima; con menos se queda corta.
 */
export const GRAVITY = 9.8;
/** La bola en la mano: un poco por debajo de la cámara. */
export const HAND_Y = -0.35;
/** Cuánto se abre la bola con efecto antes de volver a su línea (llega al mismo sitio, con más bonus). */
export const CURVE_SWING_M = 0.6;
/** Caja mínima del Pokémon: a los diminutos (Joltik, 0,1 m) también se les puede dar. */
export const MIN_HALF_WIDTH_M = 0.18;
export const MIN_BOX_HEIGHT_M = 0.35;

export const flightTime = (distance: number): number => 0.55 + 0.06 * distance;

export interface Flight {
  /** m/s hacia delante, a la derecha y hacia arriba al salir. */
  vf: number;
  vl: number;
  vu: number;
  /** Segundos hasta recorrer la distancia del Pokémon. */
  tArrive: number;
  curve: -1 | 0 | 1;
  startY: number;
}

export function planFlight(
  power: number,
  aim: number,
  curve: -1 | 0 | 1,
  distance: number,
  targetY: number,
  startY = HAND_Y,
): Flight {
  const T = flightTime(distance);
  const vf = (distance / T) * power;
  const vu = ((targetY - startY + 0.5 * GRAVITY * T * T) / T) * power;
  return { vf, vl: vf * Math.tan(aim), vu, tArrive: distance / vf, curve, startY };
}

export interface FlightPos {
  fwd: number;
  lat: number;
  up: number;
}

export function flightPos(
  f: Flight,
  t: number,
  out: FlightPos = { fwd: 0, lat: 0, up: 0 },
): FlightPos {
  out.fwd = f.vf * t;
  out.lat = f.vl * t + f.curve * CURVE_SWING_M * Math.sin(Math.PI * Math.min(1, t / f.tArrive));
  out.up = f.startY + f.vu * t - 0.5 * GRAVITY * t * t;
  return out;
}

/** Caja del Pokémon en el marco del lanzamiento, en el instante en que llega la bola. */
export interface TargetBox {
  fwd: number;
  lat: number;
  /** Altura de sus pies (suelo + vuelo + salto). */
  baseY: number;
  height: number;
  halfWidth: number;
  groundY: number;
}

/** Caja de un Pokémon de `heightM` con arte de proporción `aspect` (ancho/alto), con mínimos para los pequeños. */
export const hitBox = (heightM: number, aspect: number): { height: number; halfWidth: number } => ({
  height: Math.max(MIN_BOX_HEIGHT_M, heightM),
  halfWidth: Math.max(MIN_HALF_WIDTH_M, 0.35 * heightM * aspect),
});

/** Acierto con el punto de impacto normalizado (u, v en [−1, 1] desde el centro de la caja) o fallo con dónde cae. */
export type ThrowHit =
  | { kind: 'hit'; t: number; u: number; v: number }
  | { kind: 'miss'; t: number; fwd: number; lat: number };

/** Segundos hasta que la bola cruza la distancia `fwd` (para saber dónde estará el Pokémon entonces). */
export const impactTime = (f: Flight, fwd: number): number => fwd / f.vf;

/** Segundos hasta que la bola toca el suelo. */
export function groundTime(f: Flight, groundY: number): number {
  const a = 0.5 * GRAVITY;
  return (f.vu + Math.sqrt(f.vu * f.vu + 4 * a * (f.startY - groundY))) / (2 * a);
}

export function resolveFlight(f: Flight, box: TargetBox): ThrowHit {
  const tg = groundTime(f, box.groundY);
  const th = impactTime(f, box.fwd);
  if (th < tg) {
    const p = flightPos(f, th);
    const u = (p.lat - box.lat) / box.halfWidth;
    const v = (p.up - (box.baseY + box.height / 2)) / (box.height / 2);
    if (Math.abs(u) <= 1 && Math.abs(v) <= 1) return { kind: 'hit', t: th, u, v };
  }
  const p = flightPos(f, tg);
  return { kind: 'miss', t: tg, fwd: p.fwd, lat: p.lat };
}
