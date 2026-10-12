import type { Move, TypeName } from '../../data/dataset.types.js';
import type { Rng } from '../rng.js';
import { type Combatant, damageRolls, firstToAct, rollAccuracy, rollCrit } from './damage.js';
import { SUPPORTED_AILMENTS, statChangeChance, statChangeTarget } from './moves.js';
import { clampStage, type Stats } from './stats.js';
import {
  type BattleAction,
  type BattleContext,
  BattleError,
  type BattleEvent,
  type BattlePokemon,
  type BattleState,
  type DamageSource,
  type MajorStatus,
  type SideIndex,
  type StageStat,
  type Stages,
  type TurnResult,
} from './types.js';
import { effectiveness } from './type-chart.js';

/**
 * Motor de combate (F4-04, plan F4, D-031): reducer PURO.
 *   resolveTurn(ctx, estado, acciones, rng) → { estado nuevo, eventos }
 * No muta la entrada. Mismo estado + mismas acciones + misma semilla = mismo resultado (lo usa el servidor en PvP).
 */

export interface PokemonInit {
  uid: string;
  speciesId: number;
  level: number;
  types: TypeName[];
  stats: Stats;
  /** 1-4 ids de movimiento (soportados: `defaultMoves`). */
  moves: number[];
}

const ZERO_STAGES: Stages = {
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
  accuracy: 0,
  evasion: 0,
};

/** Nombres de stat de PokéAPI → etapa del motor. */
export const STAGE_OF: Readonly<Record<string, StageStat>> = {
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
  accuracy: 'accuracy',
  evasion: 'evasion',
};

/** Inmunidades a estados por tipo (Gen VII+). */
const STATUS_IMMUNE: Readonly<Record<MajorStatus, readonly TypeName[]>> = {
  burn: ['fire'],
  paralysis: ['electric'],
  poison: ['poison', 'steel'],
  toxic: ['poison', 'steel'],
  freeze: ['ice'],
  sleep: [],
};

/** Reparto de golpes de los multigolpe 2-5 (Gen V+): 35 % / 35 % / 15 % / 15 %. */
const MULTI_HIT_TABLE = [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5];

const STRUGGLE_POWER = 50;
const CONFUSION_POWER = 40;

export function createBattle(
  ctx: BattleContext,
  sides: [{ name: string; team: PokemonInit[] }, { name: string; team: PokemonInit[] }],
): BattleState {
  const build = (p: PokemonInit): BattlePokemon => {
    if (p.moves.length < 1 || p.moves.length > 4) {
      throw new BattleError(
        `Un Pokémon lleva de 1 a 4 movimientos (${p.uid} tiene ${p.moves.length})`,
      );
    }
    return {
      uid: p.uid,
      speciesId: p.speciesId,
      level: p.level,
      types: [...p.types],
      stats: { ...p.stats },
      hp: p.stats.hp,
      moves: p.moves.map((moveId) => {
        const m = ctx.moves.get(moveId);
        if (!m) throw new BattleError(`Movimiento desconocido: ${moveId}`);
        return { moveId, pp: m.pp, maxPp: m.pp };
      }),
      status: null,
      statusTurns: 0,
      volatile: { confusion: 0, flinch: false },
      stages: { ...ZERO_STAGES },
    };
  };
  for (const s of sides) {
    if (s.team.length < 1 || s.team.length > 6)
      throw new BattleError('Un equipo lleva de 1 a 6 Pokémon');
  }
  return {
    turn: 0,
    sides: [
      { name: sides[0].name, team: sides[0].team.map(build), active: 0 },
      { name: sides[1].name, team: sides[1].team.map(build), active: 0 },
    ],
    pendingSwitch: [false, false],
    winner: null,
  };
}

const other = (s: SideIndex): SideIndex => (s === 0 ? 1 : 0);
const activeOf = (state: BattleState, s: SideIndex): BattlePokemon =>
  state.sides[s].team[state.sides[s].active];
const canFight = (p: BattlePokemon): boolean => p.hp > 0;

/** ¿Puede este lado usar el movimiento `i`? (o Forcejeo, si no le queda PP en ninguno). */
function hasAnyPp(p: BattlePokemon): boolean {
  return p.moves.some((m) => m.pp > 0);
}

