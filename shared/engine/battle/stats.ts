import type { BaseStats } from '../../data/dataset.types.js';
import type { Ivs, Nature } from '../spawns.js';

/** Stats de combate (mismas claves que los IVs). */
export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}
export type BattleStat = Exclude<keyof Stats, 'hp'>;

/** Naturaleza → [stat que sube ×1,1, stat que baja ×0,9]; las 5 neutras no tocan nada. */
export const NATURE_EFFECTS: Readonly<Record<Nature, readonly [BattleStat, BattleStat] | null>> = {
  hardy: null,
  lonely: ['attack', 'defense'],
  brave: ['attack', 'speed'],
  adamant: ['attack', 'specialAttack'],
  naughty: ['attack', 'specialDefense'],
  bold: ['defense', 'attack'],
  docile: null,
  relaxed: ['defense', 'speed'],
  impish: ['defense', 'specialAttack'],
  lax: ['defense', 'specialDefense'],
  timid: ['speed', 'attack'],
  hasty: ['speed', 'defense'],
  serious: null,
  jolly: ['speed', 'specialAttack'],
  naive: ['speed', 'specialDefense'],
  modest: ['specialAttack', 'attack'],
  mild: ['specialAttack', 'defense'],
  quiet: ['specialAttack', 'speed'],
  bashful: null,
  rash: ['specialAttack', 'specialDefense'],
  calm: ['specialDefense', 'attack'],
  gentle: ['specialDefense', 'defense'],
  sassy: ['specialDefense', 'speed'],
  careful: ['specialDefense', 'specialAttack'],
  quirky: null,
};

const BASE_KEY: Readonly<Record<keyof Stats, keyof BaseStats>> = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  specialAttack: 'spa',
  specialDefense: 'spd',
  speed: 'spe',
};

const ZERO: Stats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

/**
 * Stats Gen III+ (ARQUITECTURA §7). En el juego EV = 0 (D-007); el parámetro `evs` existe para poder comprobar la
 * fórmula con los ejemplos publicados, que sí los llevan.
 *   PS    = floor((2B + IV + floor(EV/4)) · L / 100) + L + 10      (base 1 → 1, Shedinja)
 *   resto = floor((floor((2B + IV + floor(EV/4)) · L / 100) + 5) · naturaleza)
 * La naturaleza se aplica con enteros (×11/10, ×9/10) para no depender de redondeos de coma flotante.
 */
export function calcStats(
  base: BaseStats,
  ivs: Ivs,
  level: number,
  nature: Nature,
  evs: Stats = ZERO,
): Stats {
  if (!Number.isInteger(level) || level < 1 || level > 100)
    throw new RangeError(`Nivel fuera de rango: ${level}`);
  const effect = NATURE_EFFECTS[nature];
  if (effect === undefined) throw new RangeError(`Naturaleza desconocida: ${String(nature)}`);
  const core = (stat: keyof Stats) =>
    Math.floor(((2 * base[BASE_KEY[stat]] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100);
  const other = (stat: BattleStat) => {
    const raw = core(stat) + 5;
    if (effect?.[0] === stat) return Math.floor((raw * 11) / 10);
    if (effect?.[1] === stat) return Math.floor((raw * 9) / 10);
    return raw;
  };
  return {
    hp: base.hp === 1 ? 1 : core('hp') + level + 10,
    attack: other('attack'),
    defense: other('defense'),
    specialAttack: other('specialAttack'),
    specialDefense: other('specialDefense'),
    speed: other('speed'),
  };
}

export const MIN_STAGE = -6;
export const MAX_STAGE = 6;
export const clampStage = (stage: number): number =>
  Math.max(MIN_STAGE, Math.min(MAX_STAGE, stage));

/** Etapas de ataque, defensa, etc.: +1 = ×1,5 … +6 = ×4; −1 = ×2/3 … −6 = ×1/4. */
export function stageMultiplier(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Etapas de precisión y evasión: +1 = ×4/3 … +6 = ×3; −6 = ×1/3. */
export function accuracyStageMultiplier(stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}
