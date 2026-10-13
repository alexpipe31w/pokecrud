import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import type {
  BallId,
  BerryId,
  ThrowQuality,
} from '../../../shared/engine/capture.js';
import type { ThrowRequest } from '../../../shared/protocol/encounters.js';

export const BALLS: BallId[] = ['POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL'];
export const BERRIES: BerryId[] = ['RAZZ_BERRY'];
export const QUALITIES: ThrowQuality[] = ['none', 'nice', 'great', 'excellent'];

/** `POST /encounters/:id/throw`. Cualquier otro campo → 400 (forbidNonWhitelisted). */
export class ThrowDto implements ThrowRequest {
  @IsIn(BALLS)
  ball: BallId;

  /** Baya usada en ESTE lanzamiento (se gasta aunque falle), o null/ausente. */
  @IsOptional()
  @ValidateIf((o: ThrowDto) => o.berry !== null)
  @IsIn(BERRIES)
  berry?: BerryId | null;

  /** Lo que dice el cliente; el servidor puede rebajar un "excellent" inverosímil (D-028). */
  @IsIn(QUALITIES)
  throwQuality: ThrowQuality;

  @IsBoolean()
  curve: boolean;

  /** Id que genera el cliente para ESTE lanzamiento: si reintenta por la red, manda el mismo y no gasta otra bola. */
  @IsUUID()
  clientThrowId: string;
}
