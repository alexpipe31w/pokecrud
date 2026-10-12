import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { cellIdFor, slotFor } from '../../../shared/engine/spawns.js';
import { SpawnsService, VIEW_RADIUS_M } from './spawns.service.js';
import {
  WeatherService,
  weatherCellOf,
  weatherFromWmo,
} from './weather.service.js';

const SALT = 'sal-de-prueba-de-al-menos-32-caracteres!!';
const NEIVA = { lat: 2.9273, lng: -75.2819 };
const NOW = Date.UTC(2026, 9, 11, 20, 3);

const config = (env: Record<string, string | undefined>) =>
  ({ get: (k: string) => env[k] }) as unknown as ConfigService;

/** Clima fijo y contador de llamadas, sin red. */
class FakeWeather {
  calls: string[] = [];
  weatherFor(cell: string, slot: number) {
    this.calls.push(`${cell}:${slot}`);
    return Promise.resolve('rain' as const);
  }
}

const make = (
  env: Record<string, string | undefined> = { SPAWN_SALT: SALT },
) => {
  const weather = new FakeWeather();
  return {
    weather,
    service: new SpawnsService(
      config(env),
      weather as unknown as WeatherService,
    ),
  };
};

describe('SpawnsService', () => {
  it('mismo sitio y franja → mismo resultado (dos jugadores ven lo mismo)', async () => {
    const a = await make().service.near(NEIVA.lat, NEIVA.lng, NOW);
    const b = await make().service.near(NEIVA.lat, NEIVA.lng, NOW + 60_000);
    expect(b).toEqual(a);
    expect(a.spawns.length).toBeGreaterThan(0);
    expect(a.expiresAt).toBe('2026-10-11T20:10:00.000Z');
  });

  it('dos puntos cercanos ven los mismos Pokémon en las celdas que comparten', async () => {
    const { service } = make();
    const a = await service.near(NEIVA.lat, NEIVA.lng, NOW);
    const b = await service.near(NEIVA.lat + 0.0005, NEIVA.lng, NOW);
    const shared = a.spawns.filter((s) => b.spawns.some((t) => t.id === s.id));
    expect(shared.length).toBeGreaterThan(0);
    for (const s of shared)
      expect(b.spawns.find((t) => t.id === s.id)).toEqual(s);
  });

  it('otra franja u otra sal → otros spawns', async () => {
    const a = await make().service.near(NEIVA.lat, NEIVA.lng, NOW);
    const later = await make().service.near(
      NEIVA.lat,
      NEIVA.lng,
      NOW + 10 * 60_000,
    );
    const otherSalt = await make({ SPAWN_SALT: SALT + 'x' }).service.near(
      NEIVA.lat,
      NEIVA.lng,
      NOW,
    );
    expect(later.spawns).not.toEqual(a.spawns);
    expect(otherSalt.spawns).not.toEqual(a.spawns);
  });

  it('solo devuelve lo que está a ≤ 200 m y sin datos ocultos (nivel, IVs, shiny…)', async () => {
    const { spawns } = await make().service.near(NEIVA.lat, NEIVA.lng, NOW);
    for (const s of spawns) {
      expect(Object.keys(s).sort()).toEqual(['id', 'lat', 'lng', 'speciesId']);
      const dy = (s.lat - NEIVA.lat) * 111_320;
      const dx =
        (s.lng - NEIVA.lng) * 111_320 * Math.cos((NEIVA.lat * Math.PI) / 180);
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(VIEW_RADIUS_M + 0.5);
    }
  });

  it('el clima se pide por celda de clima y franja, no una vez por celda de spawn', async () => {
    const { service, weather } = make();
    await service.near(NEIVA.lat, NEIVA.lng, NOW);
    expect(new Set(weather.calls)).toEqual(
      new Set([`${weatherCellOf(NEIVA.lat, NEIVA.lng)}:${slotFor(NOW)}`]),
    );
  });

  it('cellSpawns da los datos completos que usará el encuentro (F2)', async () => {
    const { service } = make();
    const full = await service.cellSpawns(
      cellIdFor(NEIVA.lat, NEIVA.lng),
      slotFor(NOW),
    );
    for (const s of full) {
      expect(s.ivs).toBeDefined();
      expect(s.level).toBeGreaterThan(0);
    }
  });

  it('sin SPAWN_SALT o sin dataset → 503 (el resto del servidor sigue)', async () => {
    await expect(
      make({}).service.near(NEIVA.lat, NEIVA.lng, NOW),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      make({ SPAWN_SALT: SALT, DATASET_PATH: 'no-existe.json' }).service.near(
        NEIVA.lat,
        NEIVA.lng,
        NOW,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('WeatherService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('weatherFromWmo traduce los códigos de Open-Meteo', () => {
    expect(weatherFromWmo(0, 5)).toBe('clear');
    expect(weatherFromWmo(3, 5)).toBe('cloudy');
    expect(weatherFromWmo(1, 40)).toBe('windy');
    expect(weatherFromWmo(61, 40)).toBe('rain');
    expect(weatherFromWmo(95, 0)).toBe('rain');
    expect(weatherFromWmo(45, 0)).toBe('fog');
    expect(weatherFromWmo(73, 0)).toBe('snow');
  });

  it('una sola petición por (celda, franja) aunque lleguen muchas a la vez', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ current: { weather_code: 61, wind_speed_10m: 3 } }),
        ),
      );
    const w = new WeatherService();
    const results = await Promise.all(
      [1, 2, 3].map(() => w.weatherFor('29_-753', 100)),
    );
    expect(results).toEqual(['rain', 'rain', 'rain']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0] as string).toContain(
      'latitude=2.950&longitude=-75.250',
    );
  });

  it('si Open-Meteo falla → despejado, y se mantiene toda la franja (no cambia a mitad)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'));
    const w = new WeatherService();
    expect(await w.weatherFor('29_-753', 100)).toBe('clear');
    expect(await w.weatherFor('29_-753', 100)).toBe('clear');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('SpawnsService.defaultMoves (F4-03)', () => {
  it('con el dataset real: 1-4 movimientos, todos soportados por el motor', () => {
    const { service } = make();
    // Pikachu nivel 25 y Ditto (solo aprende Transformación, no soportado → Placaje)
    const pikachu = service.defaultMoves(25, 25);
    expect(pikachu.length).toBeGreaterThanOrEqual(1);
    expect(pikachu.length).toBeLessThanOrEqual(4);
    expect(service.defaultMoves(132, 50)).toEqual([33]);
  });
});
