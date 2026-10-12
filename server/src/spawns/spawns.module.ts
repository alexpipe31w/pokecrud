import { Module } from '@nestjs/common';
import { SpawnsController } from './spawns.controller.js';
import { SpawnsService } from './spawns.service.js';
import { WeatherService } from './weather.service.js';

@Module({
  controllers: [SpawnsController],
  providers: [SpawnsService, WeatherService],
  exports: [SpawnsService],
})
export class SpawnsModule {}
