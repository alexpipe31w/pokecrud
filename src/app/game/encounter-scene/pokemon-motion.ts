import { createRng } from '@shared/engine/rng';
import type { Personality } from './personality';

/**
 * Cómo se mueve el Pokémon en el encuentro (F2-04b): respira, se balancea si es inquieto, flota si vuela y salta de
 * vez en cuando (más a menudo y más alto si es rápido). Los saltos están programados con una semilla (el id del
 * encuentro): así un lanzamiento se resuelve al soltar sabiendo dónde estará el Pokémon al llegar (F2-05).
 * Funciones del tiempo, sin estado: el mismo instante da siempre la misma postura.
 */

export const JUMP_MS = 700;
/** Nunca salta en los primeros 2,5 s: es cuando aterriza (F2-04b). */
const FIRST_JUMP_MS = 2500;
const SCHEDULE_MS = 10 * 60_000;

/** Instantes (ms desde que empieza el encuentro) en que el Pokémon empieza a saltar, ordenados. */
export function jumpSchedule(seed: number, agility: number, untilMs = SCHEDULE_MS): number[] {
  const rng = createRng(seed);
  const mean = 6000 - 3500 * agility; // 6 s los tranquilos, 2,5 s los más rápidos
  const out: number[] = [];
  let t = FIRST_JUMP_MS;
  for (;;) {
    t += mean * (0.6 + 0.8 * rng.next());
    if (t > untilMs) return out;
    out.push(t);
  }
}

export interface MotionFrame {
  /** Metros sobre el suelo (vuelo + vaivén + salto). */
  lift: number;
  /** Escala vertical (respirar, agacharse al saltar); la horizontal es `2 − squash`. */
  squash: number;
  /** Inclinación en radianes. */
  lean: number;
  jumping: boolean;
}

export function motionAt(
  tMs: number,
  p: Personality,
  jumps: readonly number[],
  heightM: number,
): MotionFrame {
  const t = tMs / 1000;
  const bob = p.hover > 0 ? 0.06 * Math.sin(t * 1.7) : 0;
  const lean = (0.03 + 0.08 * p.skittish) * Math.sin(t * (1.1 + 1.5 * p.skittish));
  const start = activeJump(tMs, jumps);
  if (start === null) {
    return { lift: p.hover + bob, squash: 1 + 0.025 * Math.sin(t * 2.4), lean, jumping: false };
  }
  const k = (tMs - start) / JUMP_MS; // 0..1
  const height = (0.3 + 0.25 * heightM) * (0.6 + p.agility);
  const squash =
    k < 0.15 ? 1 - 0.15 * Math.sin((Math.PI * k) / 0.15) : 1 + 0.08 * Math.sin(Math.PI * k);
  return { lift: p.hover + bob + height * Math.sin(Math.PI * k), squash, lean, jumping: true };
}

/** Entrada (DISENO §5, "aterriza con polvo"): cae desde 1,5 m y se aplasta al tocar el suelo. */
export const LAND_MS = 700;
/** Instante (ms) en que toca el suelo: ahí van el polvo, el grito y la vibración. */
export const TOUCHDOWN_MS = 500;
const DROP_M = 1.5;

/** Postura durante la entrada (lift sobre su altura normal, y squash); null cuando ya aterrizó. */
export function landingAt(tMs: number): { lift: number; squash: number } | null {
  if (tMs >= LAND_MS) return null;
  if (tMs < TOUCHDOWN_MS) {
    const k = Math.max(0, tMs) / TOUCHDOWN_MS;
    return { lift: DROP_M * (1 - k * k), squash: 1.06 }; // cae acelerando, un poco estirado
  }
  const k = (tMs - TOUCHDOWN_MS) / (LAND_MS - TOUCHDOWN_MS);
  return { lift: 0, squash: 1 - 0.18 * Math.sin(Math.PI * k) }; // se aplasta y recupera
}

/** El salto en curso en `tMs` (búsqueda binaria del último que empezó), o null. */
function activeJump(tMs: number, jumps: readonly number[]): number | null {
  let lo = 0;
  let hi = jumps.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (jumps[mid] <= tMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 && tMs - jumps[found] < JUMP_MS ? jumps[found] : null;
}
