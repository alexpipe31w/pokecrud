import { Injectable, Logger } from '@nestjs/common';
import type { Weather } from '../../../shared/engine/spawns.js';

/** Celda de clima: 0,1° (~11 km). El clima no cambia cada 70 m y así se piden muy pocas veces. */
const WEATHER_CELL_DEG = 0.1;
export const WEATHER_TIMEOUT_MS = 4000;
/** Tope de entradas en memoria (cada una vive una franja de 10 min): nunca crece sin límite. */
const MAX_ENTRIES = 2000;
/** Por encima de esto (km/h a 10 m) cuenta como "viento", salvo que llueva, nieve o haya niebla. */
const WINDY_KMH = 30;

/** Código WMO de Open-Meteo + viento → nuestro clima de juego (ARQUITECTURA §5). */
export function weatherFromWmo(code: number, windKmh: number): Weather {
  if ([45, 48].includes(code)) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95)
    return 'rain';
  if (windKmh >= WINDY_KMH) return 'windy';
  return code >= 2 ? 'cloudy' : 'clear';
}

export const weatherCellOf = (lat: number, lng: number): string =>
  `${Math.floor(lat / WEATHER_CELL_DEG)}_${Math.floor(lng / WEATHER_CELL_DEG)}`;

/**
 * Clima real por celda de 0,1° y franja de 10 min (F1-06). Se resuelve UNA vez por (celda, franja) y se guarda
 * hasta que acaba la franja: así dos jugadores en el mismo sitio ven siempre los mismos spawns aunque Open-Meteo
 * cambie a mitad de franja. Si Open-Meteo falla o tarda más de 4 s → "despejado" para esa franja (degradación:
 * el mapa nunca se cae por el clima) y queda en el log.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, Promise<Weather>>();

  /** Clima de la celda de clima `weatherCell` (`y_x` de 0,1°) durante la franja `slot`. */
  weatherFor(weatherCell: string, slot: number): Promise<Weather> {
    const key = `${weatherCell}:${slot}`;
    let entry = this.cache.get(key);
    if (!entry) {
      entry = this.fetchWeather(weatherCell, slot);
      this.cache.set(key, entry);
      this.prune(slot);
    }
    return entry;
  }

  /** Quita franjas pasadas y, si aun así hay demasiadas, las más antiguas (Map conserva el orden de inserción). */
  private prune(currentSlot: number): void {
    for (const key of this.cache.keys()) {
      if (Number(key.split(':')[1]) < currentSlot) this.cache.delete(key);
    }
    while (this.cache.size > MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string;
      this.cache.delete(oldest);
    }
  }

  private async fetchWeather(
    weatherCell: string,
    slot: number,
  ): Promise<Weather> {
    const [y, x] = weatherCell.split('_').map(Number);
    // Centro de la celda de clima: todos los puntos de la celda piden lo mismo.
    const lat = ((y + 0.5) * WEATHER_CELL_DEG).toFixed(3);
    const lng = ((x + 0.5) * WEATHER_CELL_DEG).toFixed(3);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=weather_code,wind_speed_10m&wind_speed_unit=kmh`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {
        current?: { weather_code?: unknown; wind_speed_10m?: unknown };
      };
      const code = body.current?.weather_code;
      const wind = body.current?.wind_speed_10m;
      if (typeof code !== 'number' || typeof wind !== 'number') {
        throw new Error('respuesta sin weather_code/wind_speed_10m');
      }
      return weatherFromWmo(code, wind);
    } catch (err) {
      this.logger.warn({
        msg: 'weather.fallback',
        weatherCell,
        slot,
        reason: err instanceof Error ? err.message : String(err),
      });
      return 'clear';
    }
  }
}