function validate(state: BattleState, side: SideIndex, action: BattleAction | null): BattleAction {
  if (!action) throw new BattleError(`Falta la acción del lado ${side}`);
  const s = state.sides[side];
  if (action.kind === 'forfeit') return action;
  if (action.kind === 'switch') {
    const target = s.team[action.teamIndex];
    if (!target) throw new BattleError('Ese Pokémon no está en el equipo');
    if (action.teamIndex === s.active) throw new BattleError('Ese Pokémon ya está en combate');
    if (!canFight(target)) throw new BattleError('No puedes sacar un Pokémon debilitado');
    return action;
  }
  const active = s.team[s.active];
  const slot = active.moves[action.moveIndex];
  if (!slot) throw new BattleError('Ese movimiento no existe');
  if (slot.pp <= 0 && hasAnyPp(active)) throw new BattleError('A ese movimiento no le quedan PP');
  return action;
}

/** Turno completo. `actions[i]` es la del lado i (o null si ese lado no tiene que actuar en un cambio forzado). */
export function resolveTurn(
  ctx: BattleContext,
  input: BattleState,
  actions: [BattleAction | null, BattleAction | null],
  rng: Rng,
): TurnResult {
  if (input.winner !== null) throw new BattleError('El combate ya terminó');
  const state = structuredClone(input);
  const events: BattleEvent[] = [];
  const emit = (e: BattleEvent) => events.push(e);
  /** Debilitados ya anunciados en ESTE turno (nada de estado fuera de la función: el motor es puro). */
  const announced = new Set<BattlePokemon>();

  // Cambio forzado tras un debilitado: solo cambian los lados pendientes; nadie más actúa.
  if (state.pendingSwitch[0] || state.pendingSwitch[1]) {
    for (const side of [0, 1] as const) {
      if (!state.pendingSwitch[side]) continue;
      const a = validate(state, side, actions[side]);
      if (a.kind === 'forfeit') return finish(state, events, other(side), side);
      if (a.kind !== 'switch') throw new BattleError('Tienes que elegir otro Pokémon');
      doSwitch(state, side, a.teamIndex, emit);
      state.pendingSwitch[side] = false;
    }
    return { state, events };
  }

  const valid: [BattleAction, BattleAction] = [
    validate(state, 0, actions[0]),
    validate(state, 1, actions[1]),
  ];
  for (const side of [0, 1] as const) {
    if (valid[side].kind === 'forfeit') return finish(state, events, other(side), side);
  }

  const order = turnOrder(ctx, state, valid, rng);
  const acted: [boolean, boolean] = [false, false];
  for (const side of order) {
    if (state.winner !== null) break;
    const a = valid[side];
    if (a.kind === 'switch') {
      doSwitch(state, side, a.teamIndex, emit);
    } else if (a.kind === 'move' && canFight(activeOf(state, side))) {
      useMove(ctx, state, side, a.moveIndex, !acted[other(side)], rng, emit);
    }
    acted[side] = true;
    checkFaints(state, emit, announced);
  }

  // Final del turno: quemado, veneno y tóxico (lado 0 y luego 1), y fuera los retrocesos.
  for (const side of [0, 1] as const) {
    const p = activeOf(state, side);
    if (canFight(p)) residual(p, side, emit);
    p.volatile.flinch = false;
  }
  checkFaints(state, emit, announced);
  state.turn++;
  return settle(state, events);
}

function turnOrder(
  ctx: BattleContext,
  state: BattleState,
  actions: [BattleAction, BattleAction],
  rng: Rng,
): SideIndex[] {
  const candidate = (side: SideIndex) => {
    const a = actions[side];
    const p = activeOf(state, side);
    const move = a.kind === 'move' ? ctx.moves.get(p.moves[a.moveIndex].moveId) : undefined;
    return {
      switching: a.kind === 'switch',
      priority: move?.priority ?? 0,
      speed: p.stats.speed,
      speedStage: p.stages.speed,
      paralyzed: p.status === 'paralysis',
    };
  };
  return firstToAct(candidate(0), candidate(1), rng) === 0 ? [0, 1] : [1, 0];
}

function doSwitch(
  state: BattleState,
  side: SideIndex,
  teamIndex: number,
  emit: (e: BattleEvent) => void,
): void {
  const out = activeOf(state, side);
  // Al salir se pierden las etapas y lo volátil (confusión, retroceso); el estado principal se queda.
  out.stages = { ...ZERO_STAGES };
  out.volatile = { confusion: 0, flinch: false };
  if (out.status === 'toxic') out.statusTurns = 1; // el contador de Tóxico vuelve a empezar
  state.sides[side].active = teamIndex;
  emit({ kind: 'switch', side, teamIndex });
}

