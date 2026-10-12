import { Module } from '@nestjs/common';
import { CustomPokemonController } from './custom-pokemon.controller.js';
import { CustomPokemonService } from './custom-pokemon.service.js';

@Module({
  controllers: [CustomPokemonController],
  providers: [CustomPokemonService],
})
export class CustomPokemonModule {}
