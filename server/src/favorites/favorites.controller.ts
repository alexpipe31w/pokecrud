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
  CreateFavoriteDto,
  ReplaceFavoriteDto,
  FavoriteQueryDto,
  UpdateFavoriteDto,
} from './favorites.dto.js';
import { FavoritesService, FavoriteView } from './favorites.service.js';

/** `/favorites`: exige sesión (guard global) y solo ve los favoritos del jugador del token. */
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  async list(
    @CurrentPlayer() player: AuthPlayer,
    @Query() q: FavoriteQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FavoriteView[]> {
    const { items, total } = await this.favorites.list(player.id, q);
    if (total !== undefined) setTotalCount(res, total);
    return items;
  }

  @Get(':id')
  get(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FavoriteView> {
    return this.favorites.get(player.id, id);
  }

  @Throttle(WRITE_LIMIT)
  @Post()
  create(
    @CurrentPlayer() player: AuthPlayer,
    @Body() dto: CreateFavoriteDto,
  ): Promise<FavoriteView> {
    return this.favorites.create(player.id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Put(':id')
  replace(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceFavoriteDto,
  ): Promise<FavoriteView> {
    return this.favorites.replace(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Patch(':id')
  patch(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFavoriteDto,
  ): Promise<FavoriteView> {
    return this.favorites.patch(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Delete(':id')
  async remove(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, never>> {
    await this.favorites.remove(player.id, id);
    return {};
  }
}
