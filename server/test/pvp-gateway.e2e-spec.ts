import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module.js';
import { jwtSignOptions } from '../src/auth/jwt.config.js';
import { SOCKET_MSG_LIMIT } from '../src/pvp/socket-rate-limit.js';
import { MAX_SOCKETS_PER_PLAYER } from '../src/pvp/pvp-sessions.js';
import { PVP_NAMESPACE } from '../../shared/protocol/pvp.js';

// e2e del gateway `/pvp` (F5-02, D-056). No toca la base: los tokens se firman aquí con el JwtService de la app (el
// gateway solo verifica el token; no busca al jugador). Cada jugador es un UUID nuevo.

describe('Gateway /pvp (e2e)', { timeout: 60_000 }, () => {
  let app: NestExpressApplication;
  let url: string;
  let jwt: JwtService;
  const sockets: Socket[] = [];

  const tokenFor = (sub = randomUUID()) => jwt.signAsync({ sub });
  const open = (token?: unknown): Socket => {
    const s = io(`${url}${PVP_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(s);
    return s;
  };
  const connected = async (token: string): Promise<Socket> => {
    const s = open(token);
    await new Promise<void>((resolve, reject) => {
      s.once('connect', () => resolve());
      s.once('connect_error', reject);
    });
    return s;
  };
  const rejected = async (s: Socket): Promise<unknown> => {
    const err = await new Promise((r) => s.once('pvp:error', r));
    if (s.connected) await new Promise((r) => s.once('disconnect', r));
    return err;
  };
  const hello = (s: Socket) => s.timeout(3000).emitWithAck('pvp:hello', {});

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => {
    for (const s of sockets.splice(0)) s.close();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sin token, con basura, firmado con otro secreto o caducado → unauthorized y desconexión', async () => {
    const otherSecret = new JwtService({ secret: 'y'.repeat(40) });
    const tokens: unknown[] = [
      undefined,
      12345,
      'no-es-un-jwt',
      await otherSecret.signAsync({ sub: randomUUID() }, jwtSignOptions(60)),
      await jwt.signAsync({ sub: randomUUID() }, { expiresIn: -10 }),
      await jwt.signAsync({ sub: 'no-es-un-uuid' }),
    ];
    for (const token of tokens) {
      const s = open(token);
      expect(await rejected(s)).toEqual({ code: 'unauthorized' });
      expect(s.connected).toBe(false);
    }
  });

  it('con token: pvp:hello responde por el ack (el guard global de HTTP no se mete)', async () => {
    const s = await connected(await tokenFor());
    expect(await hello(s)).toEqual({ ok: true, battle: null, lobby: null });
  });

  it('carga mal formada → bad-request', async () => {
    const s = await connected(await tokenFor());
    expect(
      await s.timeout(3000).emitWithAck('pvp:hello', { extra: 1 }),
    ).toEqual({ ok: false, code: 'bad-request' });
  });

  it(`el ${SOCKET_MSG_LIMIT + 1}.º mensaje en la ventana → rate-limited, sin desconectar`, async () => {
    const s = await connected(await tokenFor());
    for (let i = 0; i < SOCKET_MSG_LIMIT; i++)
      expect(await hello(s)).toMatchObject({ ok: true });
    expect(await hello(s)).toEqual({ ok: false, code: 'rate-limited' });
    expect(s.connected).toBe(true);
  });

  it(`el socket ${MAX_SOCKETS_PER_PLAYER + 1}.º del mismo jugador se rechaza`, async () => {
    const token = await tokenFor();
    for (let i = 0; i < MAX_SOCKETS_PER_PLAYER; i++) await connected(token);
    expect(await rejected(open(token))).toEqual({ code: 'rate-limited' });
    // Cerrar uno deja sitio a otro.
    sockets[0].close();
    await new Promise((r) => setTimeout(r, 200));
    const again = await connected(token);
    expect(await hello(again)).toMatchObject({ ok: true });
  });

  it('los sockets NO comparten cupo: 7 sockets × 20 mensajes = 140 respuestas (spike F5-01: se perdían 22)', async () => {
    const players = [await tokenFor(), await tokenFor(), await tokenFor()];
    const all = await Promise.all(
      [0, 0, 0, 1, 1, 1, 2].map((p) => connected(players[p])),
    );
    const replies = await Promise.all(
      all.flatMap((s) =>
        Array.from({ length: SOCKET_MSG_LIMIT }, () =>
          hello(s).catch(() => ({ ok: false, code: 'timeout' })),
        ),
      ),
    );
    expect(replies.filter((r) => (r as { ok: boolean }).ok)).toHaveLength(140);
  });
});
