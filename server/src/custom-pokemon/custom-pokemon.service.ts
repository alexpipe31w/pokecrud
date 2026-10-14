import { Injectable, NotFoundException } from '@nestjs/common';
import { assertSameId, orderBy, pageArgs } from '../common/list-query.js';
import { isNotFound } from '../common/prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCustomPokemonDto,
  CustomPokemonQueryDto,
  CustomStatsDto,
  ReplaceCustomPokemonDto,
  UpdateCustomPokemonDto,
} from './custom-pokemon.dto.js';

const DEFAULT_LIMIT = 50;
const NOT_FOUND = 'Pokémon personalizado no encontrado';
const OMIT = { playerId: true } as const;
export type CustomPokemonView = Prisma.CustomPokemonGetPayload<{
  omit: typeof OMIT;
}>;

/** El DTO es una instancia de clase: a la columna JSON va como objeto plano. */
const plainStats = (s: CustomStatsDto): Prisma.InputJsonObject => ({
  hp: s.hp,
  attack: s.attack,
  defense: s.defense,
  speed: s.speed,
});

/** Pokémon inventados por el jugador. Mismo esquema que TeamsService: filtrado por `playerId`, lo ajeno da 404. */
@Injectable()
export class CustomPokemonService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    playerId: string,
    q: CustomPokemonQueryDto,
  ): Promise<{ items: CustomPokemonView[]; total?: number }> {
    const where = { playerId };
    const { take, skip, paginated } = pageArgs(q, DEFAULT_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.customPokemon.findMany({
        where,
        omit: OMIT,
        orderBy: orderBy(q._sort, q._order),
        take,
        skip,
      }),
      paginated ? this.prisma.customPokemon.count({ where }) : undefined,
    ]);
    return { items, total };
  }

  async get(playerId: string, id: number): Promise<CustomPokemonView> {
    const custom = await this.prisma.customPokemon.findFirst({
      where: { id, playerId },
      omit: OMIT,
    });
    if (!custom) throw new NotFoundException(NOT_FOUND);
    return custom;
  }

  create(
    playerId: string,
    dto: CreateCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    return this.prisma.customPokemon.create({
      data: {
        playerId,
        name: dto.name,
        types: dto.types,
        stats: plainStats(dto.stats),
        imageUrl: dto.imageUrl ?? '',
        description: dto.description ?? '',
      },
      omit: OMIT,
    });
  }

  replace(
    playerId: string,
    id: number,
    dto: ReplaceCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      name: dto.name,
      types: dto.types,
      stats: plainStats(dto.stats),
      imageUrl: dto.imageUrl ?? '',
      description: dto.description ?? '',
    });
  }

  patch(
    playerId: string,
    id: number,
    dto: UpdateCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      name: dto.name,
      types: dto.types,
      stats: dto.stats ? plainStats(dto.stats) : undefined,
      imageUrl: dto.imageUrl,
      description: dto.description,
    });
  }

  async remove(playerId: string, id: number): Promise<void> {
    try {
      await this.prisma.customPokemon.delete({ where: { id, playerId } });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }

  private async update(
    playerId: string,
    id: number,
    data: Prisma.CustomPokemonUpdateInput,
  ): Promise<CustomPokemonView> {
    try {
      return await this.prisma.customPokemon.update({
        where: { id, playerId },
        data,
        omit: OMIT,
      });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }
}
