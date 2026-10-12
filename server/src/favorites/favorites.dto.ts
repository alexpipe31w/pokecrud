import { PartialType } from '@nestjs/mapped-types';
import {
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

export class ReplaceFavoriteDto extends ClientTimestamps {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsInt()
  @Min(1)
  @Max(99_999)
  pokemonId: number;

  @IsString()
  @Length(1, 50)
  pokemonName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** 1-5 (también CHECK `rating_range` en la base). */
  @IsInt()
  @Min(1, { message: 'La valoración va de 1 a 5' })
  @Max(5, { message: 'La valoración va de 1 a 5' })
  rating: number;
}

export class CreateFavoriteDto extends ReplaceFavoriteDto {}
export class UpdateFavoriteDto extends PartialType(ReplaceFavoriteDto) {}

export class FavoriteQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['id', 'pokemonId', 'pokemonName', 'rating', 'createdAt'])
  _sort?: 'id' | 'pokemonId' | 'pokemonName' | 'rating' | 'createdAt';
}
