import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import { LocationService } from '../location/location.service.js';
import type { NearbySpawns } from '../../../shared/protocol/spawns.js';
import { SpawnsQueryDto } from './spawns.dto.js';
import { SpawnsService } from './spawns.service.js';

/**
 * `GET /spawns?lat&lng` (F1-06): Pokémon salvajes a ≤ 200 m. Exige sesión (guard global): sin cuenta no se
 * puede barrer el mapa. Límite propio de 20/min por IP; el cliente pide al moverse o al acabar la franja.
 */
@Controller('spawns')
export class SpawnsController {
  constructor(
    private readonly spawns: SpawnsService,
    private readonly location: LocationService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get()
  async near(
    @CurrentPlayer() player: AuthPlayer,
    @Query() q: SpawnsQueryDto,
  ): Promise<NearbySpawns> {
    // Se guarda dónde está el jugador: la captura (F2-06) exige estar a ≤ 80 m del Pokémon.
    const [nearby] = await Promise.all([
      this.spawns.near(q.lat, q.lng),
      this.location.record(player.id, q.lat, q.lng),
    ]);
    return nearby;
  }
}
