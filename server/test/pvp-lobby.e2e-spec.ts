import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import {
  PVP_NAMESPACE,
  type BattleEndMsg,
  type BattleStartMsg,
} from '../../shared/protocol/pvp.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e de la sala de espera del PvP (F5-03, D-056) con clientes Socket.IO de verdad y equipos en la base.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.84.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Player {
  id: string;
  nickname: string;
  token: string;
  teamId: number;
  socket: Socket;
}

describe('Sala de espera PvP (e2e)', { timeout: 90_000 }, () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let url: string;
  const open: Socket[] = [];

  const connect = async (token: string): Promise<Socket> => {
    const s = io(`${url}${PVP_NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    open.push(s);
    await new Promise<void>((resolve, reject) => {
      s.once('connect', () => resolve());
      s.once('connect_error', reject);
    });
    return s;
  };
  const player = async (): Promise<Player> => {
    const nickname = `l_${randomUUID().slice(0, 8)}`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `pvplobby+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    const id = body.player.id;
    const caughtId = randomUUID();
    await prisma.caughtPokemon.create({
      data: {
        id: caughtId,
        playerId: id,
        speciesId: 25,
        level: 12,
        ivs: {
          hp: 10,
          attack: 10,
          defense: 10,
          specialAttack: 10,
          specialDefense: 10,
          speed: 10,
        },
        nature: 'hardy',
        gender: 'F',
        shiny: false,
        heightScale: 1,
        moves: [33],
        ball: 'POKE_BALL',
        encounterId: '0_0:1:0',
        caughtLat: 2.9273,
        caughtLng: -75.2819,
        cp: 80,
      },
    });
    const team = await prisma.team.create({
      data: {
        playerId: id,
        name: 'PvP',
        pokemonIds: [],
        caughtIds: [caughtId],
      },
    });
    return {
      id,
      nickname,
      token: body.accessToken,
      teamId: team.id,
      socket: await connect(body.accessToken),
    };
  };
  const ask = (s: Socket, event: string, body: unknown = {}) =>
    s.timeout(5000).emitWithAck(event, body) as Promise<
      Record<string, unknown>
    >;
  const next = <T>(s: Socket, event: string) =>
    new Promise<T>((resolve) => s.once(event, resolve));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    prisma = app.get(PrismaService);
  }, 90_000);

  afterAll(async () => {
    for (const s of open) s.close();
    await cleanupTestPlayers(prisma, 'pvplobby+');
    await app.close();
  });

  it('invitación: A crea el código, B se une con él → los dos reciben battle:start; rendirse lo cierra', async () => {
    const a = await player();
    const b = await player();
    const created = await ask(a.socket, 'pvp:invite:create', {
      teamId: a.teamId,
    });
    expect(created).toMatchObject({ ok: true });
    const code = created['code'] as string;
    expect(await ask(a.socket, 'pvp:hello')).toMatchObject({
      battle: null,
      lobby: { kind: 'invite', code },
    });

    const startA = next<BattleStartMsg>(a.socket, 'battle:start');
    const startB = next<BattleStartMsg>(b.socket, 'battle:start');
    const joined = await ask(b.socket, 'pvp:invite:join', {
      code: code.toLowerCase(),
      teamId: b.teamId,
    });
    expect(joined).toMatchObject({ ok: true });
    const [sa, sb] = await Promise.all([startA, startB]);
    expect(sa.opponent).toBe(b.nickname);
    expect(sb.opponent).toBe(a.nickname);
    expect(sa.view.battleId).toBe(joined['battleId']);
    expect(sa.view.me.team[0].level).toBe(50);
    expect(JSON.stringify(sb.view.foe)).not.toContain('moves');

    // Ya en combate: hello lo devuelve y no puede volver a la sala de espera.
    const hello = await ask(a.socket, 'pvp:hello');
    expect((hello['battle'] as { battleId: string }).battleId).toBe(
      joined['battleId'],
    );
    expect(
      await ask(a.socket, 'pvp:invite:create', { teamId: a.teamId }),
    ).toEqual({
      ok: false,
      code: 'already-in-battle',
    });

    const endA = next<BattleEndMsg>(a.socket, 'battle:end');
    const endB = next<BattleEndMsg>(b.socket, 'battle:end');
    expect(
      await ask(b.socket, 'battle:forfeit', { battleId: joined['battleId'] }),
    ).toEqual({ ok: true });
    expect(await endA).toMatchObject({ winner: 0, reason: 'forfeit' });
    expect(await endB).toMatchObject({ winner: 1, reason: 'forfeit' });
    expect(await ask(a.socket, 'pvp:hello')).toMatchObject({ battle: null });
  });

  it('buscar rival: el primero espera; el segundo empareja con él', async () => {
    const a = await player();
    const b = await player();
    expect(await ask(a.socket, 'pvp:queue:join', { teamId: a.teamId })).toEqual(
      {
        ok: true,
        matched: false,
      },
    );
    expect(await ask(a.socket, 'pvp:hello')).toMatchObject({
      lobby: { kind: 'queue' },
    });
    const startA = next<BattleStartMsg>(a.socket, 'battle:start');
    expect(await ask(b.socket, 'pvp:queue:join', { teamId: b.teamId })).toEqual(
      {
        ok: true,
        matched: true,
      },
    );
    const sa = await startA;
    expect(sa.opponent).toBe(b.nickname);
    await ask(a.socket, 'battle:forfeit', { battleId: sa.view.battleId });
  });

  it('dos se unen al MISMO código a la vez → uno entra y el otro invite-not-found', async () => {
    const [host, b, c] = await Promise.all([player(), player(), player()]);
    const { code } = (await ask(host.socket, 'pvp:invite:create', {
      teamId: host.teamId,
    })) as { code: string };
    const replies = await Promise.all([
      ask(b.socket, 'pvp:invite:join', { code, teamId: b.teamId }),
      ask(c.socket, 'pvp:invite:join', { code, teamId: c.teamId }),
    ]);
    const ok = replies.filter((r) => r['ok']);
    expect(ok).toHaveLength(1);
    expect(replies.filter((r) => !r['ok'])).toEqual([
      { ok: false, code: 'invite-not-found' },
    ]);
    await ask(host.socket, 'battle:forfeit', { battleId: ok[0]['battleId'] });
  });

  it('errores: tu propio código, equipo ajeno, código inexistente, invitación cancelada', async () => {
    const a = await player();
    const b = await player();
    const { code } = (await ask(a.socket, 'pvp:invite:create', {
      teamId: a.teamId,
    })) as { code: string };
    expect(
      await ask(a.socket, 'pvp:invite:join', { code, teamId: a.teamId }),
    ).toEqual({
      ok: false,
      code: 'own-invite',
    });
    expect(
      await ask(b.socket, 'pvp:invite:join', { code, teamId: a.teamId }),
    ).toEqual({
      ok: false,
      code: 'team-not-found',
    });
    expect(
      await ask(b.socket, 'pvp:invite:join', {
        code: 'ZZZZZZ',
        teamId: b.teamId,
      }),
    ).toEqual({ ok: false, code: 'invite-not-found' });
    expect(await ask(a.socket, 'pvp:lobby:leave')).toEqual({ ok: true });
    expect(
      await ask(b.socket, 'pvp:invite:join', { code, teamId: b.teamId }),
    ).toEqual({
      ok: false,
      code: 'invite-not-found',
    });
    expect(
      await ask(b.socket, 'battle:forfeit', { battleId: randomUUID() }),
    ).toEqual({
      ok: false,
      code: 'battle-not-found',
    });
  });

  it('cerrar el último socket cancela tu invitación', async () => {
    const a = await player();
    const b = await player();
    const { code } = (await ask(a.socket, 'pvp:invite:create', {
      teamId: a.teamId,
    })) as { code: string };
    a.socket.close();
    await new Promise((r) => setTimeout(r, 300));
    expect(
      await ask(b.socket, 'pvp:invite:join', { code, teamId: b.teamId }),
    ).toEqual({
      ok: false,
      code: 'invite-not-found',
    });
  });
});
