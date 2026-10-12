import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { levelForXp } from '../../../shared/engine/progression.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isNotFound } from '../common/prisma-errors.js';

/** Tope por llamada: ninguna acción del juego da tanto; si llega más, es un bug, no un premio. */
export const MAX_XP_PER_GRANT = 100_000;

export interface XpResult {
  xp: number;
  level: number;
  leveledUp: boolean;
}

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Suma XP y sube de nivel (F1-08, D-026). Sin endpoint: lo llaman la captura (F2), los combates (F4)… dentro de SU
 * transacción (`tx`), para que la XP y lo que la provoca se confirmen juntas.
 *
 * Concurrencia: la XP se incrementa en la propia sentencia (`xp = xp + n`, atómico en la BD) y el nivel se calcula
 * de la XP que devuelve; el nivel solo sube (`WHERE level < nuevo`), así dos sumas a la vez nunca lo bajan.
 */
@Injectable()
export class ProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  async addXp(
    playerId: string,
    amount: number,
    tx: Db = this.prisma,
  ): Promise<XpResult> {
    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_XP_PER_GRANT) {
      throw new BadRequestException(`XP no válida: ${amount}`);
    }
    let after: { xp: number; level: number };
    try {
      after = await tx.player.update({
        where: { id: playerId },
        data: { xp: { increment: amount } },
        select: { xp: true, level: true },
      });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException('Jugador no encontrado');
      throw err;
    }
    const level = levelForXp(after.xp);
    if (level > after.level) {
      await tx.player.updateMany({
        where: { id: playerId, level: { lt: level } },
        data: { level },
      });
    }
    return {
      xp: after.xp,
      level: Math.max(level, after.level),
      leveledUp: level > after.level,
    };
  }
}
