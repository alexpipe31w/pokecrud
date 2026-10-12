import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';

/** Argon2id con los parámetros mínimos de OWASP (19 MiB, 2 iteraciones): aguanta en el plan gratis de Render. */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const BAD_LOGIN_MESSAGE = 'Correo o contraseña incorrectos';
const INVALID_SESSION_MESSAGE = 'Sesión no válida';

/** Lo único que sale del servidor sobre un jugador (nunca `passwordHash`). */
const PUBLIC_PLAYER = {
  id: true,
  email: true,
  nickname: true,
  /** La app lo usa solo para mostrar u ocultar botones; quien manda es AdminGuard en el servidor. */
  role: true,
  level: true,
  xp: true,
} as const;
export type PublicPlayer = Prisma.PlayerGetPayload<{
  select: typeof PUBLIC_PLAYER;
}>;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
export interface AuthResult extends Tokens {
  player: PublicPlayer;
}

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
/** Referencia seudónima del correo para logs y para el límite por cuenta: nunca el correo en claro. */
const emailRef = (email: string): string => sha256(email).slice(0, 16);
const newRefreshToken = (): string => randomBytes(32).toString('base64url');

/** Campo que provocó una violación de unicidad (P2002), o null si el error es otro. */
function uniqueViolation(err: unknown): 'email' | 'nickname' | null {
  if (
    !(err instanceof Prisma.PrismaClientKnownRequestError) ||
    err.code !== 'P2002'
  )
    return null;
  return `${JSON.stringify(err.meta ?? {})} ${err.message}`.includes('nickname')
    ? 'nickname'
    : 'email';
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlMs: number;
  /** Hash fijo para verificar contra él cuando el correo no existe (mismo tiempo de respuesta). */
  private dummyHash!: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly attempts: LoginAttemptsService,
    config: ConfigService,
  ) {
    this.refreshTtlMs =
      Number(config.getOrThrow('REFRESH_TTL_DAYS')) * 24 * 60 * 60_000;
  }

  onModuleInit(): void {
    this.dummyHash = argon2.hash(
      randomBytes(16).toString('hex'),
      ARGON2_OPTIONS,
    );
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);
    let player: PublicPlayer;
    try {
      // La unicidad la garantiza la BD (@unique), no un SELECT previo: dos registros simultáneos no pasan.
      player = await this.prisma.player.create({
        data: { email: dto.email, nickname: dto.nickname, passwordHash },
        select: PUBLIC_PLAYER,
      });
    } catch (err) {
      const field = uniqueViolation(err);
      if (field === 'nickname')
        throw new ConflictException('Ese apodo ya está en uso');
      if (field === 'email')
        throw new ConflictException('Ese correo ya está registrado');
      throw err;
    }
    this.logger.log({ msg: 'auth.register.ok', playerId: player.id });
    return this.startSession(player);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const ref = emailRef(dto.email);
    if (this.attempts.isLocked(ref)) {
      this.logger.warn({ msg: 'auth.login.locked', emailRef: ref });
      throw new HttpException(
        'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const found = await this.prisma.player.findUnique({
      where: { email: dto.email },
      select: { ...PUBLIC_PLAYER, passwordHash: true },
    });
    // Con un correo inexistente se verifica igual (contra el hash fijo) para no delatarlo por tiempo.
    const passwordOk = await argon2.verify(
      found?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!found || !passwordOk) {
      this.attempts.recordFailure(ref);
      this.logger.warn({
        msg: 'auth.login.fail',
        emailRef: ref,
        reason: found ? 'bad_password' : 'unknown_email',
      });
      throw new UnauthorizedException(BAD_LOGIN_MESSAGE);
    }

    this.attempts.reset(ref);
    const { passwordHash: _hash, ...player } = found;
    this.logger.log({ msg: 'auth.login.ok', playerId: player.id });
    return this.startSession(player);
  }

  /**
   * Rotación de un solo uso. El `updateMany` con `revokedAt: null` es atómico: de dos peticiones
   * simultáneas con el mismo token solo una lo revoca (count = 1); la otra ve count = 0 y cuenta
   * como reutilización, que revoca toda la familia (alguien tiene una copia del token).
   */
  async refresh(refreshToken: string): Promise<Tokens> {
    const tokenHash = sha256(refreshToken);
    const now = new Date();

    const outcome = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      const row = await tx.refreshToken.findUnique({
        where: { tokenHash },
        select: { playerId: true, familyId: true, revokedAt: true },
      });

      if (count === 1 && row) {
        const next = newRefreshToken();
        await tx.refreshToken.create({
          data: {
            playerId: row.playerId,
            familyId: row.familyId,
            tokenHash: sha256(next),
            expiresAt: new Date(now.getTime() + this.refreshTtlMs),
          },
        });
        return {
          kind: 'rotated',
          playerId: row.playerId,
          refreshToken: next,
        } as const;
      }
      if (row?.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { familyId: row.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return {
          kind: 'reuse',
          playerId: row.playerId,
          familyId: row.familyId,
        } as const;
      }
      return { kind: 'invalid' } as const; // no existe o caducó
    });

    // El 401 se lanza FUERA de la transacción: lanzarlo dentro desharía la revocación de la familia.
    if (outcome.kind === 'reuse') {
      this.logger.warn({
        msg: 'auth.refresh.reuse',
        playerId: outcome.playerId,
        familyId: outcome.familyId,
      });
    }
    if (outcome.kind !== 'rotated')
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    return {
      accessToken: await this.signAccess(outcome.playerId),
      refreshToken: outcome.refreshToken,
    };
  }

  /** Idempotente: cerrar una sesión ya cerrada (o inexistente) también responde bien. */
  async logout(refreshToken: string): Promise<void> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count > 0) this.logger.log({ msg: 'auth.logout' });
  }

  async me(playerId: string): Promise<{ player: PublicPlayer }> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: PUBLIC_PLAYER,
    });
    if (!player) throw new UnauthorizedException('No autorizado'); // borrado después de emitir el token
    return { player };
  }

  /** Nueva familia de refresh tokens (un login = una familia) + access token. */
  private async startSession(player: PublicPlayer): Promise<AuthResult> {
    const refreshToken = newRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        playerId: player.id,
        familyId: randomUUID(),
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    return {
      accessToken: await this.signAccess(player.id),
      refreshToken,
      player,
    };
  }

  private signAccess(playerId: string): Promise<string> {
    return this.jwt.signAsync({ sub: playerId }); // algoritmo, caducidad, iss y aud: en AuthModule
  }
}
