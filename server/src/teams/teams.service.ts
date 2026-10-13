import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
const NOT_YOURS = 'Hay Pokémon que no son tuyos';
/** Como la colección: esperar el bloqueo de una transferencia simultánea. */
const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 };
type Tx = Prisma.TransactionClient;
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
    return this.prisma.$transaction(async (tx) => {
      await this.assertOwned(tx, playerId, dto.caughtIds);
      return tx.team.create({
        data: {
          playerId,
          name: dto.name,
          description: dto.description ?? '',
          pokemonIds: dto.pokemonIds,
          caughtIds: dto.caughtIds ?? [],
        },
        omit: OMIT,
      });
    }, TX_OPTIONS);
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
      caughtIds: dto.caughtIds,
    });
  }

  patch(playerId: string, id: number, dto: UpdateTeamDto): Promise<TeamView> {
    assertSameId(dto.id, id);
    return this.update(playerId, id, {
      name: dto.name,
      description: dto.description,
      pokemonIds: dto.pokemonIds,
      caughtIds: dto.caughtIds,
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

  /**
   * Todos los `caughtIds` son capturas del jugador. Las filas quedan bloqueadas (FOR SHARE) hasta el final de la
   * transacción: una transferencia simultánea espera y después quita el Pokémon de este equipo (D-054); si la
   * transferencia llegó antes, aquí ya no está y se responde 400.
   */
  private async assertOwned(
    tx: Tx,
    playerId: string,
    caughtIds: string[] | undefined,
  ): Promise<void> {
    if (!caughtIds?.length) return;
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "CaughtPokemon"
      WHERE id = ANY(${caughtIds}::uuid[]) AND "playerId" = ${playerId}::uuid
      FOR SHARE`;
    if (rows.length !== caughtIds.length) {
      throw new BadRequestException(NOT_YOURS);
    }
  }

  private async update(
    playerId: string,
    id: number,
    data: Prisma.TeamUpdateInput & { caughtIds?: string[] },
  ): Promise<TeamView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertOwned(tx, playerId, data.caughtIds);
        return tx.team.update({
          where: { id, playerId },
          data,
          omit: OMIT,
        });
      }, TX_OPTIONS);
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }
}
