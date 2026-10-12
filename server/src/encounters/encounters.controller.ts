import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import { ThrowDto } from './encounters.dto.js';
import {
  EncounterView,
  EncountersService,
  ThrowResult,
} from './encounters.service.js';

/**
 * Encuentros (F2-06). `:id` es el id del spawn que dio `GET /spawns` (`celda:franja:índice`). Exige sesión.
 * 404 si no existe, 410 si su franja acabó, 403 si el jugador está lejos, 409 si ya se resolvió o no quedan bolas.
 */
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':id')
  details(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id') id: string,
  ): Promise<EncounterView> {
    return this.encounters.details(player.id, id);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post(':id/throw')
  @HttpCode(200)
  throw(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id') id: string,
    @Body() dto: ThrowDto,
  ): Promise<ThrowResult> {
    return this.encounters.throw(player.id, id, dto);
  }
}
