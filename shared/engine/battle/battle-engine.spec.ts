import { readFileSync } from 'node:fs';
import type { Move, Species, TypeInfo } from '../../data/dataset.types.js';
import { createRng } from '../rng.js';
import { NATURES } from '../spawns.js';
import { type PokemonInit, createBattle, resolveTurn } from './battle-engine.js';
import { damageRolls } from './damage.js';
import { defaultMoves, isSupportedMove } from './moves.js';
import { calcStats } from './stats.js';
import { buildTypeChart } from './type-chart.js';
import {
  type BattleAction,
  type BattleContext,
  BattleError,
  type BattleEvent,
  type BattleState,
} from './types.js';

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
const moveId = (name: string): number => {
  const m = allMoves.find((x) => x.name === name);
  if (!m) throw new Error(`No está en el dataset: ${name}`);
  return m.id;
};
const IV31 = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };

let uid = 0;
const mon = (name: string, moves: string[], level = 50): PokemonInit => {
  const s = pokedex.find((p) => p.name === name) as Species;
  return {
    uid: `${name}-${uid++}`,
    speciesId: s.id,
    level,
    types: s.types,
    stats: calcStats(s.baseStats, IV31, level, 'hardy'),
    moves: moves.map(moveId),
  };
};
const battle = (a: PokemonInit[], b: PokemonInit[]): BattleState =>
  createBattle(ctx, [
    { name: 'Ash', team: a },
    { name: 'Gary', team: b },
  ]);
const M = (moveIndex = 0): BattleAction => ({ kind: 'move', moveIndex });
const kinds = (events: BattleEvent[]) => events.map((e) => e.kind);

/** Primera semilla (0, 1, 2…) cuyo turno cumple la condición: los tests no dependen de la suerte. */
function seedWhere(
  state: BattleState,
  actions: [BattleAction | null, BattleAction | null],
  pred: (r: ReturnType<typeof resolveTurn>) => boolean,
): ReturnType<typeof resolveTurn> {
  for (let seed = 0; seed < 5000; seed++) {
    const r = resolveTurn(ctx, state, actions, createRng(seed));
    if (pred(r)) return r;
  }
  throw new Error('Ninguna semilla cumple la condición');
}

describe('createBattle', () => {
  it('PS llenos, PP del dataset, sin estados ni etapas', () => {
    const s = battle(
      [mon('pikachu', ['thunderbolt', 'quick-attack'])],
      [mon('gyarados', ['bite'])],
    );
    const p = s.sides[0].team[0];
    expect(p.hp).toBe(p.stats.hp);
    expect(p.moves).toEqual([
      { moveId: moveId('thunderbolt'), pp: 15, maxPp: 15 },
      { moveId: moveId('quick-attack'), pp: 30, maxPp: 30 },
    ]);
    expect(p.status).toBeNull();
    expect(s).toMatchObject({ turn: 0, winner: null, pendingSwitch: [false, false] });
  });

  it('rechaza 0 o 5 movimientos, equipos vacíos o de 7', () => {
    expect(() => battle([mon('pikachu', [])], [mon('gyarados', ['bite'])])).toThrow(BattleError);
    expect(() =>
      battle(
        [mon('pikachu', ['tackle', 'growl', 'tail-whip', 'thunder-shock', 'quick-attack'])],
        [mon('gyarados', ['bite'])],
      ),
    ).toThrow(BattleError);
    expect(() => battle([], [mon('gyarados', ['bite'])])).toThrow(BattleError);
    expect(() =>
      battle(
        Array.from({ length: 7 }, () => mon('pikachu', ['tackle'])),
        [mon('gyarados', ['bite'])],
      ),
    ).toThrow(BattleError);
  });
});

