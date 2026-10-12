import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// e2e del CRUD del curso (F0-08) contra la base REAL (server/.env). Jugadores con @pokecrud.test (se borran en
// afterAll, y sus equipos/favoritos/personalizados caen en cascada). Los Pokémon de inventario que se crean usan
// ids ≥ 90000 (fuera de la Pokédex) y también se borran.
const DOMAIN = '@pokecrud.test';
const TEST_IDS = { gte: 90_000 };

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.88.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

const mewtwoLike = (id: number) => ({
  id,
  name: `pruebamon${id}`,
  types: ['psychic'],
  abilities: ['pressure', 'unnerve'],
  imageUrl: 'https://example.com/150.png',
  height: 2,
  weight: 122,
  baseExperience: 340,
  stats: {
    hp: 106,
    attack: 110,
    defense: 90,
    specialAttack: 154,
    specialDefense: 90,
    speed: 130,
  },
  price: 50000,
  stock: 3,
});

describe('CRUD del curso (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let ash: string; // access tokens de dos jugadores distintos
  let misty: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string | undefined, req: request.Test) =>
    (token ? req.set('Authorization', `Bearer ${token}`) : req).set(
      'X-Forwarded-For',
      nextIp(),
    );
  const register = async (): Promise<string> => {
    const res = await http()
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `crud+${randomUUID()}${DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `c_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.inventoryPokemon.deleteMany({ where: { id: TEST_IDS } });
    [ash, misty] = await Promise.all([register(), register()]);
  });

  afterAll(async () => {
    await prisma.inventoryPokemon.deleteMany({ where: { id: TEST_IDS } });
    await prisma.player.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await app.close();
  });

  describe('/pokemon (inventario compartido)', () => {
    it('lectura pública: lista ordenada por id como JSON Server (array plano)', async () => {
      const res = await as(
        undefined,
        http().get('/pokemon?_sort=id&_order=asc'),
      ).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as { id: number }[]).map((p) => p.id);
      expect(ids.length).toBeGreaterThanOrEqual(151);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
      expect(res.body[0]).toMatchObject({ id: 1, name: 'bulbasaur' });
      expect(res.body[0]).toHaveProperty('price');
      expect(res.body[0]).toHaveProperty('stock');
    });

    it('_order=desc y _sort=price', async () => {
      const desc = await as(
        undefined,
        http().get('/pokemon?_sort=id&_order=desc&_limit=3'),
      ).expect(200);
      const ids = (desc.body as { id: number }[]).map((p) => p.id);
      expect(ids).toEqual([...ids].sort((a, b) => b - a));
      const byPrice = await as(
        undefined,
        http().get('/pokemon?_sort=price&_limit=20'),
      ).expect(200);
      const prices = (byPrice.body as { price: number }[]).map((p) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('name_like busca sin distinguir mayúsculas (mew → mew y mewtwo)', async () => {
      const res = await as(
        undefined,
        http().get('/pokemon?name_like=MEW'),
      ).expect(200);
      const names = (res.body as { name: string }[]).map((p) => p.name);
      expect(names).toEqual(expect.arrayContaining(['mew', 'mewtwo']));
      expect(names.every((n) => n.includes('mew'))).toBe(true);
    });

    it('_page/_limit paginan y devuelven X-Total-Count', async () => {
      const res = await as(
        undefined,
        http().get('/pokemon?_sort=id&_order=asc&_page=2&_limit=10'),
      ).expect(200);
      expect((res.body as { id: number }[]).map((p) => p.id)).toEqual([
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ]);
      expect(Number(res.headers['x-total-count'])).toBeGreaterThanOrEqual(151);
    });

    it('consultas inválidas → 400 (campo de orden desconocido, límite > 100, parámetro extra)', async () => {
      await as(undefined, http().get('/pokemon?_sort=passwordHash')).expect(
        400,
      );
      await as(undefined, http().get('/pokemon?_limit=101')).expect(400);
      await as(undefined, http().get('/pokemon?hack=1')).expect(400);
    });

    it('GET por id: 200, y 404 si no existe', async () => {
      await as(undefined, http().get('/pokemon/150'))
        .expect(200)
        .expect((r) => expect(r.body.name).toBe('mewtwo'));
      await as(undefined, http().get('/pokemon/99999')).expect(404);
      await as(undefined, http().get('/pokemon/abc')).expect(400);
    });

    it('escribir sin sesión → 401', async () => {
      await as(
        undefined,
        http().post('/pokemon').send(mewtwoLike(90001)),
      ).expect(401);
      await as(
        undefined,
        http().patch('/pokemon/150').send({ stock: 1 }),
      ).expect(401);
      await as(undefined, http().delete('/pokemon/150')).expect(401);
    });

    it('ciclo completo con sesión: POST 201 → POST repetido 409 → PUT → PATCH → DELETE → 404', async () => {
      const created = await as(ash, http().post('/pokemon'))
        .send({ ...mewtwoLike(90001), createdAt: '2026-01-01T00:00:00.000Z' })
        .expect(201);
      expect(created.body).toMatchObject({ id: 90001, price: 50000, stock: 3 });

      await as(misty, http().post('/pokemon'))
        .send(mewtwoLike(90001))
        .expect(409);

      const replaced = await as(misty, http().put('/pokemon/90001'))
        .send({ ...mewtwoLike(90001), name: 'reemplazado', price: 1 })
        .expect(200);
      expect(replaced.body).toMatchObject({ name: 'reemplazado', price: 1 });

      const patched = await as(ash, http().patch('/pokemon/90001'))
        .send({ price: 45000, stock: 10 })
        .expect(200);
      expect(patched.body).toMatchObject({
        name: 'reemplazado',
        price: 45000,
        stock: 10,
      });

      await as(ash, http().delete('/pokemon/90001')).expect(200);
      await as(undefined, http().get('/pokemon/90001')).expect(404);
      await as(ash, http().put('/pokemon/90001'))
        .send(mewtwoLike(90001))
        .expect(404);
    });

    it('validación: stock/precio negativos, stats fuera de rango, campos extra y id distinto del de la ruta → 400', async () => {
      await as(ash, http().post('/pokemon'))
        .send({ ...mewtwoLike(90002), stock: -1 })
        .expect(400);
      await as(ash, http().post('/pokemon'))
        .send({ ...mewtwoLike(90002), price: -5 })
        .expect(400);
      await as(ash, http().post('/pokemon'))
        .send({
          ...mewtwoLike(90002),
          stats: { ...mewtwoLike(1).stats, hp: 999 },
        })
        .expect(400);
      await as(ash, http().post('/pokemon'))
        .send({ ...mewtwoLike(90002), isAdmin: true })
        .expect(400);
      await as(ash, http().patch('/pokemon/150')).send({ id: 151 }).expect(400);
      await as(ash, http().patch('/pokemon/150'))
        .send({ stock: -3 })
        .expect(400);
    });
  });

  describe('/teams, /favorites, /customPokemon (por jugador)', () => {
    const resources = {
      teams: {
        body: {
          name: 'Equipo Agua',
          description: 'Solo tipo agua',
          pokemonIds: [7, 54, 131],
        },
        put: {
          name: 'Equipo Kanto (editado)',
          description: 'Con PUT',
          pokemonIds: [25, 6, 9],
        },
        patch: { description: 'Cambiada con PATCH' },
        invalid: { name: 'Demasiados', pokemonIds: [1, 2, 3, 4, 5, 6, 7] },
      },
      favorites: {
        body: {
          pokemonId: 1,
          pokemonName: 'bulbasaur',
          note: 'Mi inicial',
          rating: 3,
        },
        put: {
          pokemonId: 25,
          pokemonName: 'pikachu',
          note: 'Con PUT',
          rating: 5,
        },
        patch: { rating: 2 },
        invalid: { pokemonId: 4, pokemonName: 'charmander', rating: 6 },
      },
      customPokemon: {
        body: {
          name: 'Cafetín',
          types: ['grass'],
          stats: { hp: 60, attack: 55, defense: 65, speed: 120 },
          imageUrl: '',
          description: 'Nunca duerme',
        },
        put: {
          name: 'Opitazo',
          types: ['fire'],
          stats: { hp: 90, attack: 120, defense: 75, speed: 100 },
          imageUrl: '',
          description: 'Reemplazado',
        },
        patch: { description: 'Cambiada con PATCH' },
        invalid: {
          name: 'Raro',
          types: ['plasma'],
          stats: { hp: 1, attack: 1, defense: 1, speed: 1 },
        },
      },
    } as const;

    for (const [path, r] of Object.entries(resources)) {
      describe(`/${path}`, () => {
        it('sin sesión → 401 en lectura y escritura', async () => {
          await as(undefined, http().get(`/${path}`)).expect(401);
          await as(undefined, http().get(`/${path}/1`)).expect(401);
          await as(undefined, http().post(`/${path}`))
            .send(r.body)
            .expect(401);
        });

        it('ciclo completo del dueño: POST 201 → GET → PUT → PATCH → DELETE → 404', async () => {
          const created = await as(ash, http().post(`/${path}`))
            .send({ ...r.body, createdAt: '2026-10-01T12:00:00.000Z' })
            .expect(201);
          const id = (created.body as { id: number }).id;
          expect(created.body).toMatchObject(r.body);
          expect(created.body).not.toHaveProperty('playerId');

          const list = await as(ash, http().get(`/${path}`)).expect(200);
          expect((list.body as { id: number }[]).map((x) => x.id)).toContain(
            id,
          );

          await as(ash, http().get(`/${path}/${id}`)).expect(200);
          const put = await as(ash, http().put(`/${path}/${id}`))
            .send(r.put)
            .expect(200);
          expect(put.body).toMatchObject({ id, ...r.put });
          const patch = await as(ash, http().patch(`/${path}/${id}`))
            .send(r.patch)
            .expect(200);
          expect(patch.body).toMatchObject({ id, ...r.put, ...r.patch });

          await as(ash, http().delete(`/${path}/${id}`)).expect(200);
          await as(ash, http().get(`/${path}/${id}`)).expect(404);
        });

        it('otro jugador no ve, no edita ni borra lo ajeno (404, no 403) y su lista no lo incluye', async () => {
          const created = await as(ash, http().post(`/${path}`))
            .send(r.body)
            .expect(201);
          const id = (created.body as { id: number }).id;

          await as(misty, http().get(`/${path}/${id}`)).expect(404);
          await as(misty, http().put(`/${path}/${id}`))
            .send(r.put)
            .expect(404);
          await as(misty, http().patch(`/${path}/${id}`))
            .send(r.patch)
            .expect(404);
          await as(misty, http().delete(`/${path}/${id}`)).expect(404);
          const list = await as(misty, http().get(`/${path}`)).expect(200);
          expect(
            (list.body as { id: number }[]).map((x) => x.id),
          ).not.toContain(id);

          // sigue intacto para su dueño
          await as(ash, http().get(`/${path}/${id}`))
            .expect(200)
            .expect((res) => expect(res.body).toMatchObject(r.body));
          await as(ash, http().delete(`/${path}/${id}`)).expect(200);
        });

        it('validación → 400 (reglas del recurso y campos que no existen, como playerId)', async () => {
          await as(ash, http().post(`/${path}`))
            .send(r.invalid)
            .expect(400);
          await as(ash, http().post(`/${path}`))
            .send({ ...r.body, playerId: randomUUID() })
            .expect(400);
        });

        it('paginación: _limit máx. 100 y X-Total-Count con _page', async () => {
          await as(ash, http().get(`/${path}?_limit=101`)).expect(400);
          const res = await as(
            ash,
            http().get(`/${path}?_page=1&_limit=5`),
          ).expect(200);
          expect(res.headers['x-total-count']).toBeDefined();
        });
      });
    }

    it('favoritos: el mismo Pokémon dos veces para el mismo jugador → 409; para otro jugador sí se puede', async () => {
      const fav = { pokemonId: 133, pokemonName: 'eevee', note: '', rating: 4 };
      await as(ash, http().post('/favorites')).send(fav).expect(201);
      await as(ash, http().post('/favorites')).send(fav).expect(409);
      await as(misty, http().post('/favorites')).send(fav).expect(201);
    });
  });
});
