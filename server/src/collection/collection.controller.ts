import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthPlayer } from '../auth/auth.decorators.js';
import { CurrentPlayer } from '../auth/auth.decorators.js';
import type {
  CollectionDetail,
  CollectionItem,
  CollectionPage,
  PokedexView,
  TransferResult,
} from '../../../shared/protocol/collection.js';
import {
  CollectionEvolveDto,
  CollectionPatchDto,
  CollectionQueryDto,
} from './collection.dto.js';
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

  /** La ficha (F3-03). Un id que no es UUID → 400; lo ajeno o inexistente → 404. */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':id')
  detail(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CollectionDetail> {
    return this.collection.detail(player.id, id);
  }

  /** Mote y favorito (F3-03). */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Patch(':id')
  patch(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CollectionPatchDto,
  ): Promise<CollectionItem> {
    return this.collection.patch(player.id, id, dto);
  }

  /** Evolucionar con caramelos (F3-05, D-053): devuelve la ficha ya evolucionada. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/evolve')
  @HttpCode(200)
  evolve(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CollectionEvolveDto,
  ): Promise<CollectionDetail> {
    return this.collection.evolve(player.id, id, dto.to);
  }

  /** Transferir (F3-03): +1 caramelo de su familia. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Delete(':id')
  transfer(
    @CurrentPlayer() player: AuthPlayer,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransferResult> {
    return this.collection.transfer(player.id, id);
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
