import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Move,
  Species,
  TypeName,
} from '../../../shared/data/dataset.types.js';
import { familyOf } from '../../../shared/engine/candy.js';
import {
  defaultMoves,
  isSupportedMove,
} from '../../../shared/engine/battle/moves.js';
import {
  type SpawnSpecies,
  type SpawnTable,
  type Weather,
  type WildSpawn,
  buildSpawnTable,
  cellBounds,
  cellsWithin,
  isNightAt,
  parseSpawnId,
  slotEndsAt,
  slotFor,
  spawnsForCell,
} from '../../../shared/engine/spawns.js';
import type { NearbySpawns } from '../../../shared/protocol/spawns.js';
import { WeatherService, weatherCellOf } from './weather.service.js';

/** Radio en el que el jugador ve Pokémon (ROADMAP F1-06: celdas a ≤ 200 m). */
export const VIEW_RADIUS_M = 200;
/** Versión del algoritmo en la semilla: si cambia `spawnsForCell`, se sube y no se mezclan spawns viejos (D-025). */
const SEED_VERSION = 'v1';
const M_PER_DEG_LAT = 111_320;

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** Lo que necesitan el encuentro y la captura de cada especie (F2-06). */
export interface SpeciesDetails {
  id: number;
  /** Para el PC del encuentro (D-049). */
  baseStats: Species['baseStats'];
  captureRate: number;
  speed: number;
  isLegendary: boolean;
  isMythical: boolean;
  learnset: { moveId: number; level: number }[];
  /** Familia de caramelos = cadena evolutiva (F3-02a, D-052). */
  familyId: number;
  types: TypeName[];
}

/**
 * Spawns deterministas (F1-06, D-025). Nada se guarda: para (celda, franja) la semilla es
 * HMAC-SHA256(SPAWN_SALT, versión:celda:franja) y `spawnsForCell` (shared/) hace el resto. Sin `SPAWN_SALT` o sin
 * dataset, `/spawns` responde 503 y el resto del servidor sigue funcionando.
 */
@Injectable()
export class SpawnsService {
  private readonly logger = new Logger(SpawnsService.name);
  private readonly salt: string | undefined;
  private species: SpawnSpecies[] | null = null;
  private readonly details = new Map<number, SpeciesDetails>();
  /** Especies de cada tipo, para filtrar la colección por tipo (F3-02a). */
  private readonly byType = new Map<TypeName, number[]>();
  /** Movimientos que el motor de combate v1 sabe ejecutar (F4-03): solo esos se asignan al capturar. */
  private readonly supportedMoves = new Set<number>();
  private readonly tables = new Map<string, SpawnTable>();

