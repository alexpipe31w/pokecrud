import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { BattleResult } from '../src/pvp/battle-room.js';
import { BattlesRepository } from '../src/pvp/battles.repository.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e de la tabla Battle (F5-04, D-056 regla 10): el resultado de un combate PvP se guarda una vez aunque se reintente.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.83.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

describe('Battle (e2e)', { timeout: 60_000 }, () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let repo: BattlesRepository;

  const register = async (): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `btl+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `b_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    return (res.body as { player: { id: string } }).player.id;
  };
  const result = (
    players: [string, string],
    over: Partial<BattleResult> = {},
  ): BattleResult => ({
    battleId: randomUUID(),
    players,
    winner: 0,
    reason: 'faint',
    seed: 4242,
    turns: 7,
    log: [
      {
        decision: 1,
        actions: [
          { kind: 'move', moveIndex: 0 },
          { kind: 'move', moveIndex: 1 },
        ],
        timedOut: [false, true],
      },
    ],
    startedAt: new Date('2026-10-13T20:00:00Z'),
    endedAt: new Date('2026-10-13T20:05:00Z'),
    ...over,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
    repo = app.get(BattlesRepository);
  }, 90_000);

  afterAll(async () => {
    await cleanupTestPlayers(prisma, 'btl+');
    await app.close();
  });

  it('guarda el combate con quién ganó, el motivo, la semilla y el registro; reintentarlo no duplica', async () => {
    const players: [string, string] = [await register(), await register()];
    const r = result(players);
    await repo.save(r);
    await repo.save(r);
    const rows = await prisma.battle.findMany({ where: { id: r.battleId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'PVP',
      p1Id: players[0],
      p2Id: players[1],
      winnerId: players[0],
      reason: 'faint',
      seed: 4242,
      turns: 7,
      log: r.log,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
    });
  });

  it('sin ganador (los dos se fueron) → winnerId null; gana el lado 1 → winnerId = p2', async () => {
    const players: [string, string] = [await register(), await register()];
    const none = result(players, { winner: null, reason: 'abandon' });
    const second = result(players, { winner: 1, reason: 'forfeit' });
    await repo.save(none);
    await repo.save(second);
    expect(
      (await prisma.battle.findUniqueOrThrow({ where: { id: none.battleId } }))
        .winnerId,
    ).toBeNull();
    expect(
      (
        await prisma.battle.findUniqueOrThrow({
          where: { id: second.battleId },
        })
      ).winnerId,
    ).toBe(players[1]);
  });

  it('la base no admite un ganador que no jugó (CHECK)', async () => {
    const players: [string, string] = [await register(), await register()];
    const outsider = await register();
    await expect(
      prisma.battle.create({
        data: {
          id: randomUUID(),
          kind: 'PVP',
          p1Id: players[0],
          p2Id: players[1],
          winnerId: outsider,
          reason: 'faint',
          seed: 1,
          turns: 1,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});