/** Antes de moverse: retroceso, sueño, congelación, parálisis y confusión. `false` = pierde el turno. */
function canAct(
  p: BattlePokemon,
  side: SideIndex,
  rng: Rng,
  emit: (e: BattleEvent) => void,
  ctx: BattleContext,
): boolean {
  if (p.volatile.flinch) {
    emit({ kind: 'cant-move', side, reason: 'flinch' });
    return false;
  }
  if (p.status === 'sleep') {
    if (p.statusTurns > 0) {
      p.statusTurns--;
      emit({ kind: 'cant-move', side, reason: 'sleep' });
      return false;
    }
    p.status = null;
    emit({ kind: 'wake', side });
  }
  if (p.status === 'freeze') {
    if (rng.next() < 0.2) {
      p.status = null;
      emit({ kind: 'thaw', side });
    } else {
      emit({ kind: 'cant-move', side, reason: 'freeze' });
      return false;
    }
  }
  if (p.status === 'paralysis' && rng.next() < 0.25) {
    emit({ kind: 'cant-move', side, reason: 'paralysis' });
    return false;
  }
  if (p.volatile.confusion > 0) {
    p.volatile.confusion--;
    if (p.volatile.confusion === 0) {
      emit({ kind: 'confusion-end', side });
    } else if (rng.next() < 1 / 3) {
      emit({ kind: 'confusion-hit', side });
      const self = combatant(p);
      const rolls = damageRolls({
        attacker: { ...self, types: [] },
        defender: { ...self, types: [] },
        move: { type: 'normal', category: 'physical', power: CONFUSION_POWER },
        chart: ctx.chart,
        crit: false,
      });
      hurt(p, side, rolls[rng.int(0, 15)], 'confusion', emit);
      return false;
    }
  }
  return true;
}

function combatant(p: BattlePokemon): Combatant {
  return {
    level: p.level,
    types: p.types,
    stats: p.stats,
    stages: {
      attack: p.stages.attack,
      defense: p.stages.defense,
      specialAttack: p.stages.specialAttack,
      specialDefense: p.stages.specialDefense,
    },
    burned: p.status === 'burn',
  };
}

function hurt(
  p: BattlePokemon,
  side: SideIndex,
  amount: number,
  source: DamageSource,
  emit: (e: BattleEvent) => void,
): number {
  const dealt = Math.min(p.hp, Math.max(0, amount));
  p.hp -= dealt;
  emit({ kind: 'damage', side, amount: dealt, hpAfter: p.hp, source });
  return dealt;
}

function heal(
  p: BattlePokemon,
  side: SideIndex,
  amount: number,
  emit: (e: BattleEvent) => void,
): void {
  const healed = Math.min(p.stats.hp - p.hp, Math.max(0, amount));
  if (healed <= 0) return;
  p.hp += healed;
  emit({ kind: 'heal', side, amount: healed, hpAfter: p.hp });
}

