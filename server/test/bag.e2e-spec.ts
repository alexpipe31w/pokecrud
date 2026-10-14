import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ProgressionService } from '../src/progression/progression.service.js';
import { cleanupTestPlayers } from './support/cleanup.js';

// e2e de la mochila y la XP (F1-08) contra la base REAL. Cuentas @pokecrud.test, borradas en afterAll.
const DOMAIN = '@pokecrud.test';
const STARTER = [
  { item: 'POKE_BALL', qty: 30 },
  { item: 'GREAT_BALL', qty: 5 },
  { item: 'ULTRA_BALL', qty: 0 },
  { item: 'RAZZ_BERRY', qty: 5 },
];

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.79.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Registered {
  token: string;
  id: string;
}

describe('Mochila y XP (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let progression: ProgressionService;

  const http = () => request(app.getHttpServer());
  const register = async (): Promise<Registered> => {
    const res = await http()
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `bag+${randomUUID()}${DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `b_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    return { token: body.accessToken, id: body.player.id };
  };
  const getBag = (token: string | undefined) => {
    const req = http().get('/bag').set('X-Forwarded-For', nextIp());
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
    progression = app.get(ProgressionService);
  });

  afterAll(async () => {
    await cleanupTestPlayers(prisma, 'bag+');
    await app.close();
  });

  it('sin sesión → 401', async () => {
    await getBag(undefined).expect(401);
  });

  it('un jugador nuevo tiene el kit inicial, y pedirlo otra vez no regala nada', async () => {
    const ash = await register();
    expect((await getBag(ash.token).expect(200)).body).toEqual({
      items: STARTER,
    });
    expect((await getBag(ash.token).expect(200)).body).toEqual({
      items: STARTER,
    });
    const rows = await prisma.inventory.count({ where: { playerId: ash.id } });
    expect(rows).toBe(4);
  });

  it('nunca pisa lo que el jugador ya tiene; a quien no tenga filas le da el kit', async () => {
    const misty = await register();
    await prisma.inventory.update({
      where: { playerId_item: { playerId: misty.id, item: 'POKE_BALL' } },
      data: { qty: 2 },
    });
    const bag = (await getBag(misty.token).expect(200)).body as {
      items: { item: string; qty: number }[];
    };
    expect(bag.items.find((i) => i.item === 'POKE_BALL')?.qty).toBe(2);

    const legacy = await register();
    await prisma.inventory.deleteMany({ where: { playerId: legacy.id } });
    expect((await getBag(legacy.token).expect(200)).body).toEqual({
      items: STARTER,
    });
  });

  it('la base rechaza cantidades negativas o > 999 aunque un bug se salte el código', async () => {
    const brock = await register();
    await getBag(brock.token).expect(200);
    for (const qty of [-1, 1000]) {
      await expect(
        prisma.inventory.update({
          where: { playerId_item: { playerId: brock.id, item: 'POKE_BALL' } },
          data: { qty },
        }),
      ).rejects.toThrow();
    }
  });

  it('addXp: 10 sumas simultáneas de 1.000 → 10.000 XP y nivel 5, y /auth/me lo refleja', async () => {
    const gary = await register();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => progression.addXp(gary.id, 1000)),
    );
    expect(results.filter((r) => r.leveledUp).length).toBeGreaterThan(0);
    const me = await http()
      .get('/auth/me')
      .set('X-Forwarded-For', nextIp())
      .set('Authorization', `Bearer ${gary.token}`)
      .expect(200);
    expect(me.body.player).toMatchObject({ xp: 10_000, level: 5 });
  });

  it('addXp dentro de una transacción que falla no deja XP', async () => {
    const may = await register();
    await expect(
      prisma.$transaction(async (tx) => {
        await progression.addXp(may.id, 5000, tx);
        throw new Error('la captura falló después');
      }),
    ).rejects.toThrow('la captura falló después');
    const p = await prisma.player.findUniqueOrThrow({ where: { id: may.id } });
    expect(p).toMatchObject({ xp: 0, level: 1 });
  });

  it('addXp rechaza cantidades no válidas', async () => {
    const dawn = await register();
    for (const n of [0, -5, 1.5, 100_001]) {
      await expect(progression.addXp(dawn.id, n)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });
});
