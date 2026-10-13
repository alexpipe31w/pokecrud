import { readFileSync } from 'node:fs';
import type { Move, TypeInfo } from '../../../shared/data/dataset.types.js';
import {
  type PokemonInit,
  createBattle,
  resolveTurn,
} from '../../../shared/engine/battle/battle-engine.js';
import { defaultAction } from '../../../shared/engine/battle/pvp-view.js';
import { buildTypeChart } from '../../../shared/engine/battle/type-chart.js';
import type {
  BattleAction,
  BattleContext,
  BattleState,
} from '../../../shared/engine/battle/types.js';
import { createRng } from '../../../shared/engine/rng.js';
import {
  PVP_DECISION_MS,
  PVP_RECONNECT_GRACE_MS,
} from '../../../shared/protocol/pvp.js';
import {
  type BattleResult,
  BattleRoom,
  type RoomOutgoing,
} from './battle-room.js';
import { PvpFailure } from './pvp-failure.js';

const load = <T>(file: string): T =>
  JSON.parse(
    readFileSync(
      new URL(`../../../src/assets/data/${file}`, import.meta.url),
      'utf8',
    ),
  ) as T;
const ctx: BattleContext = {
  moves: new Map(load<Move[]>('moves.json').map((m) => [m.id, m])),
  chart: buildTypeChart(load<TypeInfo[]>('types.json')),
};
const mon = (uid: string, speciesId: number, speed: number): PokemonInit => ({
  uid,
  speciesId,
  level: 50,
  types: ['normal'],
  stats: {
    hp: 200,
    attack: 70,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed,
  },
  moves: [33, 45], // Placaje, Gruñido
});
const initial = (): BattleState =>
  createBattle(ctx, [
    { name: 'ana', team: [mon('a0', 19, 90), mon('a1', 20, 80)] },
    { name: 'beto', team: [mon('b0', 16, 60), mon('b1', 17, 50)] },
  ]);
const MOVE: BattleAction = { kind: 'move', moveIndex: 0 };

function setup(seed = 1) {
  const sent: RoomOutgoing[] = [];
  const ended: BattleResult[] = [];
  const room = new BattleRoom({
    battleId: 'b-1',
    players: ['ana', 'beto'],
    state: initial(),
    ctx,
    seed,
    send: (o) => sent.push(o),
    onEnd: (r) => ended.push(r),
  });
  const of = (playerId: string, event: RoomOutgoing['event']) =>
    sent.filter((o) => o.playerId === playerId && o.event === event);
  const failure = (fn: () => unknown) => {
    try {
      fn();
    } catch (err) {
      return err instanceof PvpFailure ? err.code : String(err);
    }
    return 'sin error';
  };
  return { room, sent, ended, of, failure };
}

