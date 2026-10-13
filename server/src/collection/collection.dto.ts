import { BadRequestException } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { TypeName } from '../../../shared/data/dataset.types.js';
import { TYPE_NAMES } from '../../../shared/engine/battle/type-chart.js';
import type {
  CollectionSort,
  SortOrder,
} from '../../../shared/protocol/collection.js';

export const COLLECTION_DEFAULT_LIMIT = 30;
export const COLLECTION_MAX_LIMIT = 50;

/** `'true'`/`'false'` de la query → boolean; cualquier otra cosa se rechaza (no se adivina). */
const toBool = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException('shiny y favorite solo admiten true o false');
};

/** `GET /collection?…` (F3-02a). Cualquier otro parámetro → 400 (forbidNonWhitelisted). */
export class CollectionQueryDto {
  @IsOptional()
  @IsIn(['caughtAt', 'cp', 'speciesId'])
  sort: CollectionSort = 'caughtAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: SortOrder = 'desc';

  @IsOptional()
  @IsIn(TYPE_NAMES)
  type?: TypeName;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  shiny?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  favorite?: boolean;

  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(COLLECTION_MAX_LIMIT)
  limit: number = COLLECTION_DEFAULT_LIMIT;
}
