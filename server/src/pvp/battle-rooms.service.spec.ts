import { readFileSync } from 'node:fs';
import type { Move, TypeInfo } from '../../../shared/data/dataset.types.js';
import type { PokemonInit } from '../../../shared/engine/battle/battle-engine.js';
import { buildTypeChart } from '../../../shared/engine/battle/type-chart.js';
import {
  PVP_DECISION_MS,
  type BattleEndMsg,
  type BattleStartMsg,
} from '../../../shared/protocol/pvp.js';
import type { BattleDataService } from './battle-data.service.js';
import { BattleRoomsService } from './battle-rooms.service.js';
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
} as BattleDataService;

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

describe('BattleRoomsService (F5-03: empezar, ver y rendirse)', () => {
  let rooms: BattleRoomsService;

  beforeEach(() => (rooms = new BattleRoomsService(data)));

  it('start: crea el combate y manda a cada uno SU vista (él = lado 0) con el apodo del rival', () => {
    const { battleId, out } = rooms.start(
      entrant('ana', [25, 26]),
      entrant('beto', [4]),
    );
    expect(out.map((o) => [o.playerId, o.event])).toEqual([
      ['ana', 'battle:start'],
      ['beto', 'battle:start'],
    ]);
    const [toAna, toBeto] = out.map((o) => o.msg as BattleStartMsg);
    expect(toAna.opponent).toBe('apodo-beto');
    expect(toAna.view.battleId).toBe(battleId);
    expect(toAna.view.me.team.map((p) => p.uid)).toEqual(['ana-0', 'ana-1']);
    expect(toAna.view.foe).toMatchObject({ name: 'apodo-beto', teamSize: 1 });
    expect(toAna.view.foe.revealed.map((p) => p.speciesId)).toEqual([4]);
    expect(toBeto.view.me.team.map((p) => p.uid)).toEqual(['beto-0']);
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

  it('rendirse: gana el otro, los dos reciben battle:end girado y quedan libres', () => {
    const { battleId } = rooms.start(
      entrant('ana', [25]),
      entrant('beto', [4]),
    );
    const out = rooms.forfeit('ana', battleId);
    expect(
      out.map((o) => [o.playerId, o.event, (o.msg as BattleEndMsg).winner]),
    ).toEqual([
      ['ana', 'battle:end', 1],
      ['beto', 'battle:end', 0],
    ]);
    expect((out[0].msg as BattleEndMsg).reason).toBe('forfeit');
    expect(rooms.has('ana')).toBe(false);
    expect(rooms.has('beto')).toBe(false);
  });

  it('rendirse en un combate que no es tuyo o que no existe → battle-not-found', () => {
    const { battleId } = rooms.start(
      entrant('ana', [25]),
      entrant('beto', [4]),
    );
    for (const [player, id] of [
      ['carla', battleId],
      ['ana', '00000000-0000-4000-8000-000000000000'],
    ]) {
      expect(() => rooms.forfeit(player, id)).toThrow(PvpFailure);
    }
    expect(rooms.has('ana')).toBe(true);
  });

  it('sin datos del motor → server-error (no revienta)', () => {
    const broken = new BattleRoomsService({ ctx: null } as BattleDataService);
    expect(() =>
      broken.start(entrant('ana', [25]), entrant('beto', [4])),
    ).toThrow(new PvpFailure('server-error'));
  });
});
