import type { PublicPokemon, PublicSide, PvpBattleView, PvpEvent } from '../../protocol/pvp.js';
import type { BattleAction, BattleEvent, BattleState, SideIndex } from './types.js';

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

/**
 * Los eventos de un turno vistos por `viewer`: cada `side` girado (tú = 0) y cada `switch` con el Pokémon que sale
 * (el cliente no conoce el equipo del rival). `before` = el estado ANTES del turno: los del banquillo no cambian
 * durante el turno, así que sus PS y estado son los de entonces.
 */
export function eventsFor(
  events: readonly BattleEvent[],
  before: BattleState,
  viewer: SideIndex,
): PvpEvent[] {
  return events.map((e): PvpEvent => {
    const side = mirrorSide(e.side, viewer);
    if (e.kind === 'switch') {
      return { ...e, side, pokemon: publicPokemon(before, e.side, e.teamIndex) };
    }
    return { ...e, side };
  });
}

/**
 * Lo que se juega por `side` si se le acaba el tiempo (D-056, regla 4): en un cambio forzado, el primer Pokémon en pie
 * que no está en combate; si no, el primer movimiento con PP (sin PP en ninguno, el 0: el motor hace Forcejeo).
 */
export function defaultAction(state: BattleState, side: SideIndex): BattleAction {
  const s = state.sides[side];
  if (state.pendingSwitch[side]) {
    const teamIndex = s.team.findIndex((p, i) => i !== s.active && p.hp > 0);
    return { kind: 'switch', teamIndex };
  }
  const moveIndex = s.team[s.active].moves.findIndex((m) => m.pp > 0);
  return { kind: 'move', moveIndex: Math.max(0, moveIndex) };
}
