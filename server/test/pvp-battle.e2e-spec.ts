import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import {
  PVP_NAMESPACE,
  type BattleEndMsg,
  type BattleOpponentMsg,
  type BattleStartMsg,
  type BattleTurnMsg,
  type PvpBattleView,
} from '../../shared/protocol/pvp.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TEST_DOMAIN, cleanupTestPlayers } from './support/cleanup.js';

// e2e del combate PvP (F5-04, D-056) con dos clientes Socket.IO de verdad: turnos hasta el final con su fila en la
// tabla Battle, acciones repetidas, reconexión a mitad y lo que no se puede hacer.

let ipCounter = 0;
const nextIp = (): string => {
  ipCounter++;
  return `10.85.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
};

interface Player {
  id: string;
  token: string;
  teamId: number;
  socket: Socket;
}
type Reply = Record<string, unknown> & { ok: boolean };
const MOVE = { kind: 'move', moveIndex: 0 };

describe('Combate PvP (e2e)', { timeout: 120_000 }, () => {
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
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: `pvpbattle+${randomUUID()}${TEST_DOMAIN}`,
        password: 'clave-segura-123',
        nickname: `pb_${randomUUID().slice(0, 8)}`,
      })
      .expect(201);
    const body = res.body as { accessToken: string; player: { id: string } };
    const caughtId = randomUUID();
    await prisma.caughtPokemon.create({
      data: {
        id: caughtId,
        playerId: body.player.id,
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
        playerId: body.player.id,
        name: 'PvP',
        pokemonIds: [],
        caughtIds: [caughtId],
      },
    });
    return {
      id: body.player.id,
      token: body.accessToken,
      teamId: team.id,
      socket: await connect(body.accessToken),
    };
  };
  const ask = (s: Socket, event: string, body: unknown = {}) =>
    s.timeout(5000).emitWithAck(event, body) as Promise<Reply>;
  const next = <T>(s: Socket, event: string) =>
    new Promise<T>((resolve) => s.once(event, resolve));
  /** A invita, B se une: los dos reciben battle:start. */
  const fight = async (a: Player, b: Player) => {
    const starts = Promise.all([
      next<BattleStartMsg>(a.socket, 'battle:start'),
      next<BattleStartMsg>(b.socket, 'battle:start'),
    ]);
    const created = await ask(a.socket, 'pvp:invite:create', {
      teamId: a.teamId,
    });
    const joined = await ask(b.socket, 'pvp:invite:join', {
      code: created.code,
      teamId: b.teamId,
    });
    expect(joined.ok).toBe(true);
    return starts;
  };
  /** La fila de la tabla Battle (se guarda justo después de cerrar la sala). */
  const row = async (battleId: string) => {
    for (let i = 0; i < 40; i++) {
      const r = await prisma.battle.findUnique({ where: { id: battleId } });
      if (r) return r;
      await new Promise((ok) => setTimeout(ok, 50));
    }
    return null;
  };

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
    await cleanupTestPlayers(prisma, 'pvpbattle+');
    await app.close();
  });

  it('combate entero: turnos girados para cada uno hasta battle:end, y una fila en Battle con el ganador', async () => {
    const [a, b] = [await player(), await player()];
    const [startA, startB] = await fight(a, b);
    const battleId = startA.view.battleId;
    const ends = Promise.all([
      next<BattleEndMsg>(a.socket, 'battle:end'),
      next<BattleEndMsg>(b.socket, 'battle:end'),
    ]);
    let views: [PvpBattleView, PvpBattleView] = [startA.view, startB.view];
    for (let i = 0; i < 60 && views[0].winner === null; i++) {
      const turns = Promise.all([
        next<BattleTurnMsg>(a.socket, 'battle:turn'),
        next<BattleTurnMsg>(b.socket, 'battle:turn'),
      ]);
      const ackA = await ask(a.socket, 'battle:act', {
        battleId,
        decision: views[0].decision,
        action: MOVE,
      });
      expect(ackA).toEqual({ ok: true, duplicate: false });
      if (i === 0) {
        // Reintento de la misma decisión (p. ej. tras un corte): no se aplica dos veces.
        expect(
          await ask(a.socket, 'battle:act', {
            battleId,
            decision: views[0].decision,
            action: MOVE,
          }),
        ).toEqual({ ok: true, duplicate: true });
      }
      await ask(b.socket, 'battle:act', {
        battleId,
        decision: views[1].decision,
        action: MOVE,
      });
      const [ta, tb] = await turns;
      // Lo mismo visto desde cada lado: los lados de los eventos van cambiados.
      expect(tb.events.map((e) => 1 - e.side)).toEqual(
        ta.events.map((e) => e.side),
      );
      views = [ta.view, tb.view];
    }
    const [endA, endB] = await ends;
    expect(endA.reason).toBe('faint');
    expect(endA.winner).toBe(1 - (endB.winner as number));
    const saved = await row(battleId);
    expect(saved).toMatchObject({
      kind: 'PVP',
      p1Id: a.id,
      p2Id: b.id,
      winnerId: endA.winner === 0 ? a.id : b.id,
      reason: 'faint',
    });
    expect(saved!.turns).toBeGreaterThan(0);
    // Libres: pueden volver a buscar rival.
    expect((await ask(a.socket, 'pvp:hello')).battle).toBeNull();
  });

  it('reconexión a mitad: el rival lo sabe, pvp:hello devuelve la vista y el combate sigue con el socket nuevo', async () => {
    const [a, b] = [await player(), await player()];
    const [startA] = await fight(a, b);
    const battleId = startA.view.battleId;
    await ask(a.socket, 'battle:act', { battleId, decision: 1, action: MOVE });
    const gone = next<BattleOpponentMsg>(b.socket, 'battle:opponent');
    a.socket.close();
    expect(await gone).toMatchObject({ battleId, connected: false });
    const back = next<BattleOpponentMsg>(b.socket, 'battle:opponent');
    const fresh = await connect(a.token);
    expect(await back).toMatchObject({ connected: true });
    const hello = await ask(fresh, 'pvp:hello');
    expect(hello.battle).toMatchObject({
      battleId,
      mustDo: 'wait', // ya eligió en esta decisión
      decision: null,
    });
    const turn = next<BattleTurnMsg>(fresh, 'battle:turn');
    await ask(b.socket, 'battle:act', { battleId, decision: 1, action: MOVE });
    expect((await turn).view.turn).toBe(1);
    const ends = next<BattleEndMsg>(b.socket, 'battle:end');
    expect(await ask(fresh, 'battle:forfeit', { battleId })).toEqual({
      ok: true,
    });
    expect(await ends).toMatchObject({ winner: 0, reason: 'forfeit' });
    expect(await row(battleId)).toMatchObject({
      reason: 'forfeit',
      winnerId: b.id,
    });
  });

  it('lo que no se puede: combate ajeno, decisión vieja, acción imposible o mal formada', async () => {
    const [a, b, c] = [await player(), await player(), await player()];
    const [startA] = await fight(a, b);
    const battleId = startA.view.battleId;
    const code = (r: Reply) => r.code;
    expect(
      code(
        await ask(c.socket, 'battle:act', {
          battleId,
          decision: 1,
          action: MOVE,
        }),
      ),
    ).toBe('battle-not-found');
    expect(
      code(
        await ask(a.socket, 'battle:act', {
          battleId,
          decision: 1,
          action: { kind: 'switch', teamIndex: 0 },
        }),
      ),
    ).toBe('invalid-action');
    expect(
      code(
        await ask(a.socket, 'battle:act', {
          battleId,
          decision: 'uno',
          action: MOVE,
        }),
      ),
    ).toBe('bad-request');
    const turns = next<BattleTurnMsg>(a.socket, 'battle:turn');
    await ask(a.socket, 'battle:act', { battleId, decision: 1, action: MOVE });
    await ask(b.socket, 'battle:act', { battleId, decision: 1, action: MOVE });
    await turns;
    expect(
      code(
        await ask(a.socket, 'battle:act', {
          battleId,
          decision: 1,
          action: MOVE,
        }),
      ),
    ).toBe('stale-decision');
    await ask(a.socket, 'battle:forfeit', { battleId });
  });
});