describe('BattleRoom (F5-04, D-056)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('abre la decisión 1 para los dos con 30 s; cuando actúan los dos se resuelve y llega battle:turn girado', () => {
    const { room, of } = setup();
    expect(room.view(0)).toMatchObject({
      decision: 1,
      mustDo: 'act',
      remainingMs: PVP_DECISION_MS,
    });
    expect(room.act('ana', 1, MOVE)).toEqual({ duplicate: false });
    expect(room.view(0)).toMatchObject({ decision: null, mustDo: 'wait' });
    expect(of('ana', 'battle:turn')).toHaveLength(0);
    room.act('beto', 1, MOVE);
    const [ana] = of('ana', 'battle:turn');
    const [beto] = of('beto', 'battle:turn');
    expect(ana.msg).toMatchObject({ battleId: 'b-1', view: { decision: 2 } });
    if (ana.event !== 'battle:turn' || beto.event !== 'battle:turn')
      throw new Error('tipo');
    expect(beto.msg.events.map((e) => 1 - e.side)).toEqual(
      ana.msg.events.map((e) => e.side),
    );
  });

  it('la misma decisión dos veces → duplicate (la primera manda); una vieja → stale-decision', () => {
    const { room, failure, of } = setup();
    room.act('ana', 1, MOVE);
    expect(room.act('ana', 1, { kind: 'move', moveIndex: 1 })).toEqual({
      duplicate: true,
    });
    room.act('beto', 1, MOVE);
    expect(of('ana', 'battle:turn')).toHaveLength(1);
    expect(failure(() => room.act('ana', 1, MOVE))).toBe('stale-decision');
    expect(failure(() => room.act('ana', 7, MOVE))).toBe('bad-request');
  });

  it('una acción imposible → invalid-action y la decisión sigue abierta', () => {
    const { room, failure } = setup();
    expect(
      failure(() => room.act('ana', 1, { kind: 'switch', teamIndex: 0 })),
    ).toBe('invalid-action');
    expect(
      failure(() => room.act('ana', 1, { kind: 'move', moveIndex: 9 })),
    ).toBe('invalid-action');
    expect(room.act('ana', 1, MOVE)).toEqual({ duplicate: false });
  });

  it('quien no está en el combate → battle-not-found', () => {
    const { room, failure } = setup();
    expect(failure(() => room.act('intruso', 1, MOVE))).toBe(
      'battle-not-found',
    );
  });

  it('tras un debilitado solo elige quien debe cambiar; el otro → not-your-turn', () => {
    const { room, failure } = setup();
    // Beto pierde a su primer Pokémon a base de Placajes de Ana (Ana es más rápida).
    let guard = 0;
    while (room.view(1).mustDo !== 'switch' && guard++ < 50) {
      const d = room.view(0).decision!;
      room.act('ana', d, MOVE);
      room.act('beto', d, { kind: 'move', moveIndex: 1 });
    }
    expect(room.view(1).mustDo).toBe('switch');
    expect(room.view(0).mustDo).toBe('wait');
    const d = room.view(1).decision!;
    expect(failure(() => room.act('ana', d, MOVE))).toBe('not-your-turn');
    expect(failure(() => room.act('beto', d, MOVE))).toBe('invalid-action');
    room.act('beto', d, { kind: 'switch', teamIndex: 1 });
    expect(room.view(0)).toMatchObject({ mustDo: 'act', decision: d + 1 });
    expect(room.view(0).foe.revealed.map((p) => p.teamIndex)).toEqual([0, 1]);
  });

  it('al acabarse los 30 s se juega la acción por defecto; 3 seguidas → pierde por inactive', () => {
    const { room, ended, of } = setup();
    vi.advanceTimersByTime(PVP_DECISION_MS - 1);
    expect(of('ana', 'battle:turn')).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(of('ana', 'battle:turn')).toHaveLength(1);
    // Ana elige a tiempo; Beto deja correr el reloj dos veces más.
    for (let i = 0; i < 2; i++) {
      room.act('ana', room.view(0).decision!, MOVE);
      vi.advanceTimersByTime(PVP_DECISION_MS);
    }
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ winner: 0, reason: 'inactive' });
    expect(of('beto', 'battle:end')[0].msg).toMatchObject({
      winner: 1,
      reason: 'inactive',
    });
    expect(ended[0].log[0].timedOut).toEqual([true, true]);
  });

  it('desconectado: el rival lo sabe; volver a los 59 s sigue; 60 s fuera → abandon', () => {
    const { room, ended, of } = setup();
    room.disconnect('beto');
    expect(of('ana', 'battle:opponent')[0].msg).toEqual({
      battleId: 'b-1',
      connected: false,
      graceMs: PVP_RECONNECT_GRACE_MS,
    });
    // Mientras está fuera el combate sigue: Ana elige y por Beto se juega la acción por defecto.
    vi.advanceTimersByTime(29_000);
    room.act('ana', 1, MOVE);
    vi.advanceTimersByTime(1_000);
    expect(of('ana', 'battle:turn')).toHaveLength(1);
    vi.advanceTimersByTime(29_000); // 59 s fuera
    room.reconnect('beto');
    expect(of('ana', 'battle:opponent')[1].msg).toMatchObject({
      connected: true,
      graceMs: 0,
    });
    room.act('beto', 2, MOVE);
    room.act('ana', 2, MOVE);
    vi.advanceTimersByTime(5_000); // pasa el minuto desde que se fue: sigue
    expect(room.ended).toBe(false);

    room.disconnect('beto');
    for (let t = 0; t < PVP_RECONNECT_GRACE_MS; t += 10_000) {
      const d = room.view(0).decision;
      if (d !== null) room.act('ana', d, MOVE);
      vi.advanceTimersByTime(10_000);
    }
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ winner: 0, reason: 'abandon' });
  });

  it('si se van los dos → nadie gana', () => {
    const { room, ended } = setup();
    room.disconnect('ana');
    room.disconnect('beto');
    vi.advanceTimersByTime(PVP_RECONNECT_GRACE_MS);
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({ winner: null, reason: 'abandon' });
  });

  it('rendirse (también por battle:act) → gana el otro; después la sala no admite nada', () => {
    const { room, ended, of, failure } = setup();
    room.act('beto', 1, { kind: 'forfeit' });
    expect(ended[0]).toMatchObject({ winner: 0, reason: 'forfeit' });
    expect(of('ana', 'battle:end')[0].msg).toMatchObject({ winner: 0 });
    expect(of('beto', 'battle:end')[0].msg).toMatchObject({ winner: 1 });
    expect(room.ended).toBe(true);
    expect(failure(() => room.act('ana', 1, MOVE))).toBe('battle-not-found');
    vi.advanceTimersByTime(10 * PVP_DECISION_MS);
    expect(ended).toHaveLength(1);
  });

  it('un combate entero con semilla fija = el mismo resultado que resolveTurn en local, y se guarda el registro', () => {
    const { room, ended } = setup(4242);
    let state = initial();
    const rng = createRng(4242);
    let guard = 0;
    while (!room.ended && guard++ < 200) {
      const actions = ([0, 1] as const).map((side) =>
        room.view(side).mustDo === 'wait' ? null : defaultAction(state, side),
      ) as [BattleAction | null, BattleAction | null];
      const d = room.view(0).decision ?? room.view(1).decision!;
      actions.forEach((a, side) => {
        if (a) room.act(side === 0 ? 'ana' : 'beto', d, a);
      });
      state = resolveTurn(ctx, state, actions, rng).state;
    }
    expect(ended).toHaveLength(1);
    expect(ended[0]).toMatchObject({
      reason: 'faint',
      winner: state.winner,
      seed: 4242,
      turns: state.turn,
      players: ['ana', 'beto'],
    });
    expect(ended[0].log.length).toBeGreaterThan(state.turn - 1);
  });
});