function useMove(
  ctx: BattleContext,
  state: BattleState,
  side: SideIndex,
  moveIndex: number,
  movesFirst: boolean,
  rng: Rng,
  emit: (e: BattleEvent) => void,
): void {
  const user = activeOf(state, side);
  const foeSide = other(side);
  const foe = activeOf(state, foeSide);
  if (!canAct(user, side, rng, emit, ctx)) return;

  if (!hasAnyPp(user)) {
    struggle(ctx, user, side, foe, foeSide, rng, emit);
    return;
  }
  const slot = user.moves[moveIndex];
  slot.pp--;
  const move = ctx.moves.get(slot.moveId) as Move;
  emit({ kind: 'move', side, moveId: move.id });

  const targetsFoe = move.category !== 'status' || statusTargetsFoe(move);
  if (targetsFoe && !canFight(foe)) {
    emit({ kind: 'fail', side });
    return;
  }
  if (targetsFoe && !rollAccuracy(move.accuracy, user.stages.accuracy, foe.stages.evasion, rng)) {
    emit({ kind: 'miss', side });
    return;
  }

  if (move.category === 'status') {
    statusMove(ctx, move, user, side, foe, foeSide, rng, emit);
    return;
  }

  // De daño.
  const eff = effectiveness(ctx.chart, move.type, foe.types);
  if (eff === 0) {
    emit({ kind: 'immune', side: foeSide });
    return;
  }
  const hits =
    move.minHits && move.maxHits
      ? move.minHits === move.maxHits
        ? move.minHits
        : MULTI_HIT_TABLE[rng.int(0, MULTI_HIT_TABLE.length - 1)]
      : 1;
  let dealt = 0;
  let landed = 0;
  for (let h = 0; h < hits && canFight(foe); h++) {
    const crit = rollCrit(move.critRate, rng);
    const rolls = damageRolls({
      attacker: combatant(user),
      defender: combatant(foe),
      move,
      chart: ctx.chart,
      crit,
    });
    if (crit) emit({ kind: 'crit', side: foeSide });
    dealt += hurt(foe, foeSide, rolls[rng.int(0, 15)], 'move', emit);
    landed++;
  }
  if (eff !== 1) emit({ kind: 'effectiveness', side: foeSide, multiplier: eff });
  if (hits > 1) emit({ kind: 'hits', side: foeSide, count: landed });

  // Drenaje (+) y retroceso (−), sobre el daño hecho.
  if (move.drain > 0 && dealt > 0)
    heal(user, side, Math.max(1, Math.floor((dealt * move.drain) / 100)), emit);
  if (move.drain < 0 && dealt > 0)
    hurt(user, side, Math.max(1, Math.floor((dealt * -move.drain) / 100)), 'recoil', emit);

  // Un ataque de Fuego descongela.
  if (foe.status === 'freeze' && move.type === 'fire' && canFight(foe)) {
    foe.status = null;
    emit({ kind: 'thaw', side: foeSide });
  }
  // Efectos secundarios: estado al rival, cambios de stats, retroceso (solo si iba primero).
  if (
    canFight(foe) &&
    move.ailment &&
    SUPPORTED_AILMENTS.has(move.ailment) &&
    move.ailmentChance > 0
  ) {
    if (rng.int(0, 99) < move.ailmentChance) inflict(move, foe, foeSide, rng, emit, true);
  }
  applyStatChanges(move, user, side, foe, foeSide, rng, emit, true);
  if (canFight(foe) && movesFirst && move.flinchChance > 0 && rng.int(0, 99) < move.flinchChance) {
    foe.volatile.flinch = true;
  }
}

function statusTargetsFoe(move: Move): boolean {
  if (move.healing > 0) return false;
  if (move.ailment && SUPPORTED_AILMENTS.has(move.ailment)) return true;
  return statChangeTarget(move) === 'opponent';
}

function statusMove(
  ctx: BattleContext,
  move: Move,
  user: BattlePokemon,
  side: SideIndex,
  foe: BattlePokemon,
  foeSide: SideIndex,
  rng: Rng,
  emit: (e: BattleEvent) => void,
): void {
  let didSomething = false;
  if (move.ailment && SUPPORTED_AILMENTS.has(move.ailment)) {
    // Onda Trueno respeta la inmunidad de tipo (Eléctrico → Tierra no afecta).
    if (move.ailment === 'paralysis' && effectiveness(ctx.chart, move.type, foe.types) === 0) {
      emit({ kind: 'immune', side: foeSide });
      return;
    }
    const chance = move.ailmentChance > 0 ? move.ailmentChance : 100;
    if (rng.int(0, 99) < chance)
      didSomething = inflict(move, foe, foeSide, rng, emit, false) || didSomething;
  }
  if (move.statChanges.length > 0) {
    didSomething =
      applyStatChanges(move, user, side, foe, foeSide, rng, emit, false) || didSomething;
  }
  if (move.healing > 0) {
    if (user.hp < user.stats.hp) {
      heal(user, side, Math.max(1, Math.floor((user.stats.hp * move.healing) / 100)), emit);
      didSomething = true;
    }
  }
  if (!didSomething) emit({ kind: 'fail', side });
}

/** Aplica un estado. `secondary` = efecto de un ataque (si falla, no se anuncia). Devuelve si se aplicó. */
function inflict(
  move: Move,
  target: BattlePokemon,
  side: SideIndex,
  rng: Rng,
  emit: (e: BattleEvent) => void,
  secondary: boolean,
): boolean {
  if (move.ailment === 'confusion') {
    if (target.volatile.confusion > 0) {
      if (!secondary) emit({ kind: 'fail', side });
      return false;
    }
    target.volatile.confusion = rng.int(2, 5) + 1; // se descuenta antes de cada movimiento: 2-5 turnos confuso
    emit({ kind: 'confused', side });
    return true;
  }
  const status: MajorStatus = move.name === 'toxic' ? 'toxic' : (move.ailment as MajorStatus);
  if (target.status !== null) {
    if (!secondary) emit({ kind: 'fail', side });
    return false;
  }
  if (STATUS_IMMUNE[status].some((t) => target.types.includes(t))) {
    if (!secondary) emit({ kind: 'immune', side });
    return false;
  }
  target.status = status;
  target.statusTurns = status === 'sleep' ? rng.int(1, 3) : status === 'toxic' ? 1 : 0;
  emit({ kind: 'status', side, status });
  return true;
}

