import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Tiempo máximo que espera /health/ready a la base de datos. */
export const READY_TIMEOUT_MS = 3000;

/**
 * Salud del servidor. `live` = el proceso responde (no toca la BD); `ready` = puede atender
 * peticiones (la BD contesta). Pública y fuera del rate limit: la consultan el balanceador y los monitores.
 */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok'; db: 'ok' }> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`la BD no contestó en ${READY_TIMEOUT_MS} ms`)),
        READY_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.prisma.$queryRaw`SELECT 1`, timeout]);
      return { status: 'ok', db: 'ok' };
    } catch (err) {
      this.logger.error(
        `health/ready: base de datos caída: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    } finally {
      clearTimeout(timer);
    }
  }
}
