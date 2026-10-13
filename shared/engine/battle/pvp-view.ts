import type { PublicPokemon, PublicSide, PvpBattleView } from '../../protocol/pvp.js';
import type { BattleState, SideIndex } from './types.js';

/**
 * Lo que ve cada jugador de un combate PvP (D-056). Puro: lo usan el servidor (para mandarlo) y sus tests.
 * - Quien mira es SIEMPRE el lado 0 (la escena de F4-05 no cambia de lado).
 * - Del rival solo lo que se vería en los juegos: los que ya salieron y cuántos le quedan.
 */

/** Lado `side` del combate visto por `viewer`: el suyo pasa a ser 0 y el del rival 1. */
export function mirrorSide(side: SideIndex, viewer: SideIndex): SideIndex {
  return side === viewer ? 0 : 1;
}

export interface ViewOptions {
  battleId: string;
  decision: number | null;
  mustDo: PvpBattleView['mustDo'];
  remainingMs: number;
  /** `teamIndex` de los Pokémon del RIVAL que ya han salido al combate. */
  revealed: ReadonlySet<number>;
}

export function viewFor(state: BattleState, viewer: SideIndex, opts: ViewOptions): PvpBattleView {
  const foeIndex: SideIndex = viewer === 0 ? 1 : 0;
  const foe = state.sides[foeIndex];
  const revealed: PublicPokemon[] = [...opts.revealed]
    .sort((a, b) => a - b)
    .filter((i) => i >= 0 && i < foe.team.length)
    .map((i) => publicPokemon(state, foeIndex, i));
  const foeView: PublicSide = {
    name: foe.name,
    teamSize: foe.team.length,
    fainted: foe.team.filter((p) => p.hp === 0).length,
    active: foe.active,
    revealed,
  };
  return {
    battleId: opts.battleId,
    turn: state.turn,
    decision: opts.decision,
    mustDo: opts.mustDo,
    remainingMs: opts.remainingMs,
    me: structuredClone(state.sides[viewer]),
    foe: foeView,
    winner: state.winner === null ? null : mirrorSide(state.winner, viewer),
  };
}

/** Un Pokémon de un lado tal como lo ve el otro jugador. */
export function publicPokemon(
  state: BattleState,
  side: SideIndex,
  teamIndex: number,
): PublicPokemon {
  const p = state.sides[side].team[teamIndex];
  return {
    teamIndex,
    speciesId: p.speciesId,
    level: p.level,
    types: [...p.types],
    hp: p.hp,
    maxHp: p.stats.hp,
    status: p.status,
  };
}
