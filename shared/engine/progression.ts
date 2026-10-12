/**
 * Nivel del jugador a partir de su XP (F1-08). Única fuente de verdad: el servidor la usa al sumar XP y el cliente
 * para pintar la barra del HUD. XP total para llegar al nivel L = 500·(L−1)·L → nivel 2: 1.000, 3: 3.000,
 * 10: 45.000, 40: 780.000 (como Pokémon GO al principio, sin el muro de los niveles altos).
 */
export const MAX_PLAYER_LEVEL = 40;

/** XP total necesaria para alcanzar `level` (1 → 0). */
export function totalXpForLevel(level: number): number {
  const l = Math.min(Math.max(Math.floor(level), 1), MAX_PLAYER_LEVEL);
  return 500 * (l - 1) * l;
}

/** Nivel que corresponde a una XP total (nunca menos de 1 ni más de MAX_PLAYER_LEVEL). */
export function levelForXp(xp: number): number {
  if (!(xp > 0)) return 1;
  // Inversa de 500·(L−1)·L ≤ xp, con corrección por redondeo.
  let level = Math.floor((1 + Math.sqrt(1 + xp / 125)) / 2);
  while (level < MAX_PLAYER_LEVEL && totalXpForLevel(level + 1) <= xp) level++;
  while (level > 1 && totalXpForLevel(level) > xp) level--;
  return Math.min(level, MAX_PLAYER_LEVEL);
}

export interface LevelProgress {
  level: number;
  /** XP ganada dentro del nivel actual. */
  current: number;
  /** XP que hace falta para pasar al siguiente (0 en el nivel máximo). */
  needed: number;
  /** 0..1 para la barra. */
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  if (level >= MAX_PLAYER_LEVEL) return { level, current: 0, needed: 0, ratio: 1 };
  const base = totalXpForLevel(level);
  const needed = totalXpForLevel(level + 1) - base;
  const current = Math.max(0, Math.floor(xp) - base);
  return { level, current, needed, ratio: current / needed };
}
