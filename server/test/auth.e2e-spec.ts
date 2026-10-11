import { randomUUID } from 'node:crypto';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// e2e contra la base de datos REAL (server/.env). Todo lo que crea usa el dominio @pokecrud.test
// y se borra en afterAll.
const DOMAIN = '@pokecrud.test';
const PASSWORD = 'clave-segura-123';
const BAD_LOGIN = 'Correo o contraseña incorrectos';

let ipCounter = 0;
/** IP distinta por petición: el límite de 5/min por IP no debe mezclar unos tests con otros. */
const nextIp = (): string => {
  ipCounter++;
  return `10.77.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Session {
  accessToken: string;
  refreshToken: string;
  player: {
    id: string;
    email: string;
    nickname: string;
    level: number;
    xp: number;
  };
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const newUser = () => ({
    email: `test+${randomUUID()}${DOMAIN}`,
    password: PASSWORD,
    nickname: `t_${randomUUID().slice(0, 8)}`,
  });
  const post = (url: string, body: object, ip = nextIp()) =>
    request(app.getHttpServer())
      .post(url)
      .set('X-Forwarded-For', ip)
      .send(body);
  const me = (accessToken?: string) => {
    const req = request(app.getHttpServer()).get('/auth/me');
    return accessToken
      ? req.set('Authorization', `Bearer ${accessToken}`)
      : req;
  };
  const register = async (user = newUser()) => {
    const res = await post('/auth/register', user).expect(201);
    return { user, session: res.body as Session };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true); // para que X-Forwarded-For cuente como la IP del cliente
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.player.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await app.close();
  });

  it('registro → 201 con tokens y player, sin passwordHash', async () => {
    const user = newUser();
    const res = await post('/auth/register', user).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.player).toEqual({
      id: expect.any(String),
      email: user.email,
      nickname: user.nickname,
      level: 1,
      xp: 0,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|clave-segura/);
  });

  it('el correo se normaliza (espacios y mayúsculas)', async () => {
    const user = newUser();
    const res = await post('/auth/register', {
      ...user,
      email: `  ${user.email.toUpperCase()}  `,
    }).expect(201);
    expect(res.body.player.email).toBe(user.email);
  });

  it('correo repetido → 409; apodo repetido → 409 con su mensaje', async () => {
    const { user } = await register();
    const dupEmail = await post('/auth/register', {
      ...newUser(),
      email: user.email.toUpperCase(),
    }).expect(409);
    expect(dupEmail.body.message).toBe('Ese correo ya está registrado');
    const dupNick = await post('/auth/register', {
      ...newUser(),
      nickname: user.nickname,
    }).expect(409);
    expect(dupNick.body.message).toBe('Ese apodo ya está en uso');
  });

  it('datos inválidos o campos de más → 400', async () => {
    await post('/auth/register', { ...newUser(), password: 'corta' }).expect(
      400,
    );
    await post('/auth/register', {
      ...newUser(),
      nickname: 'no válido!',
    }).expect(400);
    await post('/auth/register', {
      ...newUser(),
      email: 'no-es-correo',
    }).expect(400);
    await post('/auth/register', { ...newUser(), level: 99 }).expect(400);
  });

  it('login correcto → 200; contraseña mala y correo inexistente → 401 con el mismo mensaje', async () => {
    const { user } = await register();
    const ok = await post('/auth/login', {
      email: user.email,
      password: PASSWORD,
    }).expect(200);
    expect(ok.body.player.nickname).toBe(user.nickname);

    const badPass = await post('/auth/login', {
      email: user.email,
      password: 'otra-clave-123',
    }).expect(401);
    const noUser = await post('/auth/login', {
      email: `nadie+${randomUUID()}${DOMAIN}`,
      password: PASSWORD,
    }).expect(401);
    expect(badPass.body.message).toBe(BAD_LOGIN);
    expect(noUser.body.message).toBe(BAD_LOGIN);
  });

  it('/auth/me: con access → 200; sin token → 401; token manipulado → 401', async () => {
    const { session } = await register();
    const res = await me(session.accessToken).expect(200);
    expect(res.body.player.id).toBe(session.player.id);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    await me().expect(401);
    const [header, payload, signature] = session.accessToken.split('.');
    const otherSig = signature.startsWith('A')
      ? `B${signature.slice(1)}`
      : `A${signature.slice(1)}`;
    await me(`${header}.${payload}.${otherSig}`).expect(401);
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${payload}.`;
    await me(unsigned).expect(401);
  });

  it('refresh rota los tokens; reutilizar el viejo → 401 y revoca toda la familia', async () => {
    const { session } = await register();
    const first = await post('/auth/refresh', {
      refreshToken: session.refreshToken,
    }).expect(200);
    expect(first.body.refreshToken).not.toBe(session.refreshToken);
    await me(first.body.accessToken).expect(200);

    // Alguien usa el refresh viejo (robado) → 401, y el nuevo también deja de valer.
    await post('/auth/refresh', { refreshToken: session.refreshToken }).expect(
      401,
    );
    await post('/auth/refresh', {
      refreshToken: first.body.refreshToken,
    }).expect(401);
  });

  it('logout es idempotente (204 dos veces) y el refresh deja de valer', async () => {
    const { session } = await register();
    await post('/auth/logout', { refreshToken: session.refreshToken }).expect(
      204,
    );
    await post('/auth/logout', { refreshToken: session.refreshToken }).expect(
      204,
    );
    await post('/auth/refresh', { refreshToken: session.refreshToken }).expect(
      401,
    );
  });

  it('dos refresh simultáneos con el mismo token → exactamente uno 200 y otro 401', async () => {
    const { session } = await register();
    const results = await Promise.all([
      post('/auth/refresh', { refreshToken: session.refreshToken }),
      post('/auth/refresh', { refreshToken: session.refreshToken }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it('login: la 6.ª petición en un minuto desde la misma IP → 429', async () => {
    const { user } = await register();
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      await post(
        '/auth/login',
        { email: user.email, password: PASSWORD },
        ip,
      ).expect(200);
    }
    await post(
      '/auth/login',
      { email: user.email, password: PASSWORD },
      ip,
    ).expect(429);
  });

  it('login: tras 10 fallos en una cuenta (desde IP distintas) se bloquea aunque la clave sea buena', async () => {
    const { user } = await register();
    for (let i = 0; i < 10; i++) {
      await post('/auth/login', {
        email: user.email,
        password: 'mala-clave-123',
      }).expect(401);
    }
    await post('/auth/login', { email: user.email, password: PASSWORD }).expect(
      429,
    );
  });
});
