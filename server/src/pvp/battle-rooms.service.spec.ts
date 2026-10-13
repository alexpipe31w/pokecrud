import { readFileSync } from 'node:fs';
import type { Move, TypeInfo } from '../../../shared/data/dataset.types.js';
import type { PokemonInit } from '../../../shared/engine/battle/battle-engine.js';
import { buildTypeChart } from '../../../shared/engine/battle/type-chart.js';
import {
  PVP_DECISION_MS,
  PVP_RECONNECT_GRACE_MS,
  type BattleEndMsg,
  type BattleStartMsg,
} from '../../../shared/protocol/pvp.js';
import type { BattleDataService } from './battle-data.service.js';
import { BattleRoomsService, type Outgoing } from './battle-rooms.service.js';
import type { BattlesRepository } from './battles.repository.js';
import { PvpFailure } from './pvp-failure.js';
import type { LobbyEntrant } from './pvp-lobby.js';

const load = <T>(file: string): T =>
  JSON.parse(
    readFileSync(
      new URL(`../../../src/assets/data/${file}`, import.meta.url),
      'utf8',
    ),
  ) as T;
const data = {
  ctx: {
    moves: new Map(load<Move[]>('moves.json').map((m) => [m.id, m])),
    chart: buildTypeChart(load<TypeInfo[]>('types.json')),
  },
} as unknown as BattleDataService;

const stats = {
  hp: 110,
  attack: 60,
  defense: 50,
  specialAttack: 70,
  specialDefense: 60,
  speed: 100,
};
const mon = (uid: string, speciesId: number): PokemonInit => ({
  uid,
  speciesId,
  level: 50,
  types: ['normal'],
  stats,
  moves: [33],
});
const entrant = (playerId: string, species: number[]): LobbyEntrant => ({
  playerId,
  side: {
    name: `apodo-${playerId}`,
    team: species.map((s, i) => mon(`${playerId}-${i}`, s)),
  },
});

describe('BattleRoomsService (F5-04: salas BattleRoom, mensajes por el canal y resultado guardado)', () => {
  let rooms: BattleRoomsService;
  let sent: Outgoing[];
  let save: ReturnType<typeof vi.fn>;
  const to = (playerId: string, event: Outgoing['event']) =>
    sent.filter((o) => o.playerId === playerId && o.event === event);

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    save = vi.fn().mockResolvedValue(true);
    rooms = new BattleRoomsService(data, {
      save,
    } as unknown as BattlesRepository);
    rooms.attach((o) => sent.push(o));
  });
  afterEach(() => vi.useRealTimers());

  it('start: manda a cada uno SU vista (él = lado 0) con el apodo del rival', () => {
    const battleId = rooms.start(
      entrant('ana', [25, 26]),
      entrant('beto', [4]),
    );
    expect(sent.map((o) => [o.playerId, o.event])).toEqual([
      ['ana', 'battle:start'],
      ['beto', 'battle:start'],
    ]);
    const [toAna, toBeto] = sent.map((o) => o.msg as BattleStartMsg);
    expect(toAna.opponent).toBe('apodo-beto');
    expect(toAna.view.battleId).toBe(battleId);
    expect(toAna.view.me.team.map((p) => p.uid)).toEqual(['ana-0', 'ana-1']);
    expect(toAna.view.foe.revealed.map((p) => p.speciesId)).toEqual([4]);
    expect(toBeto.view.foe.revealed.map((p) => p.speciesId)).toEqual([25]); // solo el que sale, no Raichu
    expect(toAna.view).toMatchObject({
      decision: 1,
      mustDo: 'act',
      remainingMs: PVP_DECISION_MS,
      winner: null,
    });
  });

  it('has y viewFor (para pvp:hello al reconectar)', () => {
    rooms.start(entrant('ana', [25]), entrant('beto', [4]));
    expect(rooms.has('ana')).toBe(true);
    expect(rooms.has('carla')).toBe(false);
    expect(rooms.viewFor('beto')?.me.team[0].uid).toBe('beto-0');
    expect(rooms.viewFor('carla')).toBeNull();
  });

  it('act: llega a su sala; cuando eligen los dos, battle:turn a cada uno', () => {
    const battleId = rooms.start(entrant('ana', [25]), entrant('beto', [4]));
    const move = { kind: 'move', moveIndex: 0 } as const;
    expect(rooms.act('ana', battleId, 1, move)).toEqual({ duplicate: false });
    expect(rooms.act('ana', battleId, 1, move)).toEqual({ duplicate: true });
    rooms.act('beto', battleId, 1, move);
    expect(to('ana', 'battle:turn')).toHaveLength(1);
    expect(to('beto', 'battle:turn')).toHaveLength(1);
  });

  it('act o rendirse en un combate que no es tuyo o que no existe → battle-not-found', () => {
    const battleId = rooms.start(entrant('ana', [25]), entrant('beto', [4]));
    const move = { kind: 'move', moveIndex: 0 } as const;
    for (const [player, id] of [
      ['carla', battleId],
      ['ana', '00000000-0000-4000-8000-000000000000'],
    ]) {
      expect(() => rooms.act(player, id, 1, move)).toThrow(
        new PvpFailure('battle-not-found'),
      );
      expect(() => rooms.forfeit(player, id)).toThrow(PvpFailure);
    }
    expect(rooms.has('ana')).toBe(true);
  });

  it('rendirse: gana el otro, battle:end girado, quedan libres y el resultado se guarda una vez', () => {
    const battleId = rooms.start(entrant('ana', [25]), entrant('beto', [4]));
    rooms.forfeit('ana', battleId);
    expect(
      sent
        .filter((o) => o.event === 'battle:end')
        .map((o) => [o.playerId, (o.msg as BattleEndMsg).winner]),
    ).toEqual([
      ['ana', 1],
      ['beto', 0],
    ]);
    expect(rooms.has('ana')).toBe(false);
    expect(rooms.has('beto')).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({
      battleId,
      players: ['ana', 'beto'],
      winner: 1,
      reason: 'forfeit',
    });
  });

  it('desconectar y no volver en 60 s → abandono (por el temporizador), libres y guardado', () => {
    rooms.start(entrant('ana', [25]), entrant('beto', [4]));
    rooms.disconnect('beto');
    expect(to('ana', 'battle:opponent')[0].msg).toMatchObject({
      connected: false,
    });
    rooms.reconnect('beto');
    expect(to('ana', 'battle:opponent')[1].msg).toMatchObject({
      connected: true,
    });
    rooms.disconnect('beto');
    vi.advanceTimersByTime(PVP_RECONNECT_GRACE_MS);
    const end = sent.find(
      (o) => o.event === 'battle:end' && o.playerId === 'ana',
    );
    expect(end?.msg).toMatchObject({
      reason: expect.stringMatching(/abandon|inactive/),
    });
    expect(rooms.has('ana')).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    rooms.disconnect('carla'); // sin combate: no hace nada
  });

  it('sin datos del motor → server-error (no revienta)', () => {
    const broken = new BattleRoomsService(
      { ctx: null } as unknown as BattleDataService,
      { save } as unknown as BattlesRepository,
    );
    expect(() =>
      broken.start(entrant('ana', [25]), entrant('beto', [4])),
    ).toThrow(new PvpFailure('server-error'));
  });
});
