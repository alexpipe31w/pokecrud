import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/auth.decorators.js';
import { WRITE_LIMIT } from '../common/limits.js';
import { setTotalCount } from '../common/list-query.js';
import { InventoryPokemon } from '../generated/prisma/client.js';
import {
  CreateInventoryPokemonDto,
  InventoryQueryDto,
  ReplaceInventoryPokemonDto,
  UpdateInventoryPokemonDto,
} from './inventory.dto.js';
import { InventoryService } from './inventory.service.js';

/**
 * `/pokemon` de IS-11: inventario compartido de la clase. Leer es público; escribir exige sesión (cualquier
 * jugador). Mismo contrato que JSON Server: listas como array plano, DELETE → 200 `{}`.
 */
@Controller('pokemon')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Public()
  @Get()
  async list(
    @Query() q: InventoryQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<InventoryPokemon[]> {
    const { items, total } = await this.inventory.list(q);
    if (total !== undefined) setTotalCount(res, total);
    return items;
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<InventoryPokemon> {
    return this.inventory.get(id);
  }

  @Throttle(WRITE_LIMIT)
  @Post()
  create(@Body() dto: CreateInventoryPokemonDto): Promise<InventoryPokemon> {
    return this.inventory.create(dto);
  }

  @Throttle(WRITE_LIMIT)
  @Put(':id')
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceInventoryPokemonDto,
  ): Promise<InventoryPokemon> {
    return this.inventory.replace(id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Patch(':id')
  patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryPokemonDto,
  ): Promise<InventoryPokemon> {
    return this.inventory.patch(id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, never>> {
    await this.inventory.remove(id);
    return {};
  }
}
