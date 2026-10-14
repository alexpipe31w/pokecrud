import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { Response } from 'express';

/** Máximo de `_limit` en cualquier listado (estándar: todo listado paginado y acotado). */
export const MAX_LIMIT = 100;

/**
 * Parámetros de listado compatibles con JSON Server (`_sort`, `_order`, `_page`, `_limit`), que es el
 * contrato que usan la app de IS-11 y la colección de Postman. Cada recurso extiende esta clase y declara
 * su `_sort` con la lista blanca de campos ordenables. Cualquier otro parámetro → 400 (forbidNonWhitelisted).
 */
export class ListQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  _order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  _page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  _limit?: number;
}

export interface PageArgs {
  take: number;
  skip: number;
  /** Si el cliente pidió página o límite: entonces se devuelve `X-Total-Count`, como JSON Server. */
  paginated: boolean;
}

/** `take`/`skip` a partir de la consulta. `defaultLimit` aplica cuando el cliente no manda `_limit`. */
export function pageArgs(q: ListQueryDto, defaultLimit: number): PageArgs {
  const take = q._limit ?? defaultLimit;
  return {
    take,
    skip: q._page ? (q._page - 1) * take : 0,
    paginated: q._page !== undefined || q._limit !== undefined,
  };
}

/** Orden pedido + `id` como desempate, para que la paginación sea estable con valores repetidos. */
export function orderBy<F extends string>(
  sort: F | undefined,
  order: 'asc' | 'desc' | undefined,
): Record<string, 'asc' | 'desc'>[] {
  const dir = order ?? 'asc';
  return !sort || sort === 'id'
    ? [{ id: dir }]
    : [{ [sort]: dir }, { id: 'asc' }];
}

export function setTotalCount(res: Response, total: number): void {
  res.setHeader('X-Total-Count', String(total));
}

/** Si el cuerpo trae `id` (JSON Server lo permite en PUT/PATCH), tiene que ser el de la ruta: no se cambia el id. */
export function assertSameId(bodyId: number | undefined, pathId: number): void {
  if (bodyId !== undefined && bodyId !== pathId) {
    throw new BadRequestException(
      'El id del cuerpo no coincide con el de la ruta',
    );
  }
}
