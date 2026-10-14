import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  PVP_NAMESPACE,
  type BattleActReply,
  type BattleForfeitReply,
  type HelloReply,
  type InviteCreateReply,
  type InviteJoinReply,
  type LobbyLeaveReply,
  type PvpErrorCode,
  type PvpReply,
  type QueueJoinReply,
} from '../../../shared/protocol/pvp.js';
import { JWT_VERIFY_OPTIONS } from '../auth/jwt.config.js';
import { corsOrigins } from '../common/cors.js';
import { BattleRoomsService } from './battle-rooms.service.js';
import { PvpFailure } from './pvp-failure.js';
import { PvpLobby } from './pvp-lobby.js';
import { PvpSessions } from './pvp-sessions.js';
import { PvpTeamsService } from './pvp-teams.service.js';
import {
  parseBattleAct,
  parseBattleForfeit,
  parseEmpty,
  parseInviteJoin,
  parseTeamRequest,
} from './pvp.validation.js';
import { SocketRateLimiter } from './socket-rate-limit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los mensajes del juego son pequeños; esto corta cargas absurdas antes de parsearlas. */
const MAX_MESSAGE_BYTES = 16 * 1024;

interface SocketData {
  playerId?: string;
}

/**
 * Socket `/pvp` (F5-02/F5-03, D-056). SOLO transporte: autentica en el handshake, limita por socket, valida la carga
 * y delega en la sala de espera (`PvpLobby`) y los combates (`BattleRoomsService`). El `playerId` sale SIEMPRE del
 * token, nunca del cuerpo. Los guards globales (`JwtAuthGuard`, `HttpThrottlerGuard`) ignoran este contexto.
 * Los combates mandan mensajes también desde sus temporizadores: salen por el canal que se conecta en `afterInit`.
 */
