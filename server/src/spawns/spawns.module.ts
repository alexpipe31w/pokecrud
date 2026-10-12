import { Module } from '@nestjs/common';
import { LocationModule } from '../location/location.module.js';
import { SpawnsController } from './spawns.controller.js';
import { SpawnsService } from './spawns.service.js';
import { WeatherService } from './weather.service.js';

@Module({
  imports: [LocationModule],
  controllers: [SpawnsController],
  providers: [SpawnsService, WeatherService],
  exports: [SpawnsService],
})
export class SpawnsModule {}
