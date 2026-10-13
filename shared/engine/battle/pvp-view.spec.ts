import { readFileSync } from 'node:fs';
import type { Move, TypeInfo } from '../../data/dataset.types.js';
import { type PokemonInit, createBattle } from './battle-engine.js';
import { mirrorSide, viewFor } from './pvp-view.js';
import { buildTypeChart } from './type-chart.js';
import type { BattleContext, BattleState } from './types.js';

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
