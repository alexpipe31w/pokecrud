import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import {
  PVP_NAMESPACE,
  type HelloReply,
  type PvpErrorCode,
  type PvpReply,
} from '../../../shared/protocol/pvp.js';
import { JWT_VERIFY_OPTIONS } from '../auth/jwt.config.js';
import { corsOrigins } from '../common/cors.js';
import { PvpSessions } from './pvp-sessions.js';
import { parseEmpty } from './pvp.validation.js';
import { SocketRateLimiter } from './socket-rate-limit.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los mensajes del juego son pequeños; esto corta cargas absurdas antes de parsearlas. */
const MAX_MESSAGE_BYTES = 16 * 1024;

interface SocketData {
  playerId?: string;
}

/**
 * Socket `/pvp` (F5-02, D-056). SOLO transporte: autentica en el handshake, limita por socket, valida la carga y
 * delega (sala de espera en F5-03, combate en F5-04). El `playerId` sale SIEMPRE del token, nunca del cuerpo.
 * Los guards globales (`JwtAuthGuard`, `HttpThrottlerGuard`) ignoran este contexto: aquí se hace lo suyo.
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
export class PvpGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PvpGateway.name);
  private readonly sessions = new PvpSessions();
  private readonly limiter = new SocketRateLimiter();

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const playerId = await this.verify(client.handshake.auth);
    if (!playerId) return this.reject(client, 'unauthorized');
    if (!this.sessions.add(playerId, client.id)) {
      return this.reject(client, 'rate-limited');
    }
    (client.data as SocketData).playerId = playerId;
    await client.join(`player:${playerId}`);
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
    // TODO(F5-04): si `left.remaining === 0` y el jugador está en un combate, avisar a la sala (gracia de 60 s).
  }

  @SubscribeMessage('pvp:hello')
  hello(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): HelloReply {
    return this.handle(client, body, parseEmpty, () => ({
      ok: true,
      // F5-03 rellena `lobby`; F5-04, `battle`.
      battle: null,
      lobby: null,
    }));
  }

  /** Lo común a todo mensaje: sesión, límite por socket y validación. Siempre devuelve algo por el ack. */
  private handle<B, R extends object>(
    client: Socket,
    body: unknown,
    parse: (v: unknown) => B | null,
    run: (playerId: string, body: B) => PvpReply<R>,
  ): PvpReply<R> {
    // Un mensaje puede llegar antes de que termine la verificación del handshake.
    const playerId = (client.data as SocketData).playerId;
    if (!playerId) return { ok: false, code: 'unauthorized' };
    if (!this.limiter.take(client.id))
      return { ok: false, code: 'rate-limited' };
    const parsed = parse(body);
    if (parsed === null) return { ok: false, code: 'bad-request' };
    return run(playerId, parsed);
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
