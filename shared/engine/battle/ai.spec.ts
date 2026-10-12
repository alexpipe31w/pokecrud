import { readFileSync } from 'node:fs';
import type { Move, Species, TypeInfo } from '../../data/dataset.types.js';
import { TRAINERS, trainerTeam } from '../../data/trainers.js';
import { createRng } from '../rng.js';
import { NATURES } from '../spawns.js';
import { type Difficulty, chooseAction } from './ai.js';
import { type PokemonInit, createBattle, resolveTurn } from './battle-engine.js';
import { defaultMoves, isSupportedMove } from './moves.js';
import { calcStats } from './stats.js';
import { buildTypeChart } from './type-chart.js';
import type { BattleAction, BattleContext, BattleState } from './types.js';

const load = <T>(file: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../../src/assets/data/${file}`, import.meta.url), 'utf8'),
  ) as T;
const pokedex = load<Species[]>('pokedex.json');
const allMoves = load<Move[]>('moves.json');
const ctx: BattleContext = {
  moves: new Map(allMoves.map((m) => [m.id, m])),
  chart: buildTypeChart(load<TypeInfo[]>('types.json')),
};
const supported = new Set(allMoves.filter(isSupportedMove).map((m) => m.id));
const byId = new Map(pokedex.map((s) => [s.id, s]));
const moveId = (name: string) => (allMoves.find((m) => m.name === name) as Move).id;
const IV31 = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };

const mon = (name: string, moves: string[], level = 50): PokemonInit => {
  const s = pokedex.find((p) => p.name === name) as Species;
  return {
    uid: name,
    speciesId: s.id,
    level,
    types: s.types,
    stats: calcStats(s.baseStats, IV31, level, 'hardy'),
    moves: moves.map(moveId),
  };
};
const battle = (a: PokemonInit[], b: PokemonInit[]) =>
  createBattle(ctx, [
    { name: 'IA', team: a },
    { name: 'Rival', team: b },
  ]);
/** Movimiento que elige la IA difícil (lado 0) en 20 semillas: debe ser siempre el mismo si la decisión es clara. */
const hardPicks = (s: BattleState) =>
  new Set(
    Array.from({ length: 20 }, (_, seed) => {
      const a = chooseAction(ctx, s, 0, createRng(seed), 'hard') as BattleAction;
      return a.kind === 'move'
        ? s.sides[0].team[s.sides[0].active].moves[a.moveIndex].moveId
        : `switch:${a.kind === 'switch' ? a.teamIndex : '?'}`;
    }),
  );

describe('decisiones claras (difícil)', () => {
  it('remata con el ataque súper eficaz', () => {
    const s = battle(
      [mon('pikachu', ['growl', 'tackle', 'thunderbolt'])],
      [mon('gyarados', ['splash'])],
    );
    s.sides[1].team[0].hp = 40;
    expect(hardPicks(s)).toEqual(new Set([moveId('thunderbolt')]));
  });

  it('no usa un ataque al que el rival es inmune', () => {
    const s = battle([mon('snorlax', ['body-slam', 'crunch'])], [mon('gengar', ['splash'])]);
    expect(hardPicks(s)).toEqual(new Set([moveId('crunch')]));
  });

  it('duerme a un rival sano y sin estado; no repite estado sobre uno ya quemado', () => {
    const s = battle([mon('breloom', ['spore', 'tackle'])], [mon('snorlax', ['splash'])]);
    expect(hardPicks(s)).toEqual(new Set([moveId('spore')]));
    const burned = structuredClone(s);
    burned.sides[1].team[0].status = 'burn';
    expect(hardPicks(burned)).toEqual(new Set([moveId('tackle')]));
  });

  it('cambia si su activo no puede hacer nada y uno del banquillo arrasa', () => {
    const s = battle(
      [mon('pikachu', ['thunderbolt']), mon('lapras', ['surf'])],
      [mon('golem', ['splash'])],
    );
    expect(hardPicks(s)).toEqual(new Set(['switch:1']));
  });

  it('cambio forzado: saca al que mejor le va; si el que cambia es el otro, no actúa', () => {
    const s = battle(
      [
        mon('pikachu', ['thunderbolt']),
        mon('charizard', ['flamethrower']),
        mon('lapras', ['surf']),
      ],
      [mon('golem', ['splash']), mon('snorlax', ['splash'])],
    );
    s.sides[0].team[0].hp = 0;
    s.pendingSwitch = [true, false];
    expect(chooseAction(ctx, s, 0, createRng(1), 'hard')).toEqual({ kind: 'switch', teamIndex: 2 });
    expect(chooseAction(ctx, s, 1, createRng(1), 'hard')).toBeNull();
  });
});

function randomTeam(seed: number): PokemonInit[] {
  const rng = createRng(seed);
  const pool = pokedex.filter((s) => !s.isLegendary && !s.isMythical);
  return Array.from({ length: 3 }, (_, i) => {
    const s = rng.pick(pool);
    const level = 40;
    return {
      uid: `m${i}`,
      speciesId: s.id,
      level,
      types: s.types,
      stats: calcStats(s.baseStats, IV31, level, rng.pick(NATURES)),
      moves: defaultMoves(s.learnset, level, (id) => supported.has(id)),
    };
  });
}

type Player = Difficulty | 'random';

/** Combate espejo (los dos con el mismo equipo). Devuelve el lado ganador. */
function play(team: PokemonInit[], p0: Player, p1: Player, seed: number): 0 | 1 {
  const rng = createRng(seed);
  let state = createBattle(ctx, [
    { name: 'A', team },
    { name: 'B', team },
  ]);
  const act = (side: 0 | 1, who: Player): BattleAction | null => {
    if (who !== 'random') return chooseAction(ctx, state, side, rng, who);
    if (state.pendingSwitch[0] || state.pendingSwitch[1])
      return chooseAction(ctx, state, side, rng, 'easy');
    const me = state.sides[side].team[state.sides[side].active];
    const usable = me.moves.map((_, i) => i).filter((i) => me.moves[i].pp > 0);
    return { kind: 'move', moveIndex: usable.length ? rng.pick(usable) : 0 };
  };
  for (let steps = 0; state.winner === null; steps++) {
    if (steps > 1000) throw new Error(`Combate ${seed} sin terminar`);
    state = resolveTurn(ctx, state, [act(0, p0), act(1, p1)], rng).state;
  }
  return state.winner;
}

/** % de victorias de `a` contra `b` en `n` combates espejo, alternando lados (el lado 0 no da ventaja). */
function winRate(a: Player, b: Player, n: number): number {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const team = randomTeam(10_000 + i);
    const aSide = (i % 2) as 0 | 1;
    const winner = aSide === 0 ? play(team, a, b, i) : play(team, b, a, i);
    if (winner === aSide) wins++;
  }
  return wins / n;
}

describe('la dificultad se nota (combates espejo con equipos aleatorios)', () => {
  it('difícil gana ≥ 70 % contra fácil en 500 combates', () => {
    const rate = winRate('hard', 'easy', 500);
    console.log(`[F4-06] difícil vs fácil: ${(rate * 100).toFixed(1)} %`);
    expect(rate).toBeGreaterThanOrEqual(0.7);
  }, 120_000);

  it('difícil gana ≥ 75 % contra movimientos al azar, y normal > 60 %', () => {
    const hard = winRate('hard', 'random', 300);
    const normal = winRate('normal', 'random', 300);
    console.log(
      `[F4-06] difícil vs azar: ${(hard * 100).toFixed(1)} % · normal vs azar: ${(normal * 100).toFixed(1)} %`,
    );
    expect(hard).toBeGreaterThanOrEqual(0.75);
    expect(normal).toBeGreaterThan(0.6);
  }, 120_000);

  it('la IA nunca propone una acción imposible (300 combates IA contra IA de todas las dificultades)', () => {
    const levels: Difficulty[] = ['easy', 'normal', 'hard'];
    for (let i = 0; i < 300; i++) {
      expect(() => play(randomTeam(i), levels[i % 3], levels[(i + 1) % 3], i)).not.toThrow();
    }
  }, 120_000);
});

describe('entrenadores de prueba', () => {
  it('los 3 se arman con el dataset: 3 Pokémon, 1-4 movimientos soportados, dificultad creciente', () => {
    expect(TRAINERS.map((t) => t.difficulty)).toEqual(['easy', 'normal', 'hard']);
    let prevLevel = 0;
    for (const t of TRAINERS) {
      const team = trainerTeam(t, byId, (id) => supported.has(id));
      expect(team).toHaveLength(3);
      for (const p of team) {
        expect(p.moves.length).toBeGreaterThanOrEqual(1);
        expect(p.moves.length).toBeLessThanOrEqual(4);
        for (const m of p.moves) expect(supported.has(m)).toBe(true);
      }
      const maxLevel = Math.max(...team.map((p) => p.level));
      expect(maxLevel).toBeGreaterThan(prevLevel);
      prevLevel = maxLevel;
    }
  });

  it('un combate contra cada entrenador termina', () => {
    for (const t of TRAINERS) {
      const rival = trainerTeam(t, byId, (id) => supported.has(id));
      const mine = trainerTeam(TRAINERS[2], byId, (id) => supported.has(id));
      const rng = createRng(7);
      let state = createBattle(ctx, [
        { name: 'Jugador', team: mine },
        { name: t.name, team: rival },
      ]);
      for (let i = 0; state.winner === null && i < 500; i++) {
        state = resolveTurn(
          ctx,
          state,
          [
            chooseAction(ctx, state, 0, rng, 'hard'),
            chooseAction(ctx, state, 1, rng, t.difficulty),
          ],
          rng,
        ).state;
      }
      expect(state.winner).not.toBeNull();
    }
  });
});
