import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Límite global por IP SOLO para HTTP (D-056). Con los mensajes del socket `/pvp` el `ThrottlerGuard` metía a todos
 * los sockets en un mismo cubo y perdía mensajes sin respuesta (spike de F5-01: 22 de 140); el socket tiene su
 * propio límite por socket en `pvp.gateway.ts`.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(ctx: ExecutionContext): Promise<boolean> {
    return ctx.getType() !== 'http' || super.shouldSkip(ctx);
  }
}