@WebSocketGateway({
  namespace: PVP_NAMESPACE,
  // Misma lista que HTTP; se lee en cada petición porque el decorador se evalúa antes de cargar el .env.
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, ok?: boolean) => void,
    ) => cb(null, !origin || corsOrigins().includes(origin)),
  },
  maxHttpBufferSize: MAX_MESSAGE_BYTES,
})
export class PvpGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PvpGateway.name);
  private readonly sessions = new PvpSessions();
  private readonly limiter = new SocketRateLimiter();

  constructor(
    private readonly jwt: JwtService,
    private readonly lobby: PvpLobby,
    private readonly rooms: BattleRoomsService,
    private readonly teams: PvpTeamsService,
  ) {}

  afterInit(server: Namespace): void {
    this.rooms.attach((o) =>
      server.to(`player:${o.playerId}`).emit(o.event, o.msg),
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    const playerId = await this.verify(client.handshake.auth);
    if (!playerId) return this.reject(client, 'unauthorized');
    if (!this.sessions.add(playerId, client.id)) {
      return this.reject(client, 'rate-limited');
    }
    (client.data as SocketData).playerId = playerId;
    await client.join(`player:${playerId}`);
    // Si tenía un combate y se había ido, vuelve (el rival deja de ver el aviso; la vista llega con `pvp:hello`).
    this.rooms.reconnect(playerId);
    this.logger.log({ msg: 'pvp.connect', playerId, socketId: client.id });
  }

  handleDisconnect(client: Socket): void {
    this.limiter.forget(client.id);
    const left = this.sessions.remove(client.id);
    if (!left) return;
    this.logger.log({
      msg: 'pvp.disconnect',
      playerId: left.playerId,
      socketId: client.id,
      remaining: left.remaining,
    });
    if (left.remaining > 0) return;
    // Sin ningún socket abierto, nadie puede aceptar tu invitación ni emparejarte: se cancela (D-057).
    this.lobby.leave(left.playerId);
    // En un combate: el rival lo sabe y tienes 60 s para volver (D-056, regla 5).
    this.rooms.disconnect(left.playerId);
  }

  @SubscribeMessage('pvp:hello')
  hello(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<HelloReply> {
    return this.handle(client, body, parseEmpty, (playerId) => ({
      ok: true,
      battle: this.rooms.viewFor(playerId),
      lobby: this.lobby.status(playerId),
    }));
  }

  @SubscribeMessage('pvp:invite:create')
  inviteCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<InviteCreateReply> {
    return this.handle(
      client,
      body,
      parseTeamRequest,
      async (playerId, { teamId }) => {
        const side = await this.loadTeam(playerId, teamId);
        return { ok: true, ...this.lobby.createInvite({ playerId, side }) };
      },
    );
  }

  @SubscribeMessage('pvp:invite:join')
  inviteJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<InviteJoinReply> {
    return this.handle(
      client,
      body,
      parseInviteJoin,
      async (playerId, { code, teamId }) => {
        const side = await this.loadTeam(playerId, teamId);
        // Desde aquí, síncrono: reclamar el código y crear el combate sin `await` en medio.
        const host = this.lobby.joinInvite(playerId, code);
        const battleId = this.rooms.start(host, { playerId, side });
        return { ok: true, battleId };
      },
    );
  }

  @SubscribeMessage('pvp:queue:join')
  queueJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<QueueJoinReply> {
    return this.handle(
      client,
      body,
      parseTeamRequest,
      async (playerId, { teamId }): Promise<QueueJoinReply> => {
        const side = await this.loadTeam(playerId, teamId);
        const rival = this.lobby.joinQueue({ playerId, side });
        if (!rival) return { ok: true, matched: false };
        this.rooms.start(rival, { playerId, side });
        return { ok: true, matched: true };
      },
    );
  }

  @SubscribeMessage('pvp:lobby:leave')
  lobbyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<LobbyLeaveReply> {
    return this.handle(client, body, parseEmpty, (playerId) => {
      this.lobby.leave(playerId);
      return { ok: true };
    });
  }

  /** Una acción para la decisión abierta (D-056, regla 3): idempotente; la primera manda. */
  @SubscribeMessage('battle:act')
  act(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<BattleActReply> {
    return this.handle(
      client,
      body,
      parseBattleAct,
      (playerId, { battleId, decision, action }) => ({
        ok: true,
        ...this.rooms.act(playerId, battleId, decision, action),
      }),
    );
  }

  @SubscribeMessage('battle:forfeit')
  forfeit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<BattleForfeitReply> {
    return this.handle(
      client,
      body,
      parseBattleForfeit,
      (playerId, { battleId }) => {
        this.rooms.forfeit(playerId, battleId);
        return { ok: true };
      },
    );
  }

  /**
   * El equipo se carga (await) ANTES de reclamar un código o entrar en la cola, y después se vuelve a mirar que no
   * haya entrado en un combate mientras tanto (p. ej. desde otra pestaña).
   */
  private async loadTeam(playerId: string, teamId: number) {
    if (this.rooms.has(playerId)) throw new PvpFailure('already-in-battle');
    const side = await this.teams.load(playerId, teamId);
    if (this.rooms.has(playerId)) throw new PvpFailure('already-in-battle');
    return side;
  }

  /**
   * Lo común a todo mensaje: sesión, límite por socket, validación y errores. Siempre devuelve algo por el ack:
   * `PvpFailure` → su código; cualquier otro error → `server-error` (y al log con el jugador).
   */
  private async handle<B, R extends object>(
    client: Socket,
    body: unknown,
    parse: (v: unknown) => B | null,
    run: (playerId: string, body: B) => PvpReply<R> | Promise<PvpReply<R>>,
  ): Promise<PvpReply<R>> {
    // Un mensaje puede llegar antes de que termine la verificación del handshake.
    const playerId = (client.data as SocketData).playerId;
    if (!playerId) return { ok: false, code: 'unauthorized' };
    if (!this.limiter.take(client.id))
      return { ok: false, code: 'rate-limited' };
    const parsed = parse(body);
    if (parsed === null) return { ok: false, code: 'bad-request' };
    try {
      return await run(playerId, parsed);
    } catch (err) {
      if (err instanceof PvpFailure) return { ok: false, code: err.code };
      this.logger.error({
        msg: 'pvp.unexpected_error',
        playerId,
        reason: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, code: 'server-error' };
    }
  }

  /** `sub` del access token (HS256, iss, aud), o null. Igual que `JwtAuthGuard`. */
  private async verify(auth: unknown): Promise<string | null> {
    const token =
      typeof auth === 'object' && auth !== null
        ? (auth as { token?: unknown }).token
        : undefined;
    if (typeof token !== 'string' || token.length > 4096) return null;
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: unknown }>(
        token,
        JWT_VERIFY_OPTIONS,
      );
      return typeof sub === 'string' && UUID.test(sub) ? sub : null;
    } catch {
      return null; // caducado, firma mala, alg distinto…
    }
  }

  private reject(client: Socket, code: PvpErrorCode): void {
    client.emit('pvp:error', { code });
    client.disconnect(true);
  }
}
