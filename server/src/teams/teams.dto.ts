import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../common/list-query.js';
import { ClientTimestamps } from '../common/validation.js';

export class ReplaceTeamDto extends ClientTimestamps {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  /** Máx. 6 (también CHECK `max_six` en la base). Hoy nº de Pokédex; con F3 pasarán a ids de capturados. */
  @IsArray()
  @ArrayMaxSize(6, { message: 'Un equipo tiene como máximo 6 Pokémon' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(99_999, { each: true })
  pokemonIds: number[];
}

export class CreateTeamDto extends ReplaceTeamDto {}
export class UpdateTeamDto extends PartialType(ReplaceTeamDto) {}

export class TeamQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['id', 'name', 'createdAt', 'updatedAt'])
  _sort?: 'id' | 'name' | 'createdAt' | 'updatedAt';
}
