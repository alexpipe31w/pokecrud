import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { cleanupTestPlayers } from './support/cleanup.js';

// e2e de /spawns (F1-06) contra la base REAL (server/.env, necesita SPAWN_SALT). Open-Meteo se simula: el test no
// depende de la red ni del clima de hoy. Las cuentas usan @pokecrud.test y se borran en afterAll.
const DOMAIN = '@pokecrud.test';
const NEIVA = { lat: 2.9273, lng: -75.2819 };

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.78.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Nearby {
  slot: number;
  expiresAt: string;
  weather: string;
  night: boolean;
  spawns: { id: string; speciesId: number; lat: number; lng: number }[];
}

describe('Spawns (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let ash: string;
  let misty: string;

  const http = () => request(app.getHttpServer());
  const get = (token: string | undefined, query: string) => {
    const req = http().get(`/spawns${query}`).set('X-Forwarded-For', nextIp());
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const register = async (): Promise<string> => {
    const res = await http()
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `spawns+${randomUUID()}${DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `s_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    return (res.body as { accessToken: string }).accessToken;
  };

  beforeAll(async () => {
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      (input instanceof Request ? input.url : input.toString()).includes(
        'open-meteo.com',
      )
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                current: { weather_code: 61, wind_speed_10m: 4 },
              }),
            ),
          )
        : realFetch(input, init),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
    prisma = app.get(PrismaService);
    [ash, misty] = await Promise.all([register(), register()]);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await cleanupTestPlayers(prisma, 'spawns+');
    await app.close();
  });

  it('sin sesión → 401', async () => {
    await get(undefined, `?lat=${NEIVA.lat}&lng=${NEIVA.lng}`).expect(401);
  });

  it('validación: falta lng, fuera de rango, no numérico o parámetro extra → 400', async () => {
    await get(ash, `?lat=${NEIVA.lat}`).expect(400);
    await get(ash, `?lat=95&lng=${NEIVA.lng}`).expect(400);
    await get(ash, `?lat=abc&lng=${NEIVA.lng}`).expect(400);
    await get(ash, `?lat=${NEIVA.lat}&lng=${NEIVA.lng}&radius=5000`).expect(
      400,
    );
  });

  it('dos jugadores en el mismo sitio ven exactamente los mismos Pokémon, sin datos ocultos', async () => {
    const q = `?lat=${NEIVA.lat}&lng=${NEIVA.lng}`;
    const a = (await get(ash, q).expect(200)).body as Nearby;
    const b = (await get(misty, q).expect(200)).body as Nearby;
    if (a.slot !== b.slot) return; // cambió la franja justo entre las dos peticiones: no comparable
    expect(b).toEqual(a);
    expect(a.spawns.length).toBeGreaterThan(0);
    expect(new Date(a.expiresAt).getTime()).toBeGreaterThan(Date.now());
    for (const s of a.spawns) {
      expect(Object.keys(s).sort()).toEqual(['id', 'lat', 'lng', 'speciesId']);
      expect(s.id).toMatch(/^-?\d+_-?\d+:\d+:\d$/);
      expect(s.speciesId).toBeGreaterThanOrEqual(1);
      expect(s.speciesId).toBeLessThanOrEqual(1025);
    }
  });

  it('incluye el clima y si es de noche (para el HUD del mapa, F1-04)', async () => {
    const body = (
      await get(ash, `?lat=${NEIVA.lat}&lng=${NEIVA.lng}`).expect(200)
    ).body as Nearby;
    // Open-Meteo simulado con el código WMO 61 (lluvia) en beforeAll.
    expect(body.weather).toBe('rain');
    expect(typeof body.night).toBe('boolean');
  });
});
