import type { Move } from '../../data/dataset.types.js';
import type { Rng } from '../rng.js';
import { STAGE_OF } from './battle-engine.js';
import { type Combatant, damageRolls, hitChance } from './damage.js';
import { SUPPORTED_AILMENTS, statChangeChance, statChangeTarget } from './moves.js';
import { effectiveness } from './type-chart.js';
import type {
  BattleAction,
  BattleContext,
  BattlePokemon,
  BattleState,
  MajorStatus,
  SideIndex,
} from './types.js';

/**
 * IA rival (F4-06, plan F4, D-032). Pura y con el RNG del combate: misma situación + misma semilla = misma decisión.
 * Puntúa cada opción por "cuánto acerca la victoria" en PS del rival:
 * - ataque: daño esperado (precisión × daño medio × golpes), con premio grande si lo debilita seguro;
 * - estado alterado: una fracción de los PS del rival si aún no tiene estado y no es inmune;
 * - subir stats propias / bajar las del rival: valor pequeño, solo al principio (vida alta, etapas bajas);
 * - curarse: lo que recupera, si le falta más de la mitad;
 * - cambiar (normal y difícil): si su activo apenas hace daño y uno del banquillo lo hace mucho mejor.
 * La dificultad añade ruido: fácil 40 % de acciones al azar, normal 15 %, difícil 0 %.
 */
export type Difficulty = 'easy' | 'normal' | 'hard';

export const RANDOM_CHANCE: Readonly<Record<Difficulty, number>> = {
  easy: 0.4,
  normal: 0.15,
  hard: 0,
};

const KO_BONUS = 1000;
/** Valor de cada estado como fracción de los PS máximos del rival. */
const STATUS_VALUE: Readonly<Record<MajorStatus | 'confusion', number>> = {
  sleep: 0.4,
  paralysis: 0.3,
  burn: 0.3,
  toxic: 0.3,
  poison: 0.2,
  freeze: 0.4,
  confusion: 0.15,
};
const STATUS_IMMUNE: Readonly<Record<string, readonly string[]>> = {
  burn: ['fire'],
  paralysis: ['electric'],
  poison: ['poison', 'steel'],
  toxic: ['poison', 'steel'],
  freeze: ['ice'],
};

const active = (state: BattleState, side: SideIndex): BattlePokemon =>
  state.sides[side].team[state.sides[side].active];

const combatant = (p: BattlePokemon): Combatant => ({
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
});

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Daño esperado de un ataque (sin crítico) y si debilita seguro (la tirada mínima basta y no puede fallar). */
export function expectedDamage(
  ctx: BattleContext,
  user: BattlePokemon,
  foe: BattlePokemon,
  move: Move,
): { expected: number; sureKo: boolean } {
  const rolls = damageRolls({
    attacker: combatant(user),
    defender: combatant(foe),
    move,
    chart: ctx.chart,
    crit: false,
  });
  if (rolls.length === 0) return { expected: 0, sureKo: false };
  const hits =
    move.minHits && move.maxHits ? (move.minHits === move.maxHits ? move.minHits : 3.1) : 1;
  const acc = hitChance(move.accuracy, user.stages.accuracy, foe.stages.evasion);
  const expected = Math.min(foe.hp, avg(rolls) * hits) * acc;
  const sureKo = acc >= 1 && Math.min(...rolls) * Math.floor(hits) >= foe.hp;
  return { expected, sureKo };
}

/** Puntuación de un movimiento en la situación actual (mayor = mejor). */
export function scoreMove(
  ctx: BattleContext,
  user: BattlePokemon,
  foe: BattlePokemon,
  move: Move,
): number {
  if (move.category !== 'status') {
    const { expected, sureKo } = expectedDamage(ctx, user, foe, move);
    // Si debilita seguro, mejor con prioridad (no le deja responder).
    return sureKo ? KO_BONUS + move.priority * 10 + expected : expected;
  }
  const acc = hitChance(move.accuracy, user.stages.accuracy, foe.stages.evasion);
  let score = 0;
  if (move.ailment && SUPPORTED_AILMENTS.has(move.ailment)) {
    const status = move.name === 'toxic' ? 'toxic' : move.ailment;
    const immune =
      (STATUS_IMMUNE[status] ?? []).some((t) => foe.types.includes(t as never)) ||
      (status === 'paralysis' && effectiveness(ctx.chart, move.type, foe.types) === 0);
    const already = status === 'confusion' ? foe.volatile.confusion > 0 : foe.status !== null;
    // Con el rival casi debilitado no compensa gastar el turno.
    if (!immune && !already && foe.hp > foe.stats.hp * 0.3) {
      score += STATUS_VALUE[status as MajorStatus | 'confusion'] * foe.stats.hp * acc;
    }
  }
  const who = statChangeTarget(move);
  if (who !== 'none') {
    const target = who === 'user' ? user : foe;
    const chance = statChangeChance(move) / 100;
    const useful = move.statChanges.reduce((sum, c) => {
      const key = STAGE_OF[c.stat];
      if (!key) return sum;
      const stage = target.stages[key];
      // Subir lo propio sirve hasta +2; bajar lo del rival, hasta −2. Pasado eso, apenas.
      const room =
        who === 'user'
          ? c.change > 0
            ? Math.max(0, 2 - stage)
            : 0
          : c.change < 0
            ? Math.max(0, stage + 2)
            : 0;
      return sum + Math.min(Math.abs(c.change), room);
    }, 0);
    if (useful > 0 && user.hp > user.stats.hp * 0.6)
      score += useful * 0.12 * foe.stats.hp * chance * (who === 'opponent' ? acc : 1);
  }
  if (move.healing > 0 && user.hp < user.stats.hp * 0.5) {
    score += Math.min(user.stats.hp - user.hp, (user.stats.hp * move.healing) / 100);
  }
  return score;
}