function applyStatChanges(
  move: Move,
  user: BattlePokemon,
  side: SideIndex,
  foe: BattlePokemon,
  foeSide: SideIndex,
  rng: Rng,
  emit: (e: BattleEvent) => void,
  secondary: boolean,
): boolean {
  const who = statChangeTarget(move);
  if (who === 'none') return false;
  const [target, targetSide] = who === 'user' ? [user, side] : [foe, foeSide];
  if (!canFight(target)) return false;
  const chance = statChangeChance(move);
  if (chance < 100 && rng.int(0, 99) >= chance) return false;
  let changed = false;
  for (const { stat, change } of move.statChanges) {
    const key = STAGE_OF[stat];
    if (!key) continue;
    const before = target.stages[key];
    const after = clampStage(before + change);
    if (after === before) {
      if (!secondary) emit({ kind: 'stat-limit', side: targetSide, stat: key, up: change > 0 });
      continue;
    }
    target.stages[key] = after;
    emit({ kind: 'stat', side: targetSide, stat: key, change: after - before });
    changed = true;
  }
  return changed;
}

/** Forcejeo: sin PP en nada. Poder 50 sin tipo (golpea a todos, sin STAB) y pierde 1/4 de sus PS máximos. */
function struggle(
  ctx: BattleContext,
  user: BattlePokemon,
  side: SideIndex,
  foe: BattlePokemon,
  foeSide: SideIndex,
  rng: Rng,
  emit: (e: BattleEvent) => void,
): void {
  emit({ kind: 'struggle', side });
  if (!canFight(foe)) return;
  const rolls = damageRolls({
    attacker: { ...combatant(user), types: [] },
    defender: { ...combatant(foe), types: [] },
    move: { type: 'normal', category: 'physical', power: STRUGGLE_POWER },
    chart: ctx.chart,
    crit: false,
  });
  hurt(foe, foeSide, rolls[rng.int(0, 15)], 'struggle', emit);
  hurt(user, side, Math.max(1, Math.floor(user.stats.hp / 4)), 'recoil', emit);
}

function residual(p: BattlePokemon, side: SideIndex, emit: (e: BattleEvent) => void): void {
  const max = p.stats.hp;
  if (p.status === 'burn') hurt(p, side, Math.max(1, Math.floor(max / 16)), 'burn', emit);
  else if (p.status === 'poison') hurt(p, side, Math.max(1, Math.floor(max / 8)), 'poison', emit);
  else if (p.status === 'toxic') {
    hurt(p, side, Math.max(1, Math.floor((max * p.statusTurns) / 16)), 'poison', emit);
    p.statusTurns = Math.min(15, p.statusTurns + 1);
  }
}

/** Anuncia los debilitados (una vez cada uno). */
function checkFaints(
  state: BattleState,
  emit: (e: BattleEvent) => void,
  announced: Set<BattlePokemon>,
): void {
  for (const side of [0, 1] as const) {
    const p = activeOf(state, side);
    if (p.hp === 0 && !announced.has(p)) {
      announced.add(p);
      emit({ kind: 'faint', side });
    }
  }
}

/** Tras el turno: ¿alguien sin Pokémon? ¿alguien debe cambiar? */
function settle(state: BattleState, events: BattleEvent[]): TurnResult {
  const alive = (s: SideIndex) => state.sides[s].team.some(canFight);
  const a0 = alive(0);
  const a1 = alive(1);
  if (!a0 || !a1) {
    // Si caen los dos a la vez (retroceso, Forcejeo), pierde el último en debilitarse.
    const lastFaint = [...events].reverse().find((e) => e.kind === 'faint');
    const winner: SideIndex = !a0 && !a1 ? other(lastFaint?.side ?? 0) : a0 ? 0 : 1;
    state.winner = winner;
    events.push({ kind: 'win', side: winner });
    return { state, events };
  }
  for (const side of [0, 1] as const) {
    if (!canFight(activeOf(state, side))) {
      state.pendingSwitch[side] = true;
      events.push({ kind: 'needs-switch', side });
    }
  }
  return { state, events };
}

function finish(
  state: BattleState,
  events: BattleEvent[],
  winner: SideIndex,
  quitter: SideIndex,
): TurnResult {
  events.push({ kind: 'forfeit', side: quitter });
  state.winner = winner;
  events.push({ kind: 'win', side: winner });
  return { state, events };
}
