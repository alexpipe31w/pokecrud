import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  type ThrowOutcome,
  resolveThrow,
} from '../../shared/engine/capture.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Species } from '../../shared/data/dataset.types.js';
import { calcStats } from '../../shared/engine/battle/stats.js';
import { combatPower } from '../../shared/engine/combat-power.js';
import {
  type Ivs,
  type Nature,
  slotEndsAt,
  slotFor,
} from '../../shared/engine/spawns.js';
import { AppModule } from '../src/app.module.js';
import {
  CAPTURE_XP,
  QUALITY_XP,
  THROW_RESOLVER,
} from '../src/encounters/encounters.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupTestPlayers } from './support/cleanup.js';

// e2e de la captura autoritativa (F2-06) contra la base REAL. Open-Meteo simulado. El RESULTADO del lanzamiento se
// fuerza con THROW_RESOLVER (la fórmula real se prueba en shared/engine/capture.spec.ts); aquí se prueba todo lo
// demás: franja, distancia, gasto atómico, idempotencia, concurrencia y transacción.
const DOMAIN = '@pokecrud.test';
const NEIVA = { lat: 2.9273, lng: -75.2819 };
const CAUGHT: ThrowOutcome = { captured: true, shakes: 3, fled: false };
const MISSED: ThrowOutcome = { captured: false, shakes: 1, fled: false };
const FLED: ThrowOutcome = { captured: false, shakes: 0, fled: true };

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.80.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Spawn {
  id: string;
  speciesId: number;
  lat: number;
  lng: number;
}
interface Player {
  token: string;
  id: string;
}
interface BagItem {
  item: string;
  qty: number;
}

