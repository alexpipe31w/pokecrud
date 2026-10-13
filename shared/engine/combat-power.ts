import type { Stats } from './battle/stats.js';

/** El PC más bajo que se enseña (como en Pokémon GO). */
export const MIN_CP = 10;

/**
 * PC ("puntos de combate", D-049): una sola cifra para comparar individuos, a la manera de Pokémon GO pero sobre las
 * stats REALES del individuo (`calcStats`: base + IVs + nivel + naturaleza). Lo calcula el SERVIDOR (los IVs no salen
 * de él) y lo enseñan la ficha del encuentro (F2-13) y la colección (F3).
 *   ataque  = 7/8 del mayor + 1/8 del menor de (Ataque, At. Esp.)
 *   defensa = 5/8 del mayor + 3/8 del menor de (Defensa, Def. Esp.)
 *   PC      = max(10, floor(ataque · √defensa · √PS / 10))
 */
export function combatPower(s: Stats): number {
  const attack = (7 * Math.max(s.attack, s.specialAttack) + Math.min(s.attack, s.specialAttack)) / 8;
  const defense =
    (5 * Math.max(s.defense, s.specialDefense) + 3 * Math.min(s.defense, s.specialDefense)) / 8;
  return Math.max(MIN_CP, Math.floor((attack * Math.sqrt(defense) * Math.sqrt(s.hp)) / 10));
}
