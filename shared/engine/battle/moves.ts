import type { Move } from '../../data/dataset.types.js';

/**
 * A quién afectan los cambios de stats de un movimiento (F4-02, plan F4). PokéAPI lo reparte en dos campos:
 * - de estado: `target` (`user` → el que lo usa; `selected-pokemon` / `all-opponents` → el rival);
 * - de daño: `meta.category` (`damage-raise` → el usuario, aunque baje: A Bocajarro, Sofoco; `damage-lower` → el
 *   rival). Ojo: su `target` siempre es `selected-pokemon`, así que mirar solo `target` saldría al revés.
 * Los de la Gen 9 que PokéAPI dejó sin categoría van en la lista de abajo (comprobados en Bulbapedia).
 */
export type StatTarget = 'user' | 'opponent' | 'none';

/** Movimientos de daño sin `meta.category` en PokéAPI (Gen 9). El resto de esos son del usuario. */
const DAMAGE_STAT_OVERRIDES: Readonly<Record<string, StatTarget>> = {
  'lumina-crash': 'opponent', // baja 2 la Def. Esp. del rival
  'syrup-bomb': 'opponent', // baja la Velocidad del rival
};

/** En 1 vs 1 "el usuario y sus aliados" es el usuario; "un aliado" o "todos" (Labrar) no aplican. */
const STATUS_TARGETS: Readonly<Record<string, StatTarget>> = {
  user: 'user',
  'user-and-allies': 'user',
  'users-field': 'user',
  'user-or-ally': 'user',
  'selected-pokemon': 'opponent',
  'all-opponents': 'opponent',
  'random-opponent': 'opponent',
  'all-other-pokemon': 'opponent',
};

export function statChangeTarget(
  move: Pick<Move, 'name' | 'category' | 'target' | 'metaCategory' | 'statChanges'>,
): StatTarget {
  if (move.statChanges.length === 0) return 'none';
  if (move.category === 'status') return STATUS_TARGETS[move.target] ?? 'none';
  if (move.metaCategory === 'damage-raise') return 'user';
  if (move.metaCategory === 'damage-lower') return 'opponent';
  return DAMAGE_STAT_OVERRIDES[move.name] ?? 'user';
}

/**
 * Probabilidad (0-100) de que se apliquen los cambios de stats. PokéAPI pone `stat_chance: 0` cuando es seguro
 * (Danza Espada, Canto Ardiente…), así que 0 con cambios = 100 %.
 */
export function statChangeChance(move: Pick<Move, 'statChanges' | 'statChance'>): number {
  if (move.statChanges.length === 0) return 0;
  return move.statChance > 0 ? move.statChance : 100;
}

/** Estados que el motor v1 sabe aplicar (plan F4). `poison` incluye Tóxico (se distingue por el nombre en F4-04). */
export const SUPPORTED_AILMENTS: ReadonlySet<string> = new Set([
  'burn',
  'freeze',
  'paralysis',
  'poison',
  'sleep',
  'confusion',
]);

/** Placaje: reserva si una especie no tiene ningún movimiento soportado a su nivel. */
export const FALLBACK_MOVE_ID = 33;

/**
 * ¿Lo sabe ejecutar el motor v1? De daño: con poder fijo (los de daño sin poder — Sísmico, Guillotina… — no).
 * De estado: si cambia stats a alguien que existe en 1 vs 1, causa un estado soportado o cura.
 */
export function isSupportedMove(
  move: Pick<
    Move,
    | 'name'
    | 'category'
    | 'power'
    | 'target'
    | 'metaCategory'
    | 'statChanges'
    | 'ailment'
    | 'healing'
  >,
): boolean {
  if (move.category !== 'status') return (move.power ?? 0) > 0;
  return (
    statChangeTarget(move) !== 'none' ||
    (move.ailment !== null && SUPPORTED_AILMENTS.has(move.ailment)) ||
    move.healing > 0
  );
}

/**
 * Los 4 movimientos por defecto de un Pokémon (ARQUITECTURA §7): los 4 últimos que aprende por nivel hasta `level`
 * (nivel ≥ 1: los de nivel 0 se aprenden al evolucionar), sin repetir y solo soportados. Si no queda ninguno, Placaje.
 */
export function defaultMoves(
  learnset: readonly { moveId: number; level: number }[],
  level: number,
  isSupported: (moveId: number) => boolean,
): number[] {
  const learned = learnset
    .filter((m) => m.level >= 1 && m.level <= level && isSupported(m.moveId))
    .sort((a, b) => a.level - b.level)
    .map((m) => m.moveId);
  const picked: number[] = [];
  for (let i = learned.length - 1; i >= 0 && picked.length < 4; i--) {
    if (!picked.includes(learned[i])) picked.unshift(learned[i]);
  }
  return picked.length > 0 ? picked : [FALLBACK_MOVE_ID];
}
