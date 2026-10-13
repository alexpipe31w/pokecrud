import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthPlayer, IS_PUBLIC_KEY } from './auth.decorators.js';
import { JWT_VERIFY_OPTIONS } from './jwt.config.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard GLOBAL: toda ruta exige `Authorization: Bearer <access>` salvo las marcadas con @Public().
 * Así una ruta nueva nace protegida aunque alguien olvide el guard.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // El socket /pvp se autentica UNA vez en el handshake (pvp.gateway.ts); este guard es solo para HTTP (D-056).
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers: { authorization?: string };
      player?: AuthPlayer;
    }>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('No autorizado');

    let sub: unknown;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: unknown }>(
        token,
        JWT_VERIFY_OPTIONS,
      ));
    } catch {
      throw new UnauthorizedException('No autorizado'); // caducado, firma mala, alg distinto…
    }
    if (typeof sub !== 'string' || !UUID.test(sub)) {
      throw new UnauthorizedException('No autorizado');
    }
    req.player = { id: sub };
    return true;
  }
}
