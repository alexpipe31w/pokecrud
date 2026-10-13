import type { Stats } from './battle/stats.js';

/** Suma máxima de los 6 IVs (0-31 cada uno). */
const TOTAL = 31 * 6;

const sum = (v: Stats): number =>
  v.hp + v.attack + v.defense + v.specialAttack + v.specialDefense + v.speed;

/** Valoración de los IVs en % (F3-03): 0-100, redondeado. */
export const ivPercent = (ivs: Stats): number => Math.round((sum(ivs) / TOTAL) * 100);

/** 0-3 estrellas con los cortes de la valoración de Pokémon GO; 4 = perfecto (todo a 31). */
export function ivStars(ivs: Stats): 0 | 1 | 2 | 3 | 4 {
  const s = sum(ivs);
  if (s === TOTAL) return 4;
  const p = s / TOTAL;
  return p >= 0.822 ? 3 : p >= 0.667 ? 2 : p >= 0.51 ? 1 : 0;
}