describe('resolveTurn: reglas generales', () => {
  it('no muta el estado de entrada y es determinista con la misma semilla', () => {
    const s = battle([mon('pikachu', ['thunderbolt'])], [mon('gyarados', ['bite'])]);
    const before = structuredClone(s);
    const a = resolveTurn(ctx, s, [M(), M()], createRng(42));
    expect(s).toEqual(before);
    expect(resolveTurn(ctx, s, [M(), M()], createRng(42))).toEqual(a);
    expect(a.state.turn).toBe(1);
  });

  it('el más rápido actúa antes; la prioridad gana a la velocidad', () => {
    const s = battle([mon('snorlax', ['tackle', 'quick-attack'])], [mon('jolteon', ['tackle'])]);
    const slow = resolveTurn(ctx, s, [M(0), M(0)], createRng(1)).events.filter(
      (e) => e.kind === 'move',
    );
    expect(slow.map((e) => e.side)).toEqual([1, 0]);
    const prio = resolveTurn(ctx, s, [M(1), M(0)], createRng(1)).events.filter(
      (e) => e.kind === 'move',
    );
    expect(prio.map((e) => e.side)).toEqual([0, 1]);
  });

  it('daño = una de las 16 tiradas de damage.ts, con aviso de eficacia; resta PP', () => {
    const s = battle([mon('pikachu', ['thunderbolt'])], [mon('gyarados', ['splash'])]);
    const r = seedWhere(
      s,
      [M(), M()],
      (x) => !x.events.some((e) => e.kind === 'crit' || e.kind === 'miss'),
    );
    const dmg = r.events.find((e) => e.kind === 'damage' && e.side === 1) as Extract<
      BattleEvent,
      { kind: 'damage' }
    >;
    const p = s.sides[0].team[0];
    const g = s.sides[1].team[0];
    const rolls = damageRolls({
      attacker: { level: 50, types: p.types, stats: p.stats, stages: p.stages, burned: false },
      defender: { level: 50, types: g.types, stats: g.stats, stages: g.stages, burned: false },
      move: ctx.moves.get(moveId('thunderbolt')) as Move,
      chart: ctx.chart,
      crit: false,
    });
    expect(rolls).toContain(dmg.amount);
    expect(r.events).toContainEqual({ kind: 'effectiveness', side: 1, multiplier: 4 });
    expect(r.state.sides[0].team[0].moves[0].pp).toBe(14);
  });

  it('inmunidad de tipo: no hace daño', () => {
    const s = battle([mon('snorlax', ['body-slam'])], [mon('gengar', ['splash'])]);
    const r = resolveTurn(ctx, s, [M(), M()], createRng(3));
    expect(r.events).toContainEqual({ kind: 'immune', side: 1 });
    expect(r.state.sides[1].team[0].hp).toBe(s.sides[1].team[0].hp);
  });
});

