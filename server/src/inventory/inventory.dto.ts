import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
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

/** Mismos límites que el formulario de IS-11 (`pokemon-form.component.ts`): cada stat 1-255. */
export class PokemonStatsDto {
  @IsInt() @Min(1) @Max(255) hp: number;
  @IsInt() @Min(1) @Max(255) attack: number;
  @IsInt() @Min(1) @Max(255) defense: number;
  @IsInt() @Min(1) @Max(255) specialAttack: number;
  @IsInt() @Min(1) @Max(255) specialDefense: number;
  @IsInt() @Min(1) @Max(255) speed: number;
}

/** Campos de un Pokémon del inventario (modelo `src/app/models/pokemon.model.ts` de la app), sin el id. */
class InventoryFieldsDto extends ClientTimestamps {
  @IsString()
  @Length(1, 30)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(POKEMON_TYPES, { each: true })
  types: string[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  abilities: string[];

  @IsString()
  @MaxLength(500)
  @OptionalImageUrl()
  imageUrl: string;

  /** Metros. */
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1000)
  height: number;

  /** Kilogramos. */
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10_000)
  weight: number;

  @IsInt()
  @Min(0)
  @Max(10_000)
  baseExperience: number;

  @ValidateNested()
  @Type(() => PokemonStatsDto)
  stats: PokemonStatsDto;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  price: number;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;
}

/** POST: el id es el nº de la Pokédex y lo manda el cliente (como en JSON Server). */
export class CreateInventoryPokemonDto extends InventoryFieldsDto {
  @IsInt()
  @Min(1)
  @Max(99_999)
  id: number;
}

/** PUT: reemplaza todo. El id va en la ruta; si viene en el cuerpo, tiene que coincidir. */
export class ReplaceInventoryPokemonDto extends InventoryFieldsDto {
  @IsOptional()
  @IsInt()
  id?: number;
}

/** PATCH: mezcla solo los campos enviados. */
export class UpdateInventoryPokemonDto extends PartialType(
  ReplaceInventoryPokemonDto,
) {}

export class InventoryQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['id', 'name', 'price', 'stock'])
  _sort?: 'id' | 'name' | 'price' | 'stock';

  /** Búsqueda por nombre (JSON Server: `name_like`). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name_like?: string;
}
