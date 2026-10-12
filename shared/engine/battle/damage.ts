import type { Move, TypeName } from '../../data/dataset.types.js';
import type { Rng } from '../rng.js';
import { accuracyStageMultiplier, clampStage, type Stats } from './stats.js';
import { type TypeChart, effectiveness } from './type-chart.js';

/**
 * Daño Gen V+ (F4-03), réplica de la calculadora de Pokémon Showdown (`@smogon/calc`, mechanics/util.js): mismos
 * `floor`, mismo `pokeRound` y STAB como 6144/4096. Sin habilidades ni objetos (D-007). El test compara las 16 tiradas
 * con las de `@smogon/calc` 0.12.0 en varios casos (anotados en damage.spec.ts).
 */

/** Etapas que importan para el daño. */
export interface DamageStages {
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
}

export interface Combatant {
  level: number;
  types: readonly TypeName[];
  stats: Stats;
  stages: DamageStages;
  burned: boolean;
}

export type DamageMove = Pick<Move, 'type' | 'category' | 'power'>;

export interface DamageInput {
  attacker: Combatant;
  defender: Combatant;
  move: DamageMove;
  chart: TypeChart;
  crit: boolean;
}

/** Redondeo de los juegos: x,5 exacto hacia abajo, por encima hacia arriba. */
export const pokeRound = (n: number): number => (n % 1 > 0.5 ? Math.ceil(n) : Math.floor(n));

/** Stat con etapas como Showdown: (2+e)/2 ó 2/(2−e), con `floor`. */
export function boostedStat(stat: number, stage: number): number {
  const s = clampStage(stage);
  return s >= 0 ? Math.floor((stat * (2 + s)) / 2) : Math.floor((stat * 2) / (2 - s));
}

export function baseDamage(level: number, power: number, attack: number, defense: number): number {
  return Math.floor(
    Math.floor((Math.floor((2 * level) / 5 + 2) * power * attack) / defense) / 50 + 2,
  );
}

/**
 * Las 16 tiradas posibles (85 %…100 %). `[]` si el movimiento no hace daño por poder (de estado o sin poder fijo);
 * todo 0 si el defensor es inmune. El crítico ignora las etapas negativas del atacante y las positivas del defensor.
 */
export function damageRolls({ attacker, defender, move, chart, crit }: DamageInput): number[] {
  if (move.category === 'status' || !move.power) return [];
  const eff = effectiveness(chart, move.type, defender.types);
  if (eff === 0) return Array<number>(16).fill(0);

  const physical = move.category === 'physical';
  let atkStage = physical ? attacker.stages.attack : attacker.stages.specialAttack;
  let defStage = physical ? defender.stages.defense : defender.stages.specialDefense;
  if (crit) {
    atkStage = Math.max(atkStage, 0);
    defStage = Math.min(defStage, 0);
  }
  const attack = boostedStat(
    physical ? attacker.stats.attack : attacker.stats.specialAttack,
    atkStage,
  );
  const defense = boostedStat(
    physical ? defender.stats.defense : defender.stats.specialDefense,
    defStage,
  );

  let base = baseDamage(attacker.level, move.power, attack, defense);
  if (crit) base = Math.floor(base * 1.5);
  const stab = attacker.types.includes(move.type);
  const burned = physical && attacker.burned;

  const rolls: number[] = [];
  for (let i = 0; i <= 15; i++) {
    let d = Math.floor((base * (85 + i)) / 100);
    if (stab) d = (d * 6144) / 4096;
    d = Math.floor(pokeRound(d) * eff);
    if (burned) d = Math.floor(d / 2);
    rolls.push(Math.max(1, pokeRound(d)));
  }
  return rolls;
}

/** Una tirada concreta: el RNG elige 1 de las 16 (como el juego). */
export function rollDamage(input: DamageInput, rng: Rng): number {
  const rolls = damageRolls(input);
  return rolls.length === 0 ? 0 : rolls[rng.int(0, 15)];
}

/** Probabilidad de crítico por etapa (Gen VII+): 0 → 1/24, 1 → 1/8, 2 → 1/2, ≥ 3 → siempre. */
export function critChance(stage: number): number {
  if (stage <= 0) return 1 / 24;
  if (stage === 1) return 1 / 8;
  if (stage === 2) return 1 / 2;
  return 1;
}

export const rollCrit = (stage: number, rng: Rng): boolean => rng.next() < critChance(stage);

/**
 * ¿Acierta? `accuracy: null` no falla nunca. Etapas: precisión del atacante − evasión del defensor, topadas en ±6.
 * Se tira un entero 0-99 como en el juego.
 */
export function hitChance(
  accuracy: number | null,
  accuracyStage: number,
  evasionStage: number,
): number {
  if (accuracy === null) return 1;
  return Math.min(
    1,
    (accuracy * accuracyStageMultiplier(clampStage(accuracyStage - evasionStage))) / 100,
  );
}

export function rollAccuracy(
  accuracy: number | null,
  accuracyStage: number,
  evasionStage: number,
  rng: Rng,
): boolean {
  if (accuracy === null) return true;
  return rng.int(0, 99) < hitChance(accuracy, accuracyStage, evasionStage) * 100;
}

/** Lo que importa para decidir quién actúa antes en el turno. */
export interface TurnCandidate {
  switching: boolean;
  priority: number;
  speed: number;
  speedStage: number;
  paralyzed: boolean;
}

/** Velocidad efectiva: etapas con `floor` y parálisis a la mitad (Gen VII+). */
export function effectiveSpeed(
  c: Pick<TurnCandidate, 'speed' | 'speedStage' | 'paralyzed'>,
): number {
  const s = boostedStat(c.speed, c.speedStage);
  return c.paralyzed ? Math.floor(s / 2) : s;
}

/**
 * Orden del turno: cambiar de Pokémon va primero; luego mayor prioridad; luego mayor velocidad efectiva; empate al
 * azar (con el RNG del combate). Devuelve 0 si actúa primero `a`, 1 si `b`.
 */
export function firstToAct(a: TurnCandidate, b: TurnCandidate, rng: Rng): 0 | 1 {
  if (a.switching !== b.switching) return a.switching ? 0 : 1;
  if (!a.switching && a.priority !== b.priority) return a.priority > b.priority ? 0 : 1;
  const sa = effectiveSpeed(a);
  const sb = effectiveSpeed(b);
  if (sa !== sb) return sa > sb ? 0 : 1;
  return rng.next() < 0.5 ? 0 : 1;
}
