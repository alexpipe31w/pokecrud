import { BadRequestException, Injectable } from '@nestjs/common';
import type { Stats } from '../../../shared/engine/battle/stats.js';
import { calcStats } from '../../../shared/engine/battle/stats.js';
import { combatPower } from '../../../shared/engine/combat-power.js';
import type { Nature } from '../../../shared/engine/spawns.js';
import type {
  CollectionItem,
  CollectionPage,
  PokedexView,
} from '../../../shared/protocol/collection.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpawnsService } from '../spawns/spawns.service.js';
import type { CollectionQueryDto } from './collection.dto.js';

const ITEM_SELECT = {
  id: true,
  speciesId: true,
  nickname: true,
  level: true,
  cp: true,
  gender: true,
  shiny: true,
  favorite: true,
  caughtAt: true,
  // Solo para calcular el PC de las capturas de antes de F3-02a (cp null); no salen en la respuesta.
  ivs: true,
  nature: true,
} satisfies Prisma.CaughtPokemonSelect;

type ItemRow = Prisma.CaughtPokemonGetPayload<{ select: typeof ITEM_SELECT }>;

/**
 * Colección del jugador (F3-02a, D-052). Todo filtra por el `playerId` del token: lo ajeno no existe.
 * Paginación por cursor con `id` de desempate (ARQUITECTURA §9).
 */
@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spawns: SpawnsService,
  ) {}

  async list(playerId: string, q: CollectionQueryDto): Promise<CollectionPage> {
    if (q.cursor) {
      const own = await this.prisma.caughtPokemon.findFirst({
        where: { id: q.cursor, playerId },
        select: { id: true },
      });
      if (!own) throw new BadRequestException('Cursor no válido');
    }
    const where: Prisma.CaughtPokemonWhereInput = {
      playerId,
      ...(q.shiny === undefined ? {} : { shiny: q.shiny }),
      ...(q.favorite === undefined ? {} : { favorite: q.favorite }),
      ...(q.type
        ? { speciesId: { in: this.spawns.speciesIdsOfType(q.type) } }
        : {}),
    };
    const orderBy: Prisma.CaughtPokemonOrderByWithRelationInput[] = [
      q.sort === 'cp'
        ? { cp: { sort: q.order, nulls: 'last' } }
        : q.sort === 'speciesId'
          ? { speciesId: q.order }
          : { caughtAt: q.order },
      { id: 'asc' }, // desempate estable para el cursor
    ];
    const [rows, total] = await Promise.all([
      this.prisma.caughtPokemon.findMany({
        where,
        orderBy,
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        select: ITEM_SELECT,
      }),
      this.prisma.caughtPokemon.count({ where }),
    ]);
    const page = rows.slice(0, q.limit);
    return {
      items: page.map((r) => this.toItem(r)),
      nextCursor: rows.length > q.limit ? page[page.length - 1].id : null,
      total,
    };
  }

  async pokedex(playerId: string): Promise<PokedexView> {
    const rows = await this.prisma.pokedexEntry.findMany({
      where: { playerId },
      select: { speciesId: true, caught: true },
      orderBy: { speciesId: 'asc' },
    });
    return {
      entries: rows.map((r) => ({
        speciesId: r.speciesId,
        seen: true,
        caught: r.caught,
      })),
    };
  }

  /** PC de una fila: el guardado o, si es de antes de F3-02a, calculado al vuelo (D-049). */
  cpOf(row: {
    speciesId: number;
    cp: number | null;
    ivs: unknown;
    nature: string;
    level: number;
  }): number {
    if (row.cp !== null) return row.cp;
    const base = this.spawns.speciesDetails(row.speciesId)?.baseStats;
    if (!base) return 10;
    return combatPower(
      calcStats(base, row.ivs as Stats, row.level, row.nature as Nature),
    );
  }

  private toItem(r: ItemRow): CollectionItem {
    return {
      id: r.id,
      speciesId: r.speciesId,
      nickname: r.nickname,
      level: r.level,
      cp: this.cpOf(r),
      gender: r.gender,
      shiny: r.shiny,
      favorite: r.favorite,
      caughtAt: r.caughtAt.toISOString(),
    };
  }
}
