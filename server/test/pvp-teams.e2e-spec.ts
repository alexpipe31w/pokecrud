import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { calcStats, type Stats } from '../../shared/engine/battle/stats.js';
import { PVP_LEVEL } from '../../shared/protocol/pvp.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PvpFailure } from '../src/pvp/pvp-failure.js';
import { PvpTeamsService } from '../src/pvp/pvp-teams.service.js';
import { SpawnsService } from '../src/spawns/spawns.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e del equipo de PvP (F5-03, D-056 regla 1 y 2): `Team.caughtIds` del jugador → PokemonInit[] a nivel 50.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.83.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

const IVS: Stats = {
  hp: 31,
  attack: 20,
  defense: 10,
  specialAttack: 5,
  specialDefense: 15,
  speed: 25,
};

describe('Equipo de PvP (e2e)', { timeout: 60_000 }, () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let teams: PvpTeamsService;
  let spawns: SpawnsService;

  const register = async () => {
    const nickname = `p_${randomUUID().slice(0, 8)}`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `pvp+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname,
      })
      .expect(201);
    return { id: (res.body as { player: { id: string } }).player.id, nickname };
  };
  const caught = async (playerId: string, species: number[]) => {
    const ids = species.map(() => randomUUID());
    await prisma.caughtPokemon.createMany({
      data: ids.map((id, i) => ({
        id,
        playerId,
        speciesId: species[i],
        level: 7,
        ivs: { ...IVS },
        nature: 'adamant',
        gender: 'M' as const,
        shiny: false,
        heightScale: 1,
        moves: [33],
        ball: 'POKE_BALL' as const,
        encounterId: `0_0:1:${i}`,
        caughtLat: 2.9273,
        caughtLng: -75.2819,
        cp: 50,
      })),
    });
    return ids;
  };
  const team = async (playerId: string, caughtIds: string[]) =>
    (
      await prisma.team.create({
        data: { playerId, name: 'PvP', pokemonIds: [], caughtIds },
      })
    ).id;
  const failure = async (p: Promise<unknown>) => {
    const err = await p.then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(PvpFailure);
    return (err as PvpFailure).code;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
    teams = app.get(PvpTeamsService);
    spawns = app.get(SpawnsService);
  }, 90_000);

  afterAll(async () => {
    await cleanupTestPlayers(prisma, 'pvp+');
    await app.close();
  });

  it('equipo propio → en su orden, a nivel 50, con stats de sus IVs y naturaleza y movimientos de nivel 50', async () => {
    const p = await register();
    const ids = await caught(p.id, [6, 25]); // Charizard, Pikachu
    const loaded = await teams.load(p.id, await team(p.id, [ids[1], ids[0]]));
    expect(loaded.name).toBe(p.nickname);
    expect(loaded.team.map((m) => [m.uid, m.speciesId, m.level])).toEqual([
      [ids[1], 25, PVP_LEVEL],
      [ids[0], 6, PVP_LEVEL],
    ]);
    const pikachu = spawns.speciesDetails(25)!;
    expect(loaded.team[0].stats).toEqual(
      calcStats(pikachu.baseStats, IVS, PVP_LEVEL, 'adamant'),
    );
    expect(loaded.team[0].types).toEqual(pikachu.types);
    expect(loaded.team[0].moves).toEqual(spawns.defaultMoves(25, PVP_LEVEL));
    expect(loaded.team[0].moves).not.toEqual([33]);
  });

  it('equipo de otro jugador o inexistente → team-not-found', async () => {
    const a = await register();
    const b = await register();
    const ids = await caught(a.id, [1]);
    const teamA = await team(a.id, ids);
    expect(await failure(teams.load(b.id, teamA))).toBe('team-not-found');
    expect(await failure(teams.load(a.id, 2_000_000_000))).toBe(
      'team-not-found',
    );
  });

  it('un Pokémon que ya no es suyo (transferido) se salta; si no queda ninguno → team-empty', async () => {
    const p = await register();
    const ids = await caught(p.id, [1, 4]);
    const t = await team(p.id, ids);
    await prisma.caughtPokemon.delete({ where: { id: ids[0] } });
    expect((await teams.load(p.id, t)).team.map((m) => m.uid)).toEqual([
      ids[1],
    ]);
    await prisma.caughtPokemon.delete({ where: { id: ids[1] } });
    expect(await failure(teams.load(p.id, t))).toBe('team-empty');
    expect(await failure(teams.load(p.id, await team(p.id, [])))).toBe(
      'team-empty',
    );
  });
});
