import { Injectable } from '@nestjs/common';
import {
  ITEMS,
  type ItemId,
  STARTER_KIT,
} from '../../../shared/engine/items.js';
import type { BagView } from '../../../shared/protocol/encounters.js';
import { PrismaService } from '../prisma/prisma.service.js';

// El contrato vive en shared/protocol (lo usa también la app, F2-05).
export type { BagView };

/** Filas del kit inicial para `createMany` (registro y garantía de `get`). */
export const starterRows = (): { item: ItemId; qty: number }[] =>
  ITEMS.map((item) => ({ item, qty: STARTER_KIT[item] }));

/**
 * Mochila del jugador (modelo `Inventory`, F1-08, D-026). Solo lectura por ahora: gastar bolas llega con la captura
 * (F2-06) y se hará con un UPDATE condicional atómico, nunca leyendo y restando en memoria.
 */
@Injectable()
export class BagService {
  constructor(private readonly prisma: PrismaService) {}

  async get(playerId: string): Promise<BagView> {
    // Garantiza el kit a quien no lo tenga (p. ej. registrado con el servidor anterior entre la migración y el
    // despliegue). ON CONFLICT DO NOTHING: nunca pisa cantidades existentes, se puede repetir sin efecto.
    await this.prisma.inventory.createMany({
      data: starterRows().map((r) => ({ ...r, playerId })),
      skipDuplicates: true,
    });
    const rows = await this.prisma.inventory.findMany({
      where: { playerId },
      select: { item: true, qty: true },
    });
    const qty = new Map(rows.map((r) => [r.item, r.qty]));
    return { items: ITEMS.map((item) => ({ item, qty: qty.get(item) ?? 0 })) };
  }
}
