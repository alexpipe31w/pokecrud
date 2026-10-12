import { distanceM, type LatLng } from '@shared/engine/geo';

/** Moverse más que esto desde la última petición pide otra (el servidor devuelve lo que hay a ≤ 200 m). */
export const REFETCH_MOVE_M = 60;
/** Separación mínima entre peticiones (salvo el fin de franja): el servidor admite 20/min por IP (D-025). */
export const MIN_GAP_MS = 8_000;
const EXPIRY_MARGIN_MS = 1_000;

export interface FetchState {
  inFlight: boolean;
  /** Última petición con éxito. */
  lastAt: number | null;
  lastPos: LatLng | null;
  expiresAt: number | null;
  failures: number;
  /** Último intento (con éxito o no), para la espera tras fallar. */
  lastAttemptAt?: number;
}

/** Espera tras `failures` fallos seguidos: 5 s, 10, 20… hasta 60 s (servidor dormido, DISENO §6). */
export const backoffMs = (failures: number): number => Math.min(60_000, 5_000 * 2 ** (failures - 1));

/**
 * ¿Toca pedir `GET /spawns`? La primera vez; al acabar la franja; o tras moverse > REFETCH_MOVE_M (con MIN_GAP_MS
 * entre peticiones). Nunca dos a la vez, y tras un fallo se espera `backoffMs`.
 */
export function shouldRefetch(s: FetchState, now: number, pos: LatLng): boolean {
  if (s.inFlight) return false;
  if (s.failures > 0) return now - (s.lastAttemptAt ?? 0) > backoffMs(s.failures);
  if (s.lastAt === null || s.lastPos === null) return true;
  if (s.expiresAt !== null && now > s.expiresAt + EXPIRY_MARGIN_MS) return true;
  return now - s.lastAt > MIN_GAP_MS && distanceM(s.lastPos, pos) > REFETCH_MOVE_M;
}
