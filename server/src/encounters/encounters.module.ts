import { Module } from '@nestjs/common';
import { BagModule } from '../bag/bag.module.js';
import { LocationModule } from '../location/location.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { SpawnsModule } from '../spawns/spawns.module.js';
import { EncountersController } from './encounters.controller.js';
import { resolveThrow } from '../../../shared/engine/capture.js';
import { EncountersService, THROW_RESOLVER } from './encounters.service.js';

@Module({
  imports: [SpawnsModule, LocationModule, ProgressionModule, BagModule],
  controllers: [EncountersController],
  providers: [
    EncountersService,
    { provide: THROW_RESOLVER, useValue: resolveThrow },
  ],
})
export class EncountersModule {}
