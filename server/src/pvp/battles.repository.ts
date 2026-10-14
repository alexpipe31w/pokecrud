import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BattleResult } from './battle-room.js';

/** Reintentos si la base falla al guardar (espera 250 ms, 1 s, 4 s). */
const RETRY_DELAYS_MS = [250, 1_000, 4_000];

/**
 * Guarda el resultado de un combate PvP (F5-04, D-056 regla 10). Idempotente: el id es el de la sala e insertar dos
 * veces no duplica (`ON CONFLICT DO NOTHING`). Se llama DESPUÉS de cerrar la sala en memoria: si la base falla, el
 * combate ya terminó para los jugadores; se reintenta y, si no, queda en el log con el `battleId`.
 */
@Injectable()
export class BattlesRepository {
  private readonly logger = new Logger(BattlesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(r: BattleResult): Promise<boolean> {
    const data: Prisma.BattleCreateManyInput = {
      id: r.battleId,
      kind: 'PVP',
      p1Id: r.players[0],
      p2Id: r.players[1],
      winnerId: r.winner === null ? null : r.players[r.winner],
      reason: r.reason,
      seed: r.seed,
      turns: r.turns,
      log: r.log as unknown as Prisma.InputJsonValue,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
    };
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.battle.createMany({
          data: [data],
          skipDuplicates: true,
        });
        return true;
      } catch (err) {
        if (attempt >= RETRY_DELAYS_MS.length) {
          this.logger.error({
            msg: 'battle.save_failed',
            battleId: r.battleId,
            reason: err instanceof Error ? err.message : String(err),
          });
          return false;
        }
        await new Promise((ok) => setTimeout(ok, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
}
