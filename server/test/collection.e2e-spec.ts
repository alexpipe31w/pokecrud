import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Species } from '../../shared/data/dataset.types.js';
import { type Stats, calcStats } from '../../shared/engine/battle/stats.js';
import type { Nature } from '../../shared/engine/spawns.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e de la colección (F3-02a, D-052). Las capturas se insertan directamente en la base (la captura en sí se prueba
// en encounters.e2e-spec.ts): aquí se prueba la paginación por cursor, el orden, los filtros y que lo ajeno no sale.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.81.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Player {
  token: string;
  id: string;
}
interface Item {
  id: string;
  speciesId: number;
  cp: number;
  shiny: boolean;
  favorite: boolean;
  caughtAt: string;
}
interface Page {
  items: Item[];
  nextCursor: string | null;
  total: number;
}

describe('Colección (e2e)', { timeout: 60_000 }, () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

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
        email: `col+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `c_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    return { token: body.accessToken, id: body.player.id };
  };

  /** Inserta `n` capturas válidas; `over(i)` cambia lo que haga falta de la i-ésima. */
  const seedCaught = async (
    p: Player,
    n: number,
    over: (i: number) => Partial<{
      speciesId: number;
      cp: number | null;
      shiny: boolean;
      favorite: boolean;
      caughtAt: Date;
    }> = () => ({}),
  ) => {
    await prisma.caughtPokemon.createMany({
      data: Array.from({ length: n }, (_, i) => ({
        playerId: p.id,
        speciesId: 25,
        level: 10,
        ivs: {
          hp: 10,
          attack: 10,
          defense: 10,
          specialAttack: 10,
          specialDefense: 10,
          speed: 10,
        },
        nature: 'hardy',
        gender: 'M' as const,
        shiny: false,
        heightScale: 1,
        moves: [33],
        ball: 'POKE_BALL' as const,
        encounterId: `0_0:1:${i}`,
        caughtLat: 2.9273,
        caughtLng: -75.2819,
        cp: 100 + i,
        caughtAt: new Date(Date.UTC(2026, 9, 1, 0, i)),
        ...over(i),
      })),
    });
  };

  /** Todas las páginas de una consulta, siguiendo el cursor. */
  const allPages = async (p: Player, query: string) => {
    const pages: Page[] = [];
    let cursor: string | null = null;
    do {
      const q: string = cursor ? `${query}&cursor=${cursor}` : query;
      const res = await as(p, http().get(`/collection?${q}`)).expect(200);
      pages.push(res.body as Page);
      cursor = (res.body as Page).nextCursor;
    } while (cursor && pages.length < 20);
    return pages;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
  }, 90_000);

  afterAll(async () => {
    await cleanupTestPlayers(prisma, 'col+');
    await app.close();
  });

  it('sin sesión → 401; con sesión y nada capturado → lista vacía', async () => {
    await as(undefined, http().get('/collection')).expect(401);
    const p = await register();
    const res = await as(p, http().get('/collection')).expect(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, total: 0 });
  });

  it('35 capturas → 30 + 5 con cursor, sin repetidos ni huecos, lo último capturado primero', async () => {
    const p = await register();
    await seedCaught(p, 35);
    const pages = await allPages(p, 'limit=30');
    expect(pages.map((pg) => pg.items.length)).toEqual([30, 5]);
    expect(pages[1].nextCursor).toBeNull();
    expect(pages[0].total).toBe(35);
    const items = pages.flatMap((pg) => pg.items);
    expect(new Set(items.map((i) => i.id)).size).toBe(35);
    const dates = items.map((i) => i.caughtAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(Object.keys(items[0]).sort()).toEqual(
      [
        'caughtAt',
        'cp',
        'favorite',
        'gender',
        'id',
        'level',
        'nickname',
        'shiny',
        'speciesId',
      ].sort(),
    );
  });

  it('orden por PC con empates: no crece en ninguna página y el cursor no repite ni salta', async () => {
    const p = await register();
    await seedCaught(p, 23, (i) => ({ cp: 100 + (i % 4) * 10 }));
    const items = (await allPages(p, 'sort=cp&order=desc&limit=5')).flatMap(
      (pg) => pg.items,
    );
    expect(items).toHaveLength(23);
    expect(new Set(items.map((i) => i.id)).size).toBe(23);
    for (let i = 1; i < items.length; i++)
      expect(items[i].cp).toBeLessThanOrEqual(items[i - 1].cp);
  });

  it('un PC sin calcular (captura de antes de F3-02a) sale calculado, nunca null', async () => {
    const p = await register();
    await seedCaught(p, 1, () => ({ cp: null }));
    const res = await as(p, http().get('/collection')).expect(200);
    expect((res.body as Page).items[0].cp).toBeGreaterThanOrEqual(10);
  });

  it('filtros: tipo, shiny y favorito, con el total filtrado', async () => {
    const p = await register();
    // 4 Charmander (fuego), 1 Bulbasaur (planta/veneno) shiny y favorito, 1 Squirtle (agua) favorito.
    await seedCaught(p, 6, (i) =>
      i < 4
        ? { speciesId: 4 }
        : i === 4
          ? { speciesId: 1, shiny: true, favorite: true }
          : { speciesId: 7, favorite: true },
    );
    const fire = (await as(p, http().get('/collection?type=fire')).expect(200))
      .body as Page;
    expect(fire.total).toBe(4);
    expect(fire.items.every((i) => i.speciesId === 4)).toBe(true);
    const poison = (
      await as(p, http().get('/collection?type=poison')).expect(200)
    ).body as Page;
    expect(poison.items.map((i) => i.speciesId)).toEqual([1]);
    const shiny = (
      await as(p, http().get('/collection?shiny=true')).expect(200)
    ).body as Page;
    expect(shiny.items.map((i) => i.speciesId)).toEqual([1]);
    const fav = (
      await as(
        p,
        http().get('/collection?favorite=true&sort=speciesId&order=asc'),
      ).expect(200)
    ).body as Page;
    expect(fav.items.map((i) => i.speciesId)).toEqual([1, 7]);
    const notFav = (
      await as(p, http().get('/collection?favorite=false')).expect(200)
    ).body as Page;
    expect(notFav.total).toBe(4);
  });

  it('lo de otro jugador no sale nunca, ni usando su id como cursor', async () => {
    const a = await register();
    const b = await register();
    await seedCaught(a, 3);
    await seedCaught(b, 2);
    const mine = (await as(b, http().get('/collection')).expect(200))
      .body as Page;
    expect(mine.total).toBe(2);
    const someoneElse = await prisma.caughtPokemon.findFirstOrThrow({
      where: { playerId: a.id },
    });
    await as(b, http().get(`/collection?cursor=${someoneElse.id}`)).expect(400);
  });

  it('validación: limit fuera de 1-50, orden o tipo desconocido, cursor no UUID, campo extra → 400', async () => {
    const p = await register();
    for (const q of [
      'limit=51',
      'limit=0',
      'sort=nombre',
      'order=up',
      'type=luz',
      'shiny=quizas',
      'cursor=no-uuid',
      'otra=1',
    ]) {
      await as(p, http().get(`/collection?${q}`)).expect(400);
    }
  });

  it('GET /pokedex: solo especies vistas, con capturado o no', async () => {
    const p = await register();
    await as(undefined, http().get('/pokedex')).expect(401);
    expect((await as(p, http().get('/pokedex')).expect(200)).body).toEqual({
      entries: [],
    });
    await prisma.pokedexEntry.createMany({
      data: [
        {
          playerId: p.id,
          speciesId: 25,
          caught: true,
          firstCaughtAt: new Date(),
        },
        { playerId: p.id, speciesId: 1 },
      ],
    });
    const res = await as(p, http().get('/pokedex')).expect(200);
    expect(res.body.entries).toEqual([
      { speciesId: 1, seen: true, caught: false },
      { speciesId: 25, seen: true, caught: true },
    ]);
  });

  // F3-03: la ficha del individuo.
  const dataset = new Map(
    (
      JSON.parse(
        readFileSync(
          resolve(process.cwd(), '../src/assets/data/pokedex.json'),
          'utf8',
        ),
      ) as Species[]
    ).map((s) => [s.id, s]),
  );
  const pikachuFamily = dataset.get(25)!.evolutionChainId;
  const onlyCaught = async (p: Player) => {
    await seedCaught(p, 1);
    return prisma.caughtPokemon.findFirstOrThrow({
      where: { playerId: p.id },
    });
  };
  const candyQty = async (p: Player) =>
    (
      await prisma.candy.findUnique({
        where: {
          playerId_familyId: { playerId: p.id, familyId: pikachuFamily },
        },
      })
    )?.qty ?? 0;

  it('GET /collection/:id: la ficha con IVs, stats reales y caramelos; lo ajeno 404; id raro 400', async () => {
    const p = await register();
    const row = await onlyCaught(p);
    const res = await as(p, http().get(`/collection/${row.id}`)).expect(200);
    expect(res.body).toMatchObject({
      id: row.id,
      speciesId: 25,
      level: 10,
      nature: 'hardy',
      ball: 'POKE_BALL',
      ivs: row.ivs,
      candy: { familyId: pikachuFamily, qty: 0 },
    });
    expect(res.body.stats).toEqual(
      calcStats(
        dataset.get(25)!.baseStats,
        row.ivs as unknown as Stats,
        row.level,
        row.nature as Nature,
      ),
    );
    await prisma.candy.create({
      data: { playerId: p.id, familyId: pikachuFamily, qty: 7 },
    });
    expect(
      (await as(p, http().get(`/collection/${row.id}`)).expect(200)).body.candy
        .qty,
    ).toBe(7);

    const other = await register();
    await as(other, http().get(`/collection/${row.id}`)).expect(404);
    await as(p, http().get(`/collection/${randomUUID()}`)).expect(404);
    await as(p, http().get('/collection/no-es-uuid')).expect(400);
    await as(undefined, http().get(`/collection/${row.id}`)).expect(401);
  });

  it('PATCH /collection/:id: mote limpio, quitarlo, favorito; validación; lo ajeno 404', async () => {
    const p = await register();
    const row = await onlyCaught(p);
    const patch = (body: object, who: Player = p) =>
      as(who, http().patch(`/collection/${row.id}`).send(body));

    expect(
      (await patch({ nickname: '  Chispa  ' }).expect(200)).body,
    ).toMatchObject({
      nickname: 'Chispa',
    });
    expect((await patch({ favorite: true }).expect(200)).body).toMatchObject({
      nickname: 'Chispa',
      favorite: true,
    });
    expect(
      (await patch({ nickname: null }).expect(200)).body.nickname,
    ).toBeNull();
    for (const bad of [
      { nickname: 'a'.repeat(13) },
      { nickname: '<b>' },
      { nickname: 5 },
      { favorite: 'sí' },
      {},
      { level: 100 },
    ]) {
      await patch(bad).expect(400);
    }
    await patch({ favorite: false }, await register()).expect(404);
    const stored = await prisma.caughtPokemon.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(stored).toMatchObject({ nickname: null, favorite: true, level: 10 });
  });

  it('DELETE /collection/:id (transferir): +1 caramelo de su familia; repetir o de otro → 404 sin sumar', async () => {
    const p = await register();
    const row = await onlyCaught(p);
    await as(await register(), http().delete(`/collection/${row.id}`)).expect(
      404,
    );
    const res = await as(p, http().delete(`/collection/${row.id}`)).expect(200);
    expect(res.body).toEqual({
      candy: { familyId: pikachuFamily, qty: 1, gained: 1 },
    });
    expect(await prisma.caughtPokemon.count({ where: { id: row.id } })).toBe(0);
    await as(p, http().delete(`/collection/${row.id}`)).expect(404);
    expect(await candyQty(p)).toBe(1);
  });

  it('dos transferencias a la vez del mismo Pokémon → una 200 y otra 404, y +1 caramelo (no +2)', async () => {
    const p = await register();
    const row = await onlyCaught(p);
    const codes = (
      await Promise.all(
        [1, 2].map(() => as(p, http().delete(`/collection/${row.id}`))),
      )
    )
      .map((r) => r.status)
      .sort();
    expect(codes).toEqual([200, 404]);
    expect(await candyQty(p)).toBe(1);
  });
});
