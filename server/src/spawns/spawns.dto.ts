import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

/** `GET /spawns?lat=…&lng=…` (grados decimales WGS84). Cualquier otro parámetro → 400 (forbidNonWhitelisted). */
export class SpawnsQueryDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-85)
  @Max(85)
  lat: number;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lng: number;
}
