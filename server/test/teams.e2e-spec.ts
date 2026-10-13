import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e de los equipos con Pokémon CAPTURADOS (F3-06b, D-054): `caughtIds` (≤ 6, solo tuyos, sin repetir) convive con
// `pokemonIds` (contrato del curso, Postman). Transferir un Pokémon lo quita de los equipos en la misma transacción.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.82.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Player {
  token: string;
  id: string;
}
interface TeamBody {
  id: number;
  name: string;
  pokemonIds: number[];
  caughtIds: string[];
}

describe('Equipos con capturados (e2e)', { timeout: 60_000 }, () => {
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
        email: `team+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `t_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    return { token: body.accessToken, id: body.player.id };
  };
  /** Inserta `n` capturas del jugador y devuelve sus ids. */
  const caught = async (p: Player, n: number): Promise<string[]> => {
    const ids = Array.from({ length: n }, () => randomUUID());
    await prisma.caughtPokemon.createMany({
      data: ids.map((id, i) => ({
        id,
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
        cp: 100,
      })),
    });
    return ids;
  };
  const createTeam = (p: Player, body: object) =>
    as(
      p,
      http()
        .post('/teams')
        .send({ name: 'Mi equipo', pokemonIds: [], ...body }),
    );

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
    await cleanupTestPlayers(prisma, 'team+');
    await app.close();
  });

  it('crear con 3 capturados propios → 201 con caughtIds; sin caughtIds (contrato del curso) → []', async () => {
    const p = await register();
    const ids = await caught(p, 3);
    const res = await createTeam(p, { caughtIds: ids }).expect(201);
    expect(res.body).toMatchObject({ name: 'Mi equipo', caughtIds: ids });
    const old = await createTeam(p, { pokemonIds: [25, 6] }).expect(201);
    expect(old.body).toMatchObject({ pokemonIds: [25, 6], caughtIds: [] });
    const got = await as(
      p,
      http().get(`/teams/${(res.body as TeamBody).id}`),
    ).expect(200);
    expect((got.body as TeamBody).caughtIds).toEqual(ids);
  });

  it('uno ajeno o inexistente → 400 "Hay Pokémon que no son tuyos" y no se crea', async () => {
    const p = await register();
    const mine = await caught(p, 2);
    const theirs = await caught(await register(), 1);
    for (const bad of [
      [...mine, ...theirs],
      [...mine, randomUUID()],
    ]) {
      const res = await createTeam(p, { caughtIds: bad }).expect(400);
      expect((res.body as { message: string }).message).toBe(
        'Hay Pokémon que no son tuyos',
      );
    }
    expect(await prisma.team.count({ where: { playerId: p.id } })).toBe(0);
  });

  it('validación: 7, repetidos o no UUID → 400', async () => {
    const p = await register();
    const ids = await caught(p, 7);
    await createTeam(p, { caughtIds: ids }).expect(400);
    await createTeam(p, { caughtIds: [ids[0], ids[0]] }).expect(400);
    await createTeam(p, { caughtIds: ['no-es-uuid'] }).expect(400);
    await createTeam(p, { caughtIds: 'x' }).expect(400);
  });

  it('PATCH cambia caughtIds; PUT sin caughtIds (Postman) los conserva', async () => {
    const p = await register();
    const ids = await caught(p, 4);
    const team = (
      await createTeam(p, { caughtIds: ids.slice(0, 2) }).expect(201)
    ).body as TeamBody;
    const patched = await as(
      p,
      http()
        .patch(`/teams/${team.id}`)
        .send({ caughtIds: ids.slice(1, 4) }),
    ).expect(200);
    expect((patched.body as TeamBody).caughtIds).toEqual(ids.slice(1, 4));
    const put = await as(
      p,
      http()
        .put(`/teams/${team.id}`)
        .send({ name: 'Renombrado', pokemonIds: [1] }),
    ).expect(200);
    expect(put.body).toMatchObject({
      name: 'Renombrado',
      pokemonIds: [1],
      caughtIds: ids.slice(1, 4),
    });
    const other = await register();
    await as(
      other,
      http().patch(`/teams/${team.id}`).send({ caughtIds: [] }),
    ).expect(404);
  });

  it('transferir un Pokémon lo quita de todos sus equipos (y solo ese)', async () => {
    const p = await register();
    const ids = await caught(p, 3);
    const a = (await createTeam(p, { caughtIds: ids }).expect(201))
      .body as TeamBody;
    const b = (await createTeam(p, { caughtIds: [ids[1]] }).expect(201))
      .body as TeamBody;
    await as(p, http().delete(`/collection/${ids[1]}`)).expect(200);
    const ta = await as(p, http().get(`/teams/${a.id}`)).expect(200);
    const tb = await as(p, http().get(`/teams/${b.id}`)).expect(200);
    expect((ta.body as TeamBody).caughtIds).toEqual([ids[0], ids[2]]);
    expect((tb.body as TeamBody).caughtIds).toEqual([]);
  });

  it('transferir y guardar el equipo a la vez: el equipo nunca se queda con el transferido', async () => {
    const p = await register();
    const ids = await caught(p, 2);
    const team = (await createTeam(p, { caughtIds: [ids[0]] }).expect(201))
      .body as TeamBody;
    const [patch, del] = await Promise.all([
      as(p, http().patch(`/teams/${team.id}`).send({ caughtIds: ids })),
      as(p, http().delete(`/collection/${ids[1]}`)),
    ]);
    expect(del.status).toBe(200);
    expect([200, 400]).toContain(patch.status);
    const stored = await prisma.team.findUniqueOrThrow({
      where: { id: team.id },
    });
    expect(stored.caughtIds).not.toContain(ids[1]);
  });
});
