import { Injectable, NotFoundException } from '@nestjs/common';
import { assertSameId, orderBy, pageArgs } from '../common/list-query.js';
import { isNotFound } from '../common/prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateTeamDto,
  ReplaceTeamDto,
  TeamQueryDto,
  UpdateTeamDto,
} from './teams.dto.js';

const DEFAULT_LIMIT = 50;
const NOT_FOUND = 'Equipo no encontrado';
/** El dueño nunca sale en la respuesta: mismo contrato que JSON Server. */
const OMIT = { playerId: true } as const;
export type TeamView = Prisma.TeamGetPayload<{ omit: typeof OMIT }>;

/**
 * Equipos del jugador. TODA consulta filtra por `playerId` (del token, nunca del cliente): pedir el id de otro
 * jugador da 404, igual que si no existiera, para no revelar que existe.
 */
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    playerId: string,
    q: TeamQueryDto,
  ): Promise<{ items: TeamView[]; total?: number }> {
    const where = { playerId };
    const { take, skip, paginated } = pageArgs(q, DEFAULT_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        omit: OMIT,
        orderBy: orderBy(q._sort, q._order),
        take,
        skip,
      }),
      paginated ? this.prisma.team.count({ where }) : undefined,
    ]);
    return { items, total };
  }

  async get(playerId: string, id: number): Promise<TeamView> {
    const team = await this.prisma.team.findFirst({
      where: { id, playerId },
      omit: OMIT,
    });
    if (!team) throw new NotFoundException(NOT_FOUND);
    return team;
  }

  create(playerId: string, dto: CreateTeamDto): Promise<TeamView> {
    return this.prisma.team.create({
      data: {
        playerId,
        name: dto.name,
        description: dto.description ?? '',
        pokemonIds: dto.pokemonIds,
      },
      omit: OMIT,
    });
  }

  replace(
    playerId: string,
    id: number,
    dto: ReplaceTeamDto,
  ): Promise<TeamView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      name: dto.name,
      description: dto.description ?? '',
      pokemonIds: dto.pokemonIds,
    });
  }

  patch(playerId: string, id: number, dto: UpdateTeamDto): Promise<TeamView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      name: dto.name,
      description: dto.description,
      pokemonIds: dto.pokemonIds,
    });
  }

  async remove(playerId: string, id: number): Promise<void> {
    try {
      await this.prisma.team.delete({ where: { id, playerId } });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }

  private async update(
    playerId: string,
    id: number,
    data: Prisma.TeamUpdateInput,
  ): Promise<TeamView> {
    try {
      return await this.prisma.team.update({
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
