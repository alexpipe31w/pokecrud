import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertSameId, orderBy, pageArgs } from '../common/list-query.js';
import { isNotFound, isUniqueViolation } from '../common/prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateFavoriteDto,
  FavoriteQueryDto,
  ReplaceFavoriteDto,
  UpdateFavoriteDto,
} from './favorites.dto.js';

const DEFAULT_LIMIT = 50;
const NOT_FOUND = 'Favorito no encontrado';
const DUPLICATE = 'Ese Pokémon ya está en tus favoritos';
const OMIT = { playerId: true } as const;
export type FavoriteView = Prisma.FavoriteGetPayload<{ omit: typeof OMIT }>;

/** Favoritos del jugador. Mismo esquema que TeamsService: todo filtrado por `playerId` del token, lo ajeno da 404. */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    playerId: string,
    q: FavoriteQueryDto,
  ): Promise<{ items: FavoriteView[]; total?: number }> {
    const where = { playerId };
    const { take, skip, paginated } = pageArgs(q, DEFAULT_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        omit: OMIT,
        orderBy: orderBy(q._sort, q._order),
        take,
        skip,
      }),
      paginated ? this.prisma.favorite.count({ where }) : undefined,
    ]);
    return { items, total };
  }

  async get(playerId: string, id: number): Promise<FavoriteView> {
    const fav = await this.prisma.favorite.findFirst({
      where: { id, playerId },
      omit: OMIT,
    });
    if (!fav) throw new NotFoundException(NOT_FOUND);
    return fav;
  }

  async create(
    playerId: string,
    dto: CreateFavoriteDto,
  ): Promise<FavoriteView> {
    try {
      // El UNIQUE (playerId, pokemonId) decide: sin SELECT previo, dos altas a la vez no duplican.
      return await this.prisma.favorite.create({
        data: {
          playerId,
          pokemonId: dto.pokemonId,
          pokemonName: dto.pokemonName,
          note: dto.note ?? '',
          rating: dto.rating,
        },
        omit: OMIT,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException(DUPLICATE);
      throw err;
    }
  }

  replace(
    playerId: string,
    id: number,
    dto: ReplaceFavoriteDto,
  ): Promise<FavoriteView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      pokemonId: dto.pokemonId,
      pokemonName: dto.pokemonName,
      note: dto.note ?? '',
      rating: dto.rating,
    });
  }

  patch(
    playerId: string,
    id: number,
    dto: UpdateFavoriteDto,
  ): Promise<FavoriteView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      pokemonId: dto.pokemonId,
      pokemonName: dto.pokemonName,
      note: dto.note,
      rating: dto.rating,
    });
  }

  async remove(playerId: string, id: number): Promise<void> {
    try {
      await this.prisma.favorite.delete({ where: { id, playerId } });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }

  private async update(
    playerId: string,
    id: number,
    data: Prisma.FavoriteUpdateInput,
  ): Promise<FavoriteView> {
    try {
      return await this.prisma.favorite.update({
        where: { id, playerId },
        data,
        omit: OMIT,
      });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      if (isUniqueViolation(err)) throw new ConflictException(DUPLICATE);
      throw err;
    }
  }
}