/** Lo mejor que puede hacer `p` contra `foe` (para decidir cambios). */
function bestScore(ctx: BattleContext, p: BattlePokemon, foe: BattlePokemon): number {
  let best = 0;
  for (const slot of p.moves) {
    if (slot.pp <= 0) continue;
    const m = ctx.moves.get(slot.moveId);
    if (m) best = Math.max(best, scoreMove(ctx, p, foe, m));
  }
  return best;
}

/** Cuánto le pega el rival a `p` por tipos (su STAB contra los tipos de `p`). */
function threat(ctx: BattleContext, foe: BattlePokemon, p: BattlePokemon): number {
  return Math.max(...foe.types.map((t) => effectiveness(ctx.chart, t, p.types)));
}

function randomAction(state: BattleState, side: SideIndex, rng: Rng): BattleAction {
  const me = active(state, side);
  const usable = me.moves.map((_, i) => i).filter((i) => me.moves[i].pp > 0);
  return { kind: 'move', moveIndex: usable.length ? rng.pick(usable) : 0 };
}

/** Acción del lado `side`, o `null` si en este turno no le toca (el otro está cambiando un debilitado). */
export function chooseAction(
  ctx: BattleContext,
  state: BattleState,
  side: SideIndex,
  rng: Rng,
  difficulty: Difficulty,
): BattleAction | null {
  const mySide = state.sides[side];
  const foe = active(state, side === 0 ? 1 : 0);
  const bench = mySide.team
    .map((_, i) => i)
    .filter((i) => i !== mySide.active && mySide.team[i].hp > 0);

  if (state.pendingSwitch[0] || state.pendingSwitch[1]) {
    if (!state.pendingSwitch[side]) return null;
    // Sale el que mejor le va contra el activo rival (también en fácil: elegir al azar a quién sacar no es divertido).
    const pick = [...bench].sort(
      (a, b) =>
        bestScore(ctx, mySide.team[b], foe) / (1 + threat(ctx, foe, mySide.team[b])) -
        bestScore(ctx, mySide.team[a], foe) / (1 + threat(ctx, foe, mySide.team[a])),
    )[0];
    return { kind: 'switch', teamIndex: pick };
  }

  if (rng.next() < RANDOM_CHANCE[difficulty]) return randomAction(state, side, rng);

  const me = active(state, side);
  if (!me.moves.some((m) => m.pp > 0)) return { kind: 'move', moveIndex: 0 }; // Forcejeo

  // Cambiar: si su activo apenas hace nada y uno del banquillo haría el triple (y no le amenazan más).
  if (difficulty !== 'easy' && bench.length > 0) {
    const current = bestScore(ctx, me, foe);
    const best = bench
      .map((i) => ({
        i,
        score: bestScore(ctx, mySide.team[i], foe),
        threat: threat(ctx, foe, mySide.team[i]),
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (
      current < foe.hp * 0.15 &&
      best.score > Math.max(current * 3, foe.hp * 0.3) &&
      best.threat <= threat(ctx, foe, me)
    ) {
      return { kind: 'switch', teamIndex: best.i };
    }
  }

  let bestIndex = -1;
  let bestValue = -Infinity;
  me.moves.forEach((slot, i) => {
    if (slot.pp <= 0) return;
    const m = ctx.moves.get(slot.moveId);
    if (!m) return;
    // Un poco de ruido para desempatar y no ser 100 % previsible (no cambia una decisión clara).
    const value = scoreMove(ctx, me, foe, m) * (1 + rng.next() * 0.05);
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  });
  return { kind: 'move', moveIndex: Math.max(0, bestIndex) };
}
