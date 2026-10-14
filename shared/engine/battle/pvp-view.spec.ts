import { readFileSync } from 'node:fs';
import type { Move, TypeInfo } from '../../data/dataset.types.js';
import { type PokemonInit, createBattle, resolveTurn } from './battle-engine.js';
import { createRng } from '../rng.js';
import { defaultAction, eventsFor, mirrorSide, viewFor } from './pvp-view.js';
import { buildTypeChart } from './type-chart.js';
import type { BattleAction, BattleContext, BattleEvent, BattleState } from './types.js';

const load = <T>(file: string): T =>
  JSON.parse(
    readFileSync(new URL(`../../../src/assets/data/${file}`, import.meta.url), 'utf8'),
  ) as T;
const allMoves = load<Move[]>('moves.json');
const ctx: BattleContext = {
  moves: new Map(allMoves.map((m) => [m.id, m])),
  chart: buildTypeChart(load<TypeInfo[]>('types.json')),
};
const stats = {
  hp: 120,
  attack: 80,
  defense: 70,
  specialAttack: 90,
  specialDefense: 75,
  speed: 101,
};
const mon = (uid: string, speciesId: number): PokemonInit => ({
  uid,
  speciesId,
  level: 50,
  types: ['electric'],
  stats,
  moves: [33, 84],
});

function battle(): BattleState {
  return createBattle(ctx, [
    { name: 'ana', team: [mon('a0', 25), mon('a1', 26)] },
    { name: 'beto', team: [mon('b0', 4), mon('b1', 5), mon('b2', 6)] },
  ]);
}

describe('viewFor (PvP, D-056)', () => {
  it('tú eres el lado 0 con tu equipo completo; del rival solo lo revelado', () => {
    const state = battle();
    const v = viewFor(state, 1, {
      battleId: 'b-1',
      decision: 1,
      mustDo: 'act',
      remainingMs: 30_000,
      revealed: new Set([0]),
    });
    expect(v.me).toEqual(state.sides[1]);
    expect(v.me).not.toBe(state.sides[1]); // copia: la vista no comparte objetos con la sala
    expect(v.foe).toEqual({
      name: 'ana',
      teamSize: 2,
      fainted: 0,
      active: 0,
      revealed: [
        {
          teamIndex: 0,
          speciesId: 25,
          level: 50,
          types: ['electric'],
          hp: 120,
          maxHp: 120,
          status: null,
        },
      ],
    });
    expect(v).toMatchObject({ battleId: 'b-1', turn: 0, decision: 1, mustDo: 'act', winner: null });
  });

  it('nunca filtra movimientos, PP, stats, IVs ni uid del rival', () => {
    const state = battle();
    const foe = viewFor(state, 0, {
      battleId: 'b',
      decision: null,
      mustDo: 'wait',
      remainingMs: 0,
      revealed: new Set([0, 1, 2]),
    }).foe;
    const json = JSON.stringify(foe);
    for (const leak of ['moves', 'pp', 'attack', 'speed', 'ivs', 'uid', 'stages', 'b0'])
      expect(json).not.toContain(leak);
    expect(foe.revealed).toHaveLength(3);
  });

  it('cuenta los debilitados del rival y el ganador va girado (0 = tú)', () => {
    const state = battle();
    state.sides[0].team[0].hp = 0;
    state.winner = 1;
    const opts = {
      battleId: 'b',
      decision: null,
      mustDo: 'wait' as const,
      remainingMs: 0,
      revealed: new Set([0]),
    };
    expect(viewFor(state, 1, opts).foe.fainted).toBe(1);
    expect(viewFor(state, 1, opts).winner).toBe(0);
    expect(viewFor(state, 0, opts).winner).toBe(1);
  });

  it('mirrorSide gira el lado según quién mira', () => {
    expect(mirrorSide(0, 0)).toBe(0);
    expect(mirrorSide(1, 0)).toBe(1);
    expect(mirrorSide(0, 1)).toBe(1);
    expect(mirrorSide(1, 1)).toBe(0);
  });
});

describe('eventsFor (PvP, D-056)', () => {
  it('quien mira es el lado 0: los lados de los eventos se giran; girar dos veces deja lo mismo', () => {
    const events: BattleEvent[] = [
      { kind: 'move', side: 0, moveId: 33 },
      { kind: 'damage', side: 1, amount: 10, hpAfter: 90, source: 'move' },
      { kind: 'faint', side: 1 },
    ];
    const state = battle();
    expect(eventsFor(events, state, 0)).toEqual(events);
    const seen = eventsFor(events, state, 1);
    expect(seen.map((e) => e.side)).toEqual([1, 0, 0]);
    expect(eventsFor(seen as BattleEvent[], state, 1)).toEqual(events);
  });

  it('el cambio trae el Pokémon que sale (lo público), sacado del estado de antes del turno', () => {
    const state = battle();
    state.sides[1].team[2].hp = 77;
    const [e] = eventsFor([{ kind: 'switch', side: 1, teamIndex: 2 }], state, 0);
    expect(e).toEqual({
      kind: 'switch',
      side: 1,
      teamIndex: 2,
      pokemon: {
        teamIndex: 2,
        speciesId: 6,
        level: 50,
        types: ['electric'],
        hp: 77,
        maxHp: 120,
        status: null,
      },
    });
    expect(JSON.stringify(e)).not.toContain('moves');
  });

  it('un combate entero visto desde el lado 1 = los mismos eventos con los lados cambiados', () => {
    let state = battle();
    const rng = createRng(7);
    for (let turn = 0; turn < 40 && state.winner === null; turn++) {
      const actions = ([0, 1] as const).map((side) =>
        state.pendingSwitch[0] || state.pendingSwitch[1]
          ? state.pendingSwitch[side]
            ? defaultAction(state, side)
            : null
          : defaultAction(state, side),
      ) as [BattleAction | null, BattleAction | null];
      const r = resolveTurn(ctx, state, actions, rng);
      const mine = eventsFor(r.events, state, 0);
      const theirs = eventsFor(r.events, state, 1);
      expect(theirs.map((e) => e.kind)).toEqual(mine.map((e) => e.kind));
      expect(theirs.map((e) => 1 - e.side)).toEqual(mine.map((e) => e.side));
      state = r.state;
    }
    expect(state.winner).not.toBeNull();
  });
});

describe('defaultAction (se juega al acabarse el tiempo)', () => {
  it('el primer movimiento con PP', () => {
    const state = battle();
    expect(defaultAction(state, 0)).toEqual({ kind: 'move', moveIndex: 0 });
    state.sides[0].team[0].moves[0].pp = 0;
    expect(defaultAction(state, 0)).toEqual({ kind: 'move', moveIndex: 1 });
  });

  it('sin PP en ninguno: el índice 0 (el motor lo convierte en Forcejeo)', () => {
    const state = battle();
    for (const m of state.sides[0].team[0].moves) m.pp = 0;
    expect(defaultAction(state, 0)).toEqual({ kind: 'move', moveIndex: 0 });
  });

  it('en un cambio forzado: el primer Pokémon en pie que no está en combate', () => {
    const state = battle();
    state.sides[1].team[0].hp = 0;
    state.sides[1].team[1].hp = 0;
    state.pendingSwitch[1] = true;
    expect(defaultAction(state, 1)).toEqual({ kind: 'switch', teamIndex: 2 });
  });
});
