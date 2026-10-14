import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryPokemon, Prisma } from '../generated/prisma/client.js';
import { assertSameId, orderBy, pageArgs } from '../common/list-query.js';
import { isNotFound, isUniqueViolation } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateInventoryPokemonDto,
  InventoryQueryDto,
  PokemonStatsDto,
  ReplaceInventoryPokemonDto,
  UpdateInventoryPokemonDto,
} from './inventory.dto.js';

/** Sin `_limit`, `/pokemon` devuelve hasta 1025: la tabla está acotada por el nº de especies y la app de IS-11 pide todo. */
const DEFAULT_LIMIT = 1025;
const NOT_FOUND = 'Pokémon no encontrado';
/** `fields()` devuelve todo opcional (sirve para PATCH); en el alta el DTO ya garantizó que viene todo. */
type CreateData = Prisma.InventoryPokemonCreateInput;

/**
 * Lo que se guarda: sin fechas del cliente (las pone el servidor) ni id (va en la ruta), y `stats` como objeto
 * plano (el DTO es una instancia de clase y la columna es JSON).
 */
function fields(dto: UpdateInventoryPokemonDto) {
  const { id: _id, createdAt: _c, updatedAt: _u, stats, ...rest } = dto;
  return { ...rest, ...(stats && { stats: plainStats(stats) }) };
}

const plainStats = (s: PokemonStatsDto): Prisma.InputJsonObject => ({
  hp: s.hp,
  attack: s.attack,
  defense: s.defense,
  specialAttack: s.specialAttack,
  specialDefense: s.specialDefense,
  speed: s.speed,
});

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    q: InventoryQueryDto,
  ): Promise<{ items: InventoryPokemon[]; total?: number }> {
    const where = q.name_like
      ? { name: { contains: q.name_like, mode: 'insensitive' as const } }
      : {};
    const { take, skip, paginated } = pageArgs(q, DEFAULT_LIMIT);
    const [items, total] = await Promise.all([
      this.prisma.inventoryPokemon.findMany({
        where,
        orderBy: orderBy(q._sort, q._order),
        take,
        skip,
      }),
      paginated ? this.prisma.inventoryPokemon.count({ where }) : undefined,
    ]);
    return { items, total };
  }

  async get(id: number): Promise<InventoryPokemon> {
    const p = await this.prisma.inventoryPokemon.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(NOT_FOUND);
    return p;
  }

  async create(dto: CreateInventoryPokemonDto): Promise<InventoryPokemon> {
    try {
      return await this.prisma.inventoryPokemon.create({
        data: { ...fields(dto), id: dto.id } as CreateData,
      });
    } catch (err) {
      if (isUniqueViolation(err))
        throw new ConflictException('Ese Pokémon ya está en el inventario');
      throw err;
    }
  }

  replace(
    id: number,
    dto: ReplaceInventoryPokemonDto,
  ): Promise<InventoryPokemon> {
    assertSameId(dto.id, id);
    return this.update(id, fields(dto));
  }

  patch(id: number, dto: UpdateInventoryPokemonDto): Promise<InventoryPokemon> {
    assertSameId(dto.id, id);
    return this.update(id, fields(dto));
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.inventoryPokemon.delete({ where: { id } });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }

  private async update(
    id: number,
    data: ReturnType<typeof fields>,
  ): Promise<InventoryPokemon> {
    try {
      // Valores absolutos (PUT/PATCH de JSON Server), no incrementos: el CHECK stock >= 0 cubre el resto.
      return await this.prisma.inventoryPokemon.update({ where: { id }, data });
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundException(NOT_FOUND);
      throw err;
    }
  }
}
