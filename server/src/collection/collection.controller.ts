import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import type {
  CollectionPage,
  PokedexView,
} from '../../../shared/protocol/collection.js';
import { CollectionQueryDto } from './collection.dto.js';
import { CollectionService } from './collection.service.js';

/** `GET /collection` (F3-02a): los Pokémon capturados del jugador del token. Exige sesión (guard global). */
@Controller('collection')
export class CollectionController {
  constructor(private readonly collection: CollectionService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  list(
    @CurrentPlayer() player: AuthPlayer,
    @Query() q: CollectionQueryDto,
  ): Promise<CollectionPage> {
    return this.collection.list(player.id, q);
  }
}

/** `GET /pokedex` (F3-02a): especies vistas y capturadas por el jugador del token (la pantalla llega en F3-04). */
@Controller('pokedex')
export class PokedexController {
  constructor(private readonly collection: CollectionService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get()
  get(@CurrentPlayer() player: AuthPlayer): Promise<PokedexView> {
    return this.collection.pokedex(player.id);
  }
}
