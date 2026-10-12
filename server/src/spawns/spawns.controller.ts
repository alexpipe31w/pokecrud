import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SpawnsQueryDto } from './spawns.dto.js';
import { NearbySpawns, SpawnsService } from './spawns.service.js';

/**
 * `GET /spawns?lat&lng` (F1-06): Pokémon salvajes a ≤ 200 m. Exige sesión (guard global): sin cuenta no se
 * puede barrer el mapa. Límite propio de 20/min por IP; el cliente pide al moverse o al acabar la franja.
 */
@Controller('spawns')
export class SpawnsController {
  constructor(private readonly spawns: SpawnsService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get()
  near(@Query() q: SpawnsQueryDto): Promise<NearbySpawns> {
    return this.spawns.near(q.lat, q.lng);
  }
}
