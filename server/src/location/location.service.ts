import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const M_PER_DEG_LAT = 111_320;

/** Distancia en metros entre dos puntos cercanos (equirectangular: error despreciable a < 1 km). */
export function distanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dy = (lat2 - lat1) * M_PER_DEG_LAT;
  const dx =
    (lng2 - lng1) *
    M_PER_DEG_LAT *
    Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

export interface LastLocation {
  lat: number;
  lng: number;
  at: Date;
}

/**
 * Última ubicación conocida del jugador (F2-06, D-028). La guarda `GET /spawns` (lo que el cliente pide al moverse)
 * y la usa la captura para exigir estar cerca del Pokémon. No es antitrampas completo (el GPS se puede falsear),
 * pero obliga a pedir los spawns desde el sitio en vez de lanzar contra ids de cualquier lugar.
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Mejor esfuerzo: si falla, se registra y los spawns se sirven igual (lo secundario no tumba lo principal). */
  async record(playerId: string, lat: number, lng: number): Promise<void> {
    try {
      await this.prisma.player.update({
        where: { id: playerId },
        data: { lastLat: lat, lastLng: lng, lastLocatedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn({
        msg: 'location.record_failed',
        playerId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async last(playerId: string): Promise<LastLocation | null> {
    const p = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { lastLat: true, lastLng: true, lastLocatedAt: true },
    });
    if (!p || p.lastLat === null || p.lastLng === null || !p.lastLocatedAt)
      return null;
    return { lat: p.lastLat, lng: p.lastLng, at: p.lastLocatedAt };
  }
}