  constructor(
    config: ConfigService,
    private readonly weather: WeatherService,
  ) {
    this.salt = config.get<string>('SPAWN_SALT') || undefined;
    if (!this.salt) {
      this.logger.error(
        'SPAWN_SALT no está definida: /spawns responderá 503 (ver server/.env.example)',
      );
    }
    const datasetPath = resolve(
      config.get<string>('DATASET_PATH') ??
        resolve(process.cwd(), '../src/assets/data/pokedex.json'),
    );
    try {
      const all = JSON.parse(readFileSync(datasetPath, 'utf8')) as Species[];
      // Solo lo que usa el sorteo: no se guardan en memoria los learnsets ni los textos.
      this.species = all.map((s) => ({
        id: s.id,
        types: s.types,
        captureRate: s.captureRate,
        baseExp: s.baseExp,
        genderRate: s.genderRate,
        isLegendary: s.isLegendary,
        isMythical: s.isMythical,
        isBaby: s.isBaby,
      }));
      for (const s of all) {
        this.details.set(s.id, {
          id: s.id,
          baseStats: s.baseStats,
          captureRate: s.captureRate,
          speed: s.baseStats.spe,
          isLegendary: s.isLegendary,
          isMythical: s.isMythical,
          learnset: s.learnset,
          familyId: familyOf(s),
          types: s.types,
        });
        for (const t of s.types) {
          const ids = this.byType.get(t) ?? [];
          ids.push(s.id);
          this.byType.set(t, ids);
        }
      }
      const moves = JSON.parse(
        readFileSync(resolve(dirname(datasetPath), 'moves.json'), 'utf8'),
      ) as Move[];
      for (const m of moves)
        if (isSupportedMove(m)) this.supportedMoves.add(m.id);
    } catch (err) {
      this.logger.error({
        msg: 'spawns.dataset_unavailable',
        datasetPath,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Pokémon visibles a ≤ VIEW_RADIUS_M del punto en la franja actual. */
  async near(
    lat: number,
    lng: number,
    now = Date.now(),
  ): Promise<NearbySpawns> {
    const slot = slotFor(now);
    const cells = cellsWithin(lat, lng, VIEW_RADIUS_M);
    const all = (
      await Promise.all(cells.map((cellId) => this.cellSpawns(cellId, slot)))
    ).flat();

    const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
    const visible = all.filter((s) => {
      const dy = (s.lat - lat) * M_PER_DEG_LAT;
      const dx = (s.lng - lng) * mPerDegLng;
      return dx * dx + dy * dy <= VIEW_RADIUS_M * VIEW_RADIUS_M;
    });
    // Para el HUD: el clima ya está en caché por celda de clima y franja (D-025), no añade peticiones a Open-Meteo.
    const weather = await this.weather.weatherFor(
      weatherCellOf(lat, lng),
      slot,
    );
    return {
      slot,
      expiresAt: new Date(slotEndsAt(slot)).toISOString(),
      weather,
      night: isNightAt(slotEndsAt(slot - 1), lng),
      spawns: visible.map((s) => ({
        id: s.id,
        speciesId: s.speciesId,
        lat: round6(s.lat),
        lng: round6(s.lng),
      })),
    };
  }

  /**
   * Todos los datos de los Pokémon de una celda (incluidos los ocultos al cliente). Lo usarán el encuentro y la
   * captura (F2) para recalcular un spawn a partir de su id sin haberlo guardado.
   */
  async cellSpawns(cellId: string, slot: number): Promise<WildSpawn[]> {
    if (!this.salt || !this.species) {
      throw new ServiceUnavailableException(
        'Los Pokémon salvajes no están disponibles ahora mismo',
      );
    }
    const b = cellBounds(cellId);
    const centerLat = (b.south + b.north) / 2;
    const centerLng = (b.west + b.east) / 2;
    // Clima y noche dependen de la CELDA y la franja, nunca de dónde está el jugador: así todos ven lo mismo.
    const weather = await this.weather.weatherFor(
      weatherCellOf(centerLat, centerLng),
      slot,
    );
    const night = isNightAt(slotEndsAt(slot - 1), centerLng);
    return spawnsForCell(
      cellId,
      slot,
      this.seed(cellId, slot),
      this.table(weather, night),
    );
  }

  /**
   * Recalcula un spawn a partir de su id (`celda:franja:índice`) sin haberlo guardado. `null` si el id no tiene
   * forma de spawn o esa celda no tiene ese índice. No comprueba si la franja sigue viva: eso lo decide quien llama.
   */
  async spawnById(id: string): Promise<WildSpawn | null> {
    const parsed = parseSpawnId(id);
    if (!parsed) return null;
    const spawns = await this.cellSpawns(parsed.cellId, parsed.slot);
    return spawns.find((s) => s.index === parsed.index) ?? null;
  }

  /** Los 4 movimientos con los que llega un Pokémon de esta especie y nivel (los últimos soportados; D-030). */
  defaultMoves(speciesId: number, level: number): number[] {
    return defaultMoves(
      this.details.get(speciesId)?.learnset ?? [],
      level,
      (id) => this.supportedMoves.has(id),
    );
  }

  speciesDetails(speciesId: number): SpeciesDetails | undefined {
    return this.details.get(speciesId);
  }

  /** Ids de las especies de un tipo (cualquiera de sus dos tipos). */
  speciesIdsOfType(type: TypeName): number[] {
    return this.byType.get(type) ?? [];
  }

  /** Tamaño individual XS-XL (0,5-1,5 de la altura de la especie), fijo para cada spawn y secreto como la semilla. */
  heightScale(spawnId: string): number {
    if (!this.salt) {
      throw new ServiceUnavailableException(
        'Los Pokémon salvajes no están disponibles ahora mismo',
      );
    }
    const n = createHmac('sha256', this.salt)
      .update(`${SEED_VERSION}:size:${spawnId}`)
      .digest()
      .readUInt32BE(0);
    return Math.round((0.5 + n / 2 ** 32) * 100) / 100;
  }

  private seed(cellId: string, slot: number): number {
    return createHmac('sha256', this.salt as string)
      .update(`${SEED_VERSION}:${cellId}:${slot}`)
      .digest()
      .readUInt32BE(0);
  }

  private table(weather: Weather, night: boolean): SpawnTable {
    const key = `${weather}:${night}`;
    let table = this.tables.get(key);
    if (!table) {
      table = buildSpawnTable(this.species as SpawnSpecies[], weather, night);
      this.tables.set(key, table);
    }
    return table;
  }
}
