import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthPlayer } from './auth.decorators.js';

/**
 * Exige rol ADMIN (F0-12, D-023). Va DESPUÉS del JwtAuthGuard global, que ya puso `req.player`.
 * El rol se lee de la BD en cada petición (no viaja en el token): quitar el rol surte efecto al instante,
 * sin esperar a que caduque el access token. Solo se usa en escrituras poco frecuentes (inventario).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { player } = ctx.switchToHttp().getRequest<{ player?: AuthPlayer }>();
    if (!player) throw new UnauthorizedException('No autorizado'); // ruta @Public() mal combinada
    const found = await this.prisma.player.findUnique({
      where: { id: player.id },
      select: { role: true },
    });
    if (!found) throw new UnauthorizedException('No autorizado'); // borrado después de emitir el token
    if (found.role !== 'ADMIN')
      throw new ForbiddenException(
        'Solo un administrador puede modificar el inventario',
      );
    return true;
  }
}