describe('estados', () => {
  it('Onda Trueno paraliza; no afecta a Tierra ni a Eléctrico; no se pisa un estado', () => {
    const s = battle([mon('pikachu', ['thunder-wave'])], [mon('snorlax', ['splash'])]);
    const r = seedWhere(s, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(r.events).toContainEqual({ kind: 'status', side: 1, status: 'paralysis' });
    const again = seedWhere(r.state, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(again.events).toContainEqual({ kind: 'fail', side: 0 });

    const ground = battle([mon('pikachu', ['thunder-wave'])], [mon('sandshrew', ['splash'])]);
    expect(resolveTurn(ctx, ground, [M(), M()], createRng(0)).events).toContainEqual({
      kind: 'immune',
      side: 1,
    });
    const electric = battle([mon('pikachu', ['thunder-wave'])], [mon('raichu', ['splash'])]);
    const re = seedWhere(electric, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(re.events).toContainEqual({ kind: 'immune', side: 1 });
  });

  it('parálisis: a veces no se mueve (≈25 %) y va más lento', () => {
    // Persian (115 de velocidad base) es más rápido que Pikachu (90) hasta que se paraliza.
    let s = battle([mon('pikachu', ['thunder-wave', 'tackle'])], [mon('persian', ['splash'])]);
    s = seedWhere(s, [M(0), M()], (x) => x.state.sides[1].team[0].status === 'paralysis').state;
    let stuck = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const r = resolveTurn(ctx, s, [M(1), M()], createRng(seed));
      if (r.events.some((e) => e.kind === 'cant-move' && e.reason === 'paralysis')) stuck++;
      // Persian paralizado (velocidad a la mitad) va después de Pikachu
      expect(r.events.find((e) => e.kind === 'move' || e.kind === 'cant-move')?.side).toBe(0);
    }
    expect(stuck / 2000).toBeCloseTo(0.25, 1);
  });

  it('Tóxico: daño creciente 1/16, 2/16, 3/16… y Veneno/Acero son inmunes', () => {
    let s = battle([mon('gengar', ['toxic'])], [mon('snorlax', ['splash'])]);
    const r = seedWhere(s, [M(), M()], (x) => x.state.sides[1].team[0].status === 'toxic');
    const max = s.sides[1].team[0].stats.hp;
    const poison = (x: typeof r) =>
      x.events
        .filter((e) => e.kind === 'damage' && e.source === 'poison')
        .map((e) => (e as { amount: number }).amount);
    expect(poison(r)).toEqual([Math.floor(max / 16)]);
    s = r.state;
    const t2 = resolveTurn(ctx, s, [M(), M()], createRng(1));
    expect(poison(t2)).toEqual([Math.floor((max * 2) / 16)]);

    const steel = battle([mon('gengar', ['toxic'])], [mon('steelix', ['splash'])]);
    const rs = seedWhere(steel, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(rs.events).toContainEqual({ kind: 'immune', side: 1 });
  });

  it('quemado: −1/16 por turno, ataques físicos a la mitad; Fuego es inmune', () => {
    const s = battle([mon('charizard', ['will-o-wisp'])], [mon('machamp', ['splash'])]);
    const r = seedWhere(s, [M(), M()], (x) => x.state.sides[1].team[0].status === 'burn');
    const max = s.sides[1].team[0].stats.hp;
    expect(r.events).toContainEqual({
      kind: 'damage',
      side: 1,
      amount: Math.floor(max / 16),
      hpAfter: max - Math.floor(max / 16),
      source: 'burn',
    });
    const fire = battle([mon('charizard', ['will-o-wisp'])], [mon('arcanine', ['splash'])]);
    const rf = seedWhere(fire, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(rf.events).toContainEqual({ kind: 'immune', side: 1 });
  });

  it('sueño: 1-3 turnos sin moverse (cuenta el turno en que lo duermen si aún no se movió) y luego actúa', () => {
    // Breloom (70) es más rápido que Snorlax (30): Espora va primero y Snorlax ya pierde ese turno.
    const start = battle([mon('breloom', ['spore'])], [mon('snorlax', ['tackle'])]);
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(seed);
      let r = resolveTurn(ctx, start, [M(), M()], rng);
      expect(r.state.sides[1].team[0].status).toBe('sleep');
      let asleep = 0;
      for (let t = 0; t < 6 && r.state.sides[1].team[0].status === 'sleep'; t++) {
        asleep += r.events.filter(
          (e) => e.kind === 'cant-move' && e.side === 1 && e.reason === 'sleep',
        ).length;
        r = resolveTurn(ctx, r.state, [M(), M()], rng);
      }
      asleep += r.events.filter(
        (e) => e.kind === 'cant-move' && e.side === 1 && e.reason === 'sleep',
      ).length;
      expect(asleep).toBeGreaterThanOrEqual(1);
      expect(asleep).toBeLessThanOrEqual(3);
      expect(kinds(r.events)).toContain('wake');
      expect(r.events).toContainEqual({ kind: 'move', side: 1, moveId: moveId('tackle') });
    }
  });

  it('confusión: a veces se golpea a sí mismo y se le pasa en 2-5 turnos', () => {
    const s = battle([mon('gengar', ['confuse-ray'])], [mon('snorlax', ['tackle'])]);
    const r = seedWhere(s, [M(), M()], (x) => x.events.some((e) => e.kind === 'confused'));
    const hit = seedWhere(r.state, [M(), M()], (x) =>
      x.events.some((e) => e.kind === 'confusion-hit'),
    );
    expect(hit.events).toContainEqual(
      expect.objectContaining({ kind: 'damage', side: 1, source: 'confusion' }),
    );
    let st = r.state;
    let turns = 0;
    while (st.sides[1].team[0].volatile.confusion > 0 && turns < 10) {
      st = resolveTurn(ctx, st, [M(), M()], createRng(100 + turns)).state;
      turns++;
    }
    expect(turns).toBeGreaterThanOrEqual(2);
    expect(turns).toBeLessThanOrEqual(6);
  });
});

describe('cambios de stats y efectos', () => {
  it('Danza Espada sube +2 hasta +6 y luego avisa del tope; Gruñido baja al rival', () => {
    let s = battle([mon('scizor', ['swords-dance'])], [mon('snorlax', ['growl'])]);
    for (const expected of [2, 4, 6]) {
      s = resolveTurn(ctx, s, [M(), M()], createRng(expected)).state;
      expect(s.sides[0].team[0].stages.attack).toBe(expected - expected / 2);
    }
    // Gruñido de Snorlax le quita 1 cada turno: 2−1, 4−2, 6−3
    const r = resolveTurn(ctx, s, [M(), M()], createRng(7));
    expect(r.events).toContainEqual({ kind: 'stat', side: 0, stat: 'attack', change: 2 });
  });

  it('tope de +6 → stat-limit', () => {
    let s = battle([mon('scizor', ['swords-dance'])], [mon('snorlax', ['splash'])]);
    for (let i = 0; i < 3; i++) s = resolveTurn(ctx, s, [M(), M()], createRng(i)).state;
    expect(s.sides[0].team[0].stages.attack).toBe(6);
    const r = resolveTurn(ctx, s, [M(), M()], createRng(5));
    expect(r.events).toContainEqual({ kind: 'stat-limit', side: 0, stat: 'attack', up: true });
    expect(r.events).toContainEqual({ kind: 'fail', side: 0 });
  });

  it('A Bocajarro baja las defensas del USUARIO (D-029)', () => {
    const s = battle([mon('machamp', ['close-combat'])], [mon('snorlax', ['splash'])]);
    const r = seedWhere(s, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(r.state.sides[0].team[0].stages).toMatchObject({ defense: -1, specialDefense: -1 });
    expect(r.state.sides[1].team[0].stages.defense).toBe(0);
  });

  it('Gigadrenado cura la mitad del daño; Doble Filo quita un tercio al usuario', () => {
    const s = battle([mon('venusaur', ['giga-drain'])], [mon('golem', ['tackle'])]);
    s.sides[0].team[0].hp = 20; // con la vida llena no hay nada que curar
    const r = seedWhere(
      s,
      [M(), M()],
      (x) => x.events.some((e) => e.kind === 'heal') && !x.events.some((e) => e.kind === 'crit'),
    );
    const dealt = (r.events.find((e) => e.kind === 'damage' && e.side === 1) as { amount: number })
      .amount;
    expect(r.events).toContainEqual(
      expect.objectContaining({ kind: 'heal', side: 0, amount: Math.floor(dealt / 2) }),
    );

    const de = battle([mon('snorlax', ['double-edge'])], [mon('blissey', ['splash'])]);
    const rd = seedWhere(de, [M(), M()], (x) =>
      x.events.some((e) => e.kind === 'damage' && e.source === 'recoil'),
    );
    const hit = (rd.events.find((e) => e.kind === 'damage' && e.side === 1) as { amount: number })
      .amount;
    expect(rd.events).toContainEqual(
      expect.objectContaining({
        kind: 'damage',
        side: 0,
        source: 'recoil',
        amount: Math.floor((hit * 33) / 100),
      }),
    );
  });

  it('multigolpe: Doble Patada 2; Ataque Furia 2-5 con reparto 35/35/15/15', () => {
    const s = battle([mon('hitmonlee', ['double-kick'])], [mon('snorlax', ['splash'])]);
    const r = seedWhere(s, [M(), M()], (x) => !x.events.some((e) => e.kind === 'miss'));
    expect(r.events).toContainEqual({ kind: 'hits', side: 1, count: 2 });

    const fa = battle([mon('beedrill', ['fury-attack'])], [mon('snorlax', ['splash'])]);
    const counts = new Map<number, number>();
    let landed = 0;
    for (let seed = 0; seed < 4000; seed++) {
      const ev = resolveTurn(ctx, fa, [M(), M()], createRng(seed)).events.find(
        (e) => e.kind === 'hits',
      );
      if (ev && ev.kind === 'hits') {
        counts.set(ev.count, (counts.get(ev.count) ?? 0) + 1);
        landed++;
      }
    }
    expect([...counts.keys()].sort()).toEqual([2, 3, 4, 5]);
    expect((counts.get(2) ?? 0) / landed).toBeCloseTo(0.35, 1);
    expect((counts.get(5) ?? 0) / landed).toBeCloseTo(0.15, 1);
  });

  it('retroceso del rival (Mordisco): solo si el que muerde va primero', () => {
    const fast = battle([mon('persian', ['bite'])], [mon('snorlax', ['tackle'])]);
    let flinched = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const r = resolveTurn(ctx, fast, [M(), M()], createRng(seed));
      if (r.events.some((e) => e.kind === 'cant-move' && e.reason === 'flinch')) flinched++;
    }
    expect(flinched / 2000).toBeGreaterThan(0.2);
    const slow = battle([mon('snorlax', ['bite'])], [mon('persian', ['tackle'])]);
    for (let seed = 0; seed < 500; seed++) {
      const r = resolveTurn(ctx, slow, [M(), M()], createRng(seed));
      expect(r.events.some((e) => e.kind === 'cant-move' && e.reason === 'flinch')).toBe(false);
    }
  });

  it('Recuperación cura la mitad; con la vida llena falla', () => {
    const s = battle([mon('starmie', ['recover'])], [mon('snorlax', ['splash'])]);
    expect(resolveTurn(ctx, s, [M(), M()], createRng(0)).events).toContainEqual({
      kind: 'fail',
      side: 0,
    });
    const hurtState = structuredClone(s);
    hurtState.sides[0].team[0].hp = 10;
    const r = resolveTurn(ctx, hurtState, [M(), M()], createRng(0));
    expect(r.events).toContainEqual(
      expect.objectContaining({
        kind: 'heal',
        side: 0,
        amount: Math.floor(s.sides[0].team[0].stats.hp / 2),
      }),
    );
  });

  it('sin PP en ningún movimiento → Forcejeo con retroceso de 1/4', () => {
    const s = battle([mon('pikachu', ['thunderbolt'])], [mon('snorlax', ['splash'])]);
    s.sides[0].team[0].moves[0].pp = 0;
    const r = resolveTurn(ctx, s, [M(), M()], createRng(0));
    expect(kinds(r.events)).toContain('struggle');
    expect(r.events).toContainEqual(
      expect.objectContaining({
        kind: 'damage',
        side: 0,
        source: 'recoil',
        amount: Math.floor(s.sides[0].team[0].stats.hp / 4),
      }),
    );
  });
});

describe('debilitados, cambios y final', () => {
  const ko = () => {
    const s = battle(
      [mon('pikachu', ['thunderbolt']), mon('raichu', ['thunderbolt'])],
      [mon('gyarados', ['splash']), mon('snorlax', ['splash'])],
    );
    s.sides[1].team[0].hp = 1;
    return s;
  };

  it('al debilitarse: faint + needs-switch; el siguiente turno solo admite cambiar, y no cuenta como turno', () => {
    const r = seedWhere(ko(), [M(), M()], (x) => x.events.some((e) => e.kind === 'faint'));
    expect(kinds(r.events)).toEqual(expect.arrayContaining(['faint', 'needs-switch']));
    expect(r.state.pendingSwitch).toEqual([false, true]);
    expect(() => resolveTurn(ctx, r.state, [null, M()], createRng(0))).toThrow(BattleError);
    const sw = resolveTurn(ctx, r.state, [null, { kind: 'switch', teamIndex: 1 }], createRng(0));
    expect(sw.events).toEqual([{ kind: 'switch', side: 1, teamIndex: 1 }]);
    expect(sw.state.turn).toBe(r.state.turn);
    expect(sw.state.pendingSwitch).toEqual([false, false]);
  });

  it('sin más Pokémon → win, y después no se puede seguir', () => {
    const s = battle([mon('pikachu', ['thunderbolt'])], [mon('gyarados', ['splash'])]);
    s.sides[1].team[0].hp = 1;
    const r = seedWhere(s, [M(), M()], (x) => x.state.winner !== null);
    expect(r.state.winner).toBe(0);
    expect(r.events.at(-1)).toEqual({ kind: 'win', side: 0 });
    expect(() => resolveTurn(ctx, r.state, [M(), M()], createRng(0))).toThrow(BattleError);
  });

  it('rendirse → gana el otro', () => {
    const s = battle([mon('pikachu', ['thunderbolt'])], [mon('gyarados', ['splash'])]);
    const r = resolveTurn(ctx, s, [{ kind: 'forfeit' }, M()], createRng(0));
    expect(r.events).toEqual([
      { kind: 'forfeit', side: 0 },
      { kind: 'win', side: 1 },
    ]);
  });

  it('acciones imposibles → BattleError', () => {
    const s = ko();
    expect(() => resolveTurn(ctx, s, [M(3), M()], createRng(0))).toThrow(BattleError);
    expect(() =>
      resolveTurn(ctx, s, [{ kind: 'switch', teamIndex: 0 }, M()], createRng(0)),
    ).toThrow(BattleError);
    expect(() =>
      resolveTurn(ctx, s, [{ kind: 'switch', teamIndex: 5 }, M()], createRng(0)),
    ).toThrow(BattleError);
    const fainted = structuredClone(s);
    fainted.sides[0].team[1].hp = 0;
    expect(() =>
      resolveTurn(ctx, fainted, [{ kind: 'switch', teamIndex: 1 }, M()], createRng(0)),
    ).toThrow(BattleError);
    const twoMoves = battle(
      [mon('pikachu', ['thunderbolt', 'quick-attack'])],
      [mon('gyarados', ['splash'])],
    );
    twoMoves.sides[0].team[0].moves[0].pp = 0;
    expect(() => resolveTurn(ctx, twoMoves, [M(0), M()], createRng(0))).toThrow(BattleError);
    expect(() => resolveTurn(ctx, s, [null, M()], createRng(0))).toThrow(BattleError);
  });

  it('al cambiar se pierden las etapas y la confusión (el estado principal se queda)', () => {
    const s = battle(
      [mon('pikachu', ['tackle']), mon('raichu', ['tackle'])],
      [mon('snorlax', ['splash'])],
    );
    s.sides[0].team[0].stages.attack = 4;
    s.sides[0].team[0].volatile.confusion = 3;
    s.sides[0].team[0].status = 'burn';
    const r = resolveTurn(ctx, s, [{ kind: 'switch', teamIndex: 1 }, M()], createRng(0));
    const out = r.state.sides[0].team[0];
    expect(out.stages.attack).toBe(0);
    expect(out.volatile.confusion).toBe(0);
    expect(out.status).toBe('burn');
    expect(r.state.sides[0].active).toBe(1);
  });
});

describe('propiedad: combates aleatorios', () => {
  const supported = new Set(allMoves.filter(isSupportedMove).map((m) => m.id));
  const candidates = pokedex.filter((s) => !s.isLegendary && !s.isMythical);

  function randomTeam(rng: ReturnType<typeof createRng>, size: number): PokemonInit[] {
    return Array.from({ length: size }, (_, i) => {
      const s = rng.pick(candidates);
      const level = rng.int(20, 60);
      const ivs = {
        hp: rng.int(0, 31),
        attack: rng.int(0, 31),
        defense: rng.int(0, 31),
        specialAttack: rng.int(0, 31),
        specialDefense: rng.int(0, 31),
        speed: rng.int(0, 31),
      };
      return {
        uid: `r${i}`,
        speciesId: s.id,
        level,
        types: s.types,
        stats: calcStats(s.baseStats, ivs, level, rng.pick(NATURES)),
        moves: defaultMoves(s.learnset, level, (id) => supported.has(id)),
      };
    });
  }

  function randomAction(
    state: BattleState,
    side: 0 | 1,
    rng: ReturnType<typeof createRng>,
  ): BattleAction | null {
    const s = state.sides[side];
    const bench = s.team.map((p, i) => i).filter((i) => i !== s.active && s.team[i].hp > 0);
    if (state.pendingSwitch[0] || state.pendingSwitch[1]) {
      return state.pendingSwitch[side] ? { kind: 'switch', teamIndex: rng.pick(bench) } : null;
    }
    const active = s.team[s.active];
    if (bench.length > 0 && rng.chance(0.1)) return { kind: 'switch', teamIndex: rng.pick(bench) };
    const usable = active.moves.map((m, i) => i).filter((i) => active.moves[i].pp > 0);
    return { kind: 'move', moveIndex: usable.length > 0 ? rng.pick(usable) : 0 };
  }

  it('1.000 combates 3 vs 3 terminan siempre (< 500 turnos), sin errores y con PS en [0, máx]', () => {
    let totalTurns = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const rng = createRng(seed);
      let state = createBattle(ctx, [
        { name: 'A', team: randomTeam(rng, 3) },
        { name: 'B', team: randomTeam(rng, 3) },
      ]);
      let steps = 0;
      while (state.winner === null) {
        state = resolveTurn(
          ctx,
          state,
          [randomAction(state, 0, rng), randomAction(state, 1, rng)],
          rng,
        ).state;
        for (const side of state.sides) {
          for (const p of side.team) {
            expect(p.hp >= 0 && p.hp <= p.stats.hp).toBe(true);
            for (const m of p.moves) expect(m.pp >= 0 && m.pp <= m.maxPp).toBe(true);
          }
        }
        if (++steps > 1000) throw new Error(`Combate ${seed} sin terminar`);
      }
      expect(state.turn).toBeLessThan(500);
      totalTurns += state.turn;
    }
    expect(totalTurns / 1000).toBeGreaterThan(3);
  }, 120_000);
});

describe('registro completo con semilla fija', () => {
  it('mismo combate → mismos eventos (instantánea)', () => {
    let state = battle(
      [
        mon('charizard', ['flamethrower', 'air-slash', 'dragon-claw', 'will-o-wisp']),
        mon('pikachu', ['thunderbolt', 'quick-attack']),
      ],
      [
        mon('blastoise', ['surf', 'bite', 'ice-beam', 'hydro-pump']),
        mon('venusaur', ['giga-drain', 'sludge-bomb']),
      ],
    );
    const rng = createRng(2026);
    const log: BattleEvent[][] = [];
    const script: [BattleAction | null, BattleAction | null][] = [
      [M(3), M(0)],
      [M(0), M(1)],
      [M(1), M(2)],
      [M(0), M(0)],
      [M(2), M(0)],
    ];
    for (const actions of script) {
      if (state.winner !== null) break;
      const pending = state.pendingSwitch;
      const fixed: [BattleAction | null, BattleAction | null] =
        pending[0] || pending[1]
          ? [
              pending[0] ? { kind: 'switch', teamIndex: 1 } : null,
              pending[1] ? { kind: 'switch', teamIndex: 1 } : null,
            ]
          : (actions.map((a, side) =>
              a && a.kind === 'move'
                ? M(a.moveIndex % state.sides[side].team[state.sides[side].active].moves.length)
                : a,
            ) as [BattleAction | null, BattleAction | null]);
      const r = resolveTurn(ctx, state, fixed, rng);
      log.push(r.events);
      state = r.state;
    }
    expect(log).toMatchSnapshot();
  });
});
