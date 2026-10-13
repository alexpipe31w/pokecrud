import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Stats } from '../../../shared/engine/battle/stats.js';
import { calcStats } from '../../../shared/engine/battle/stats.js';
import { CANDY_PER_TRANSFER } from '../../../shared/engine/candy.js';
import type { BallId } from '../../../shared/engine/capture.js';
import { combatPower } from '../../../shared/engine/combat-power.js';
import { normalizeNickname } from '../../../shared/engine/nickname.js';
import type { Nature } from '../../../shared/engine/spawns.js';
import type {
  CollectionDetail,
  CollectionItem,
  CollectionPage,
  PokedexView,
  TransferResult,
} from '../../../shared/protocol/collection.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpawnsService } from '../spawns/spawns.service.js';
import type {
  CollectionPatchDto,
  CollectionQueryDto,
} from './collection.dto.js';

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

const NOT_YOURS = 'Ese Pokémon no está en tu colección';
/** Como la captura (D-028): transferir desde dos pestañas a la vez se espera por el bloqueo de la fila. */
const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 };

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
      ...(q.ids ? { id: { in: q.ids } } : {}),
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

  /** `GET /collection/:id` (F3-03): la ficha. Los IVs y las stats salen solo para su dueño (D-052). */
  async detail(playerId: string, id: string): Promise<CollectionDetail> {
    const row = await this.prisma.caughtPokemon.findFirst({
      where: { id, playerId },
    });
    if (!row) throw new NotFoundException(NOT_YOURS);
    const species = this.spawns.speciesDetails(row.speciesId);
    if (!species)
      throw new NotFoundException('Esa especie no está en el juego');
    const ivs = row.ivs as unknown as Stats;
    const candy = await this.prisma.candy.findUnique({
      where: { playerId_familyId: { playerId, familyId: species.familyId } },
      select: { qty: true },
    });
    return {
      ...this.toItem(row),
      ivs,
      nature: row.nature,
      stats: calcStats(species.baseStats, ivs, row.level, row.nature as Nature),
      heightScale: row.heightScale,
      moves: row.moves,
      ball: row.ball as BallId,
      caughtLat: row.caughtLat,
      caughtLng: row.caughtLng,
      candy: { familyId: species.familyId, qty: candy?.qty ?? 0 },
    };
  }

  /** `PATCH /collection/:id` (F3-03): mote y favorito. */
  async patch(
    playerId: string,
    id: string,
    dto: CollectionPatchDto,
  ): Promise<CollectionItem> {
    if (dto.nickname === undefined && dto.favorite === undefined) {
      throw new BadRequestException(
        'Nada que cambiar: manda nickname o favorite',
      );
    }
    let nickname: string | null | undefined;
    try {
      nickname =
        dto.nickname === undefined
          ? undefined
          : normalizeNickname(dto.nickname);
    } catch (err) {
      throw new BadRequestException(
        err instanceof RangeError ? err.message : 'Mote no válido',
      );
    }
    const { count } = await this.prisma.caughtPokemon.updateMany({
      where: { id, playerId },
      data: {
        ...(nickname === undefined ? {} : { nickname }),
        ...(dto.favorite === undefined ? {} : { favorite: dto.favorite }),
      },
    });
    if (count !== 1) throw new NotFoundException(NOT_YOURS);
    const row = await this.prisma.caughtPokemon.findFirstOrThrow({
      where: { id, playerId },
      select: ITEM_SELECT,
    });
    return this.toItem(row);
  }

  /**
   * `DELETE /collection/:id` (F3-03): transferir = +1 caramelo de su familia y fuera de los equipos (F3-06b), en UNA
   * transacción. El `deleteMany` con
   * `playerId` es a la vez la autorización y el candado: de dos a la vez, el segundo ve `count = 0` → 404 y no suma.
   */
  async transfer(playerId: string, id: string): Promise<TransferResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.caughtPokemon.findFirst({
        where: { id, playerId },
        select: { speciesId: true },
      });
      if (!row) throw new NotFoundException(NOT_YOURS);
      const { count } = await tx.caughtPokemon.deleteMany({
        where: { id, playerId },
      });
      if (count !== 1) throw new NotFoundException(NOT_YOURS);
      // F3-06b (D-054): fuera de los equipos del jugador, en la misma transacción.
      await tx.$executeRaw`
        UPDATE "Team"
        SET "caughtIds" = array_remove("caughtIds", ${id}::uuid), "updatedAt" = now()
        WHERE "playerId" = ${playerId}::uuid AND ${id}::uuid = ANY("caughtIds")`;
      const familyId = this.spawns.speciesDetails(row.speciesId)?.familyId;
      if (familyId === undefined)
        throw new NotFoundException('Esa especie no está en el juego');
      const candy = await tx.candy.upsert({
        where: { playerId_familyId: { playerId, familyId } },
        create: { playerId, familyId, qty: CANDY_PER_TRANSFER },
        update: { qty: { increment: CANDY_PER_TRANSFER } },
      });
      return {
        candy: { familyId, qty: candy.qty, gained: CANDY_PER_TRANSFER },
      };
    }, TX_OPTIONS);
  }

  /**
   * `POST /collection/:id/evolve` (F3-05, D-053): gasta los caramelos de su familia y cambia la especie, en UNA
   * transacción. Se conservan nivel, IVs, naturaleza, shiny, tamaño y mote; cambian especie, PC y movimientos. Dos a la
   * vez: el gasto es condicional (`qty >= coste`) y el cambio solo vale si sigue siendo la especie de origen; si no,
   * se lanza y la transacción deshace también el gasto.
   */
  async evolve(
    playerId: string,
    id: string,
    to: number,
  ): Promise<CollectionDetail> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.caughtPokemon.findFirst({
        where: { id, playerId },
        select: { speciesId: true, ivs: true, level: true, nature: true },
      });
      if (!row) throw new NotFoundException(NOT_YOURS);
      const option = this.spawns
        .evolutionOptions(row.speciesId)
        .find((o) => o.to === to);
      const from = this.spawns.speciesDetails(row.speciesId);
      const target = this.spawns.speciesDetails(to);
      if (!option || !from || !target) {
        throw new BadRequestException(
          'Ese Pokémon no evoluciona en esa especie',
        );
      }
      const paid = await tx.candy.updateMany({
        where: { playerId, familyId: from.familyId, qty: { gte: option.cost } },
        data: { qty: { decrement: option.cost } },
      });
      if (paid.count !== 1) throw new ConflictException('Te faltan caramelos');
      const stats = calcStats(
        target.baseStats,
        row.ivs as unknown as Stats,
        row.level,
        row.nature as Nature,
      );
      const changed = await tx.caughtPokemon.updateMany({
        where: { id, playerId, speciesId: row.speciesId },
        data: {
          speciesId: to,
          cp: combatPower(stats),
          moves: this.spawns.defaultMoves(to, row.level),
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Ese Pokémon ya evolucionó');
      }
      const now = new Date();
      await tx.pokedexEntry.upsert({
        where: { playerId_speciesId: { playerId, speciesId: to } },
        create: { playerId, speciesId: to, caught: true, firstCaughtAt: now },
        update: { caught: true },
      });
      // La primera fecha de captura nunca se pisa (la fila pudo existir solo como "vista"), como en la captura.
      await tx.pokedexEntry.updateMany({
        where: { playerId, speciesId: to, firstCaughtAt: null },
        data: { firstCaughtAt: now },
      });
    }, TX_OPTIONS);
    return this.detail(playerId, id);
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
