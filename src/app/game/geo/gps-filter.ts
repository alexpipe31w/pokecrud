import { distanceM, type LatLng } from '@shared/engine/geo';

export interface GpsFix extends LatLng {
  /** Radio de error en metros (68 %), como lo da el sistema. */
  accuracy: number;
  /** ms desde epoch. */
  timestamp: number;
}

export interface FilteredFix extends GpsFix {
  /** Precisión peor de WEAK_ACCURACY_M: el HUD avisa "GPS débil" (DISENO §6, sin bloquear). */
  weak: boolean;
}

export const MAX_ACCURACY_M = 50;
export const WEAK_ACCURACY_M = 25;
export const JUMP_M = 50;
export const JUMP_WINDOW_MS = 2000;
const WINDOW = 4;

/** Filtro del GPS (ARQUITECTURA §4). Puro: sin Angular ni Capacitor, para poder probarlo. */
export class GpsFilter {
  private readonly window: GpsFix[] = [];

  /** Devuelve la posición suavizada, o `null` si el fix se descarta. */
  push(fix: GpsFix): FilteredFix | null {
    if (![fix.lat, fix.lng, fix.accuracy, fix.timestamp].every(Number.isFinite)) return null;
    const prev = this.window.at(-1);
    if (prev) {
      if (fix.timestamp <= prev.timestamp) return null;
      if (fix.accuracy > MAX_ACCURACY_M) return null;
      const dt = fix.timestamp - prev.timestamp;
      if (dt < JUMP_WINDOW_MS && distanceM(prev, fix) > JUMP_M) {
        console.debug('[gps] salto descartado', Math.round(distanceM(prev, fix)), 'm en', dt, 'ms');
        return null;
      }
    }
    this.window.push(fix);
    if (this.window.length > WINDOW) this.window.shift();

    let wSum = 0;
    let lat = 0;
    let lng = 0;
    for (const f of this.window) {
      const w = 1 / Math.max(1, f.accuracy) ** 2;
      wSum += w;
      lat += f.lat * w;
      lng += f.lng * w;
    }
    return {
      lat: lat / wSum,
      lng: lng / wSum,
      accuracy: fix.accuracy,
      timestamp: fix.timestamp,
      weak: fix.accuracy > WEAK_ACCURACY_M,
    };
  }

  reset(): void {
    this.window.length = 0;
  }
}
