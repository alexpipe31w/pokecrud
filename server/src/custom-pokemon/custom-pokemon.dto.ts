import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ListQueryDto } from '../common/list-query.js';
import {
  ClientTimestamps,
  OptionalImageUrl,
  POKEMON_TYPES,
} from '../common/validation.js';

/** Stats de un Pokémon inventado (el formato de JSON Server tenía estas cuatro). */
export class CustomStatsDto {
  @IsInt() @Min(1) @Max(255) hp: number;
  @IsInt() @Min(1) @Max(255) attack: number;
  @IsInt() @Min(1) @Max(255) defense: number;
  @IsInt() @Min(1) @Max(255) speed: number;
}

export class ReplaceCustomPokemonDto extends ClientTimestamps {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @Length(1, 30)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(POKEMON_TYPES, { each: true })
  types: string[];

  @ValidateNested()
  @Type(() => CustomStatsDto)
  stats: CustomStatsDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @OptionalImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateCustomPokemonDto extends ReplaceCustomPokemonDto {}
export class UpdateCustomPokemonDto extends PartialType(
  ReplaceCustomPokemonDto,
) {}

export class CustomPokemonQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['id', 'name', 'createdAt'])
  _sort?: 'id' | 'name' | 'createdAt';
}
