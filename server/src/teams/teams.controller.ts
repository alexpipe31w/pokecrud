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
  CreateTeamDto,
  ReplaceTeamDto,
  TeamQueryDto,
  UpdateTeamDto,
} from './teams.dto.js';
import { TeamsService, TeamView } from './teams.service.js';

/** `/teams`: exige sesión (guard global) y solo ve los equipos del jugador del token. */
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  async list(
    @CurrentPlayer() player: AuthPlayer,
    @Query() q: TeamQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TeamView[]> {
    const { items, total } = await this.teams.list(player.id, q);
    if (total !== undefined) setTotalCount(res, total);
    return items;
  }

  @Get(':id')
  get(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TeamView> {
    return this.teams.get(player.id, id);
  }

  @Throttle(WRITE_LIMIT)
  @Post()
  create(
    @CurrentPlayer() player: AuthPlayer,
    @Body() dto: CreateTeamDto,
  ): Promise<TeamView> {
    return this.teams.create(player.id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Put(':id')
  replace(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceTeamDto,
  ): Promise<TeamView> {
    return this.teams.replace(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Patch(':id')
  patch(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamView> {
    return this.teams.patch(player.id, id, dto);
  }

  @Throttle(WRITE_LIMIT)
  @Delete(':id')
  async remove(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Record<string, never>> {
    await this.teams.remove(player.id, id);
    return {};
  }
}
