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
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import { setTotalCount } from '../common/list-query.js';
import { WRITE_LIMIT } from '../common/limits.js';
import {
  CreateCustomPokemonDto,
  ReplaceCustomPokemonDto,
  CustomPokemonQueryDto,
  UpdateCustomPokemonDto,
} from './custom-pokemon.dto.js';
import {
  CustomPokemonService,
  CustomPokemonView,
} from './custom-pokemon.service.js';

/** `/customPokemon`: exige sesión (guard global) y solo ve los Pokémon inventados por el jugador del token. */
@Controller('customPokemon')
export class CustomPokemonController {
  constructor(private readonly customPokemon: CustomPokemonService) {}

  @Get()
  async list(
    @CurrentPlayer() player: AuthPlayer,
    @Query() q: CustomPokemonQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomPokemonView[]> {
    const { items, total } = await this.customPokemon.list(player.id, q);
    if (total !== undefined) setTotalCount(res, total);
    return items;
  }

  @Get(':id')
  get(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomPokemonView> {
    return this.customPokemon.get(player.id, id);
  }

  @Throttle(WRITE_LIMIT)
  @Post()
  create(
    @CurrentPlayer() player: AuthPlayer,
    @Body() dto: CreateCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    return this.customPokemon.create(player.id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Put(':id')
  replace(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    return this.customPokemon.replace(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Patch(':id')
  patch(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomPokemonDto,
  ): Promise<CustomPokemonView> {
    return this.customPokemon.patch(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Delete(':id')
  async remove(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, never>> {
    await this.customPokemon.remove(player.id, id);
    return {};
  }
}
