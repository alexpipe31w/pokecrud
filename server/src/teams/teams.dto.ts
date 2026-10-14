import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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

  /** Máx. 6 (también CHECK `max_six` en la base). Nº de Pokédex: contrato del curso (D-019); el juego usa `caughtIds`. */
  @IsArray()
  @ArrayMaxSize(6, { message: 'Un equipo tiene como máximo 6 Pokémon' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(99_999, { each: true })
  pokemonIds: number[];

  /**
   * Pokémon CAPTURADOS del equipo (F3-06b, D-054): ids de `CaughtPokemon` del jugador, ≤ 6 y sin repetir (CHECK
   * `max_six_caught`). Opcional: si no se manda (Postman, contrato del curso) se conservan los que tenga.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6, { message: 'Un equipo tiene como máximo 6 Pokémon' })
  @ArrayUnique({ message: 'Un Pokémon no puede estar dos veces en el equipo' })
  @IsUUID('all', { each: true })
  caughtIds?: string[];
}

export class CreateTeamDto extends ReplaceTeamDto {}
export class UpdateTeamDto extends PartialType(ReplaceTeamDto) {}

export class TeamQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['id', 'name', 'createdAt', 'updatedAt'])
  _sort?: 'id' | 'name' | 'createdAt' | 'updatedAt';
}