// Base remota: cada prueba hace muchas idas y vueltas.
describe('Encuentros y captura (e2e)', { timeout: 60_000 }, () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  /** Lo que devolverá el próximo lanzamiento; `null` = la fórmula real. */
  let forced: ThrowOutcome | null = null;

  const http = () => request(app.getHttpServer());
  const as = (p: Player | undefined, req: request.Test) =>
    (p ? req.set('Authorization', `Bearer ${p.token}`) : req).set(
      'X-Forwarded-For',
      nextIp(),
    );
  const register = async (): Promise<Player> => {
    const res = await http()
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `enc+${randomUUID()}${DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `e_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    return { token: body.accessToken, id: body.player.id };
  };
  const spawnsAt = async (p: Player, lat: number, lng: number) =>
    (
      (await as(p, http().get(`/spawns?lat=${lat}&lng=${lng}`)).expect(200))
        .body as { spawns: Spawn[] }
    ).spawns;
  /** Jugador nuevo, de pie junto a un Pokémon de Neiva. */
  const playerAtSpawn = async (): Promise<{ p: Player; spawn: Spawn }> => {
    const p = await register();
    const [spawn] = await spawnsAt(p, NEIVA.lat, NEIVA.lng);
    expect(spawn).toBeDefined();
    await spawnsAt(p, spawn.lat, spawn.lng); // guarda la ubicación junto al Pokémon
    return { p, spawn };
  };
  const throwAt = (
    p: Player,
    spawn: Spawn,
    body: Record<string, unknown> = {},
  ) =>
    as(
      p,
      http()
        .post(`/encounters/${encodeURIComponent(spawn.id)}/throw`)
        .send({
          ball: 'POKE_BALL',
          berry: null,
          throwQuality: 'none',
          curve: false,
          clientThrowId: randomUUID(),
          ...body,
        }),
    );
  const qty = async (p: Player, item: string) =>
    (
      (await prisma.inventory.findUnique({
        where: { playerId_item: { playerId: p.id, item: item as never } },
      })) ?? { qty: -1 }
    ).qty;

  beforeAll(async () => {
    // Si la franja de 10 min está a punto de acabar, se espera a la siguiente (si no, 410 a mitad de test).
    const left = slotEndsAt(slotFor(Date.now())) - Date.now();
    if (left < 45_000) await new Promise((r) => setTimeout(r, left + 1000));

    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      (input instanceof Request ? input.url : input.toString()).includes(
        'open-meteo.com',
      )
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                current: { weather_code: 0, wind_speed_10m: 3 },
              }),
            ),
          )
        : realFetch(input, init),
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(THROW_RESOLVER)
      .useValue(
        ((...args: Parameters<typeof resolveThrow>) =>
          forced ?? resolveThrow(...args)) as typeof resolveThrow,
      )
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
  }, 90_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await cleanupTestPlayers(prisma, 'enc+');
    await app.close();
  });

  beforeEach(() => {
    forced = null;
  });

  it('sin sesión → 401; id que no es un spawn → 404; franja pasada → 410', async () => {
    await as(undefined, http().get('/encounters/1_1:1:0')).expect(401);
    const p = await register();
    await spawnsAt(p, NEIVA.lat, NEIVA.lng);
    await as(p, http().get('/encounters/no-es-un-spawn')).expect(404);
    const old = `4181_-107546:${slotFor(Date.now()) - 1}:0`;
    await as(p, http().get(`/encounters/${encodeURIComponent(old)}`)).expect(
      410,
    );
  });

  it('lejos del Pokémon (o sin ubicación reciente) → 403, y no se gasta nada', async () => {
    const p = await register();
    const [spawn] = await spawnsAt(p, NEIVA.lat, NEIVA.lng);
    await spawnsAt(p, NEIVA.lat + 0.01, NEIVA.lng); // ~1,1 km al norte
    await throwAt(p, spawn).expect(403);
    expect(await qty(p, 'POKE_BALL')).toBe(30);

    const nobody = await register(); // nunca pidió /spawns
    await throwAt(nobody, spawn).expect(403);
  });

  it('detalle del encuentro: nivel, sexo, shiny, tamaño y PC, sin IVs', async () => {
    const { p, spawn } = await playerAtSpawn();
    const res = await as(
      p,
      http().get(`/encounters/${encodeURIComponent(spawn.id)}`),
    ).expect(200);
    expect(Object.keys(res.body).sort()).toEqual(
      [
        'cp',
        'expiresAt',
        'gender',
        'heightScale',
        'id',
        'level',
        'shiny',
        'speciesId',
        'status',
      ].sort(),
    );
    expect(res.body).toMatchObject({
      id: spawn.id,
      speciesId: spawn.speciesId,
      status: 'open',
    });
    expect(res.body.heightScale).toBeGreaterThanOrEqual(0.5);
    expect(res.body.heightScale).toBeLessThanOrEqual(1.5);

    // El PC (D-049) es el de sus stats reales: se comprueba con los IVs que el servidor guarda al capturarlo.
    forced = CAUGHT;
    await throwAt(p, spawn).expect(200);
    const [stored] = await prisma.caughtPokemon.findMany({
      where: { playerId: p.id },
    });
    const dataset = JSON.parse(
      readFileSync(
        resolve(process.cwd(), '../src/assets/data/pokedex.json'),
        'utf8',
      ),
    ) as Species[];
    const base = dataset.find((s) => s.id === spawn.speciesId)!.baseStats;
    expect(res.body.cp).toBe(
      combatPower(
        calcStats(
          base,
          stored.ivs as unknown as Ivs,
          stored.level,
          stored.nature as Nature,
        ),
      ),
    );
  });

  it('captura: gasta 1 bola, guarda el Pokémon con los datos del servidor, da XP y no se puede repetir', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = CAUGHT;
    const res = await throwAt(p, spawn, {
      throwQuality: 'great',
      curve: true,
      ball: 'GREAT_BALL',
    }).expect(200);
    const xp = CAPTURE_XP + QUALITY_XP.great + 10;
    expect(res.body).toMatchObject({
      captured: true,
      shakes: 3,
      fled: false,
      throwQuality: 'great',
      xpGained: xp,
    });
    expect(res.body.caught).toMatchObject({ speciesId: spawn.speciesId });
    expect(res.body.caught.moves.length).toBeLessThanOrEqual(4);
    expect(
      (res.body.bag.items as BagItem[]).find((i) => i.item === 'GREAT_BALL')
        ?.qty,
    ).toBe(4);

    const stored = await prisma.caughtPokemon.findMany({
      where: { playerId: p.id },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      speciesId: spawn.speciesId,
      ball: 'GREAT_BALL',
      encounterId: spawn.id,
    });
    const me = await as(p, http().get('/auth/me')).expect(200);
    expect(me.body.player.xp).toBe(xp);

    await throwAt(p, spawn).expect(409);
    expect(await qty(p, 'POKE_BALL')).toBe(30); // el 409 no gastó nada
    const details = await as(
      p,
      http().get(`/encounters/${encodeURIComponent(spawn.id)}`),
    ).expect(200);
    expect(details.body.status).toBe('caught');
  });

  it('reintento con el mismo clientThrowId (en serie y 5 a la vez) → mismo resultado y 1 sola bola', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = MISSED;
    const clientThrowId = randomUUID();
    const first = await throwAt(p, spawn, { clientThrowId }).expect(200);
    const again = await throwAt(p, spawn, { clientThrowId }).expect(200);
    expect(again.body).toEqual(first.body);
    expect(await qty(p, 'POKE_BALL')).toBe(29);

    const burstId = randomUUID();
    const burst = await Promise.all(
      Array.from({ length: 5 }, () =>
        throwAt(p, spawn, { clientThrowId: burstId }),
      ),
    );
    for (const r of burst) expect(r.status).toBe(200);
    expect(new Set(burst.map((r) => JSON.stringify(r.body.shakes))).size).toBe(
      1,
    );
    expect(await qty(p, 'POKE_BALL')).toBe(28);
    expect(await prisma.throw.count({ where: { playerId: p.id } })).toBe(2);
  });

  it('dos lanzamientos distintos a la vez que capturan → solo uno gana; el otro 409 y no gasta su bola', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = CAUGHT;
    const results = await Promise.all([
      throwAt(p, spawn),
      throwAt(p, spawn),
      throwAt(p, spawn),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 409, 409,
    ]);
    expect(
      await prisma.caughtPokemon.count({ where: { playerId: p.id } }),
    ).toBe(1);
    expect(await qty(p, 'POKE_BALL')).toBe(29);
  });

  it('fallo sin huida: gasta bola y baya, no cierra el encuentro; huida: lo cierra', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = MISSED;
    const miss = await throwAt(p, spawn, { berry: 'RAZZ_BERRY' }).expect(200);
    expect(miss.body).toMatchObject({
      captured: false,
      fled: false,
      caught: null,
      xpGained: 0,
    });
    expect(await qty(p, 'POKE_BALL')).toBe(29);
    expect(await qty(p, 'RAZZ_BERRY')).toBe(4);

    forced = FLED;
    await throwAt(p, spawn).expect(200);
    await throwAt(p, spawn).expect(409);
    const details = await as(
      p,
      http().get(`/encounters/${encodeURIComponent(spawn.id)}`),
    ).expect(200);
    expect(details.body.status).toBe('fled');
  });

  it('sin bolas de ese tipo → 409 y nada cambia (la bolsa nunca baja de 0)', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = CAUGHT;
    await throwAt(p, spawn, { ball: 'ULTRA_BALL' }).expect(409); // kit: 0 Ultra
    expect(await qty(p, 'ULTRA_BALL')).toBe(0);
    expect(
      await prisma.caughtPokemon.count({ where: { playerId: p.id } }),
    ).toBe(0);
    expect(await prisma.throw.count({ where: { playerId: p.id } })).toBe(0);
  });

  it('demasiados "excellent" seguidos → el servidor lo cuenta como "great"', async () => {
    const { p, spawn } = await playerAtSpawn();
    await prisma.throw.createMany({
      data: Array.from({ length: 12 }, () => ({
        playerId: p.id,
        clientThrowId: randomUUID(),
        encounterId: '0_0:1:0',
        ball: 'POKE_BALL' as const,
        throwQuality: 'excellent' as const,
        curve: false,
        captured: false,
        shakes: 0,
        fled: false,
        xpGained: 0,
      })),
    });
    forced = MISSED;
    const res = await throwAt(p, spawn, { throwQuality: 'excellent' }).expect(
      200,
    );
    expect(res.body.throwQuality).toBe('great');
    expect(res.body.xpGained).toBe(QUALITY_XP.great);
  });

  it('validación: bola inexistente, baya como bola, campo extra o clientThrowId no UUID → 400', async () => {
    const { p, spawn } = await playerAtSpawn();
    await throwAt(p, spawn, { ball: 'MASTER_BALL' }).expect(400);
    await throwAt(p, spawn, { ball: 'RAZZ_BERRY' }).expect(400);
    await throwAt(p, spawn, { berry: 'POKE_BALL' }).expect(400);
    await throwAt(p, spawn, { captured: true }).expect(400);
    await throwAt(p, spawn, { clientThrowId: 'abc' }).expect(400);
    await throwAt(p, spawn, { throwQuality: 'perfect' }).expect(400);
    expect(await qty(p, 'POKE_BALL')).toBe(30);
  });

  it('con la fórmula real (sin forzar) el lanzamiento se resuelve y queda guardado', async () => {
    const { p, spawn } = await playerAtSpawn();
    const res = await throwAt(p, spawn, { ball: 'GREAT_BALL' }).expect(200);
    expect(typeof res.body.captured).toBe('boolean');
    expect(await prisma.throw.count({ where: { playerId: p.id } })).toBe(1);
    expect(await qty(p, 'GREAT_BALL')).toBe(4);
  });

  // F3-02a (D-052): la captura deja la colección lista (PC, caramelos por familia, Pokédex).
  const familyOfSpecies = (speciesId: number): number => {
    const dataset = JSON.parse(
      readFileSync(
        resolve(process.cwd(), '../src/assets/data/pokedex.json'),
        'utf8',
      ),
    ) as Species[];
    return dataset.find((s) => s.id === speciesId)!.evolutionChainId;
  };
  const pokedexRow = (p: Player, speciesId: number) =>
    prisma.pokedexEntry.findUnique({
      where: { playerId_speciesId: { playerId: p.id, speciesId } },
    });

  it('capturar guarda el PC, suma 3 caramelos a la familia y marca la Pokédex', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = CAUGHT;
    const res = await throwAt(p, spawn).expect(200);
    const familyId = familyOfSpecies(spawn.speciesId);
    expect(res.body.candy).toEqual({ familyId, gained: 3, total: 3 });
    const [row] = await prisma.caughtPokemon.findMany({
      where: { playerId: p.id },
    });
    expect(row.cp).toBeGreaterThanOrEqual(10);
    expect(
      await prisma.candy.findUnique({
        where: { playerId_familyId: { playerId: p.id, familyId } },
      }),
    ).toMatchObject({ qty: 3 });
    const entry = await pokedexRow(p, spawn.speciesId);
    expect(entry).toMatchObject({ caught: true });
    expect(entry!.firstCaughtAt).toBeInstanceOf(Date);
  });

  it('abrir el encuentro lo marca como visto; fallar no da caramelos ni lo marca capturado', async () => {
    const { p, spawn } = await playerAtSpawn();
    await as(
      p,
      http().get(`/encounters/${encodeURIComponent(spawn.id)}`),
    ).expect(200);
    expect(await pokedexRow(p, spawn.speciesId)).toMatchObject({
      caught: false,
      firstCaughtAt: null,
    });
    forced = MISSED;
    const res = await throwAt(p, spawn).expect(200);
    expect(res.body.candy).toBeNull();
    expect(await prisma.candy.count({ where: { playerId: p.id } })).toBe(0);
    expect(await pokedexRow(p, spawn.speciesId)).toMatchObject({
      caught: false,
    });
  });

  it('reintento de una captura con el mismo clientThrowId → mismos caramelos, sin sumar dos veces', async () => {
    const { p, spawn } = await playerAtSpawn();
    forced = CAUGHT;
    const clientThrowId = randomUUID();
    const first = await throwAt(p, spawn, { clientThrowId }).expect(200);
    const again = await throwAt(p, spawn, { clientThrowId }).expect(200);
    expect(again.body.candy).toEqual(first.body.candy);
    expect(
      (await prisma.candy.findMany({ where: { playerId: p.id } })).map(
        (c) => c.qty,
      ),
    ).toEqual([3]);
  });
});
