import { Module } from '@nestjs/common';
import { SpawnsModule } from '../spawns/spawns.module.js';
import {
  CollectionController,
  PokedexController,
} from './collection.controller.js';
import { CollectionService } from './collection.service.js';

@Module({
  imports: [SpawnsModule],
  controllers: [CollectionController, PokedexController],
  providers: [CollectionService],
})
export class CollectionModule {}
