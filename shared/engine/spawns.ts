import type { Species, TypeName } from '../data/dataset.types.js';
import { createRng } from './rng.js';

/**
 * Spawns deterministas (F1-06, ARQUITECTURA §5): todos los jugadores en el mismo sitio y la misma franja ven los
 * mismos Pokémon sin que el servidor guarde nada. Lógica pura: la semilla de cada celda la calcula el servidor con
 * su secreto (HMAC, D-025), así que el cliente nunca puede predecir spawns aunque tenga este código.
 */

/** Lado de la celda en grados (~78 m de latitud). `cellId = floor(lat/CELL_DEG)_floor(lng/CELL_DEG)`. */
export const CELL_DEG = 0.0007;
export const SLOT_MINUTES = 10;
const SLOT_MS = SLOT_MINUTES * 60_000;
const M_PER_DEG_LAT = 111_320;

export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'windy';

/** Tipos que salen más con cada clima (ARQUITECTURA §5). */
export const WEATHER_BOOSTS: Record<Weather, readonly TypeName[]> = {
  clear: ['fire', 'grass', 'ground'],
  rain: ['water', 'electric', 'bug'],
  windy: ['flying', 'dragon', 'psychic'],
  snow: ['ice', 'steel'],
  fog: ['ghost', 'dark'],
  cloudy: ['fairy', 'fighting', 'poison'],
};
export const NIGHT_TYPES: readonly TypeName[] = ['ghost', 'dark', 'psychic'];
export const WEATHER_FACTOR = 2.5;
export const NIGHT_FACTOR = 2;
const BABY_FACTOR = 0.3;
/** Probabilidad relativa de 0, 1, 2 y 3 Pokémon en una celda (media ≈ 0,54 → ~20 en 200 m a la redonda). */
export const SPAWN_COUNT_WEIGHTS = [60, 28, 10, 2] as const;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 25;
export const SHINY_CHANCE = 1 / 512;

export const NATURES = [
  'hardy',
  'lonely',
  'brave',
  'adamant',
  'naughty',
  'bold',
  'docile',
  'relaxed',
  'impish',
  'lax',
  'timid',
  'hasty',
  'serious',
  'jolly',
  'naive',
  'modest',
  'mild',
  'quiet',
  'bashful',
  'rash',
  'calm',
  'gentle',
  'sassy',
  'careful',
  'quirky',
] as const;
export type Nature = (typeof NATURES)[number];

export interface Ivs {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface WildSpawn {
  /** `${cellId}:${slot}:${index}`: con esto el servidor lo recalcula al encontrarlo (F2), sin guardarlo. */
  id: string;
  cellId: string;
  slot: number;
  index: number;
  speciesId: number;
  lat: number;
  lng: number;
  level: number;
  ivs: Ivs;
  nature: Nature;
  gender: 'M' | 'F' | null;
  shiny: boolean;
}

export interface CellBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

const CELL_ID = /^(-?\d+)_(-?\d+)$/;

export function cellIdFor(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}_${Math.floor(lng / CELL_DEG)}`;
}

/** Índices de la celda, o `null` si el id no tiene el formato `y_x`. */
export function parseCellId(cellId: string): { y: number; x: number } | null {
  const m = CELL_ID.exec(cellId);
  return m ? { y: Number(m[1]), x: Number(m[2]) } : null;
}

export function cellBounds(cellId: string): CellBounds {
  const c = parseCellId(cellId);
  if (!c) throw new Error(`cellId no válido: ${cellId}`);
  return {
    south: c.y * CELL_DEG,
    west: c.x * CELL_DEG,
    north: (c.y + 1) * CELL_DEG,
    east: (c.x + 1) * CELL_DEG,
  };
}

export const slotFor = (epochMs: number): number => Math.floor(epochMs / SLOT_MS);
export const slotEndsAt = (slot: number): number => (slot + 1) * SLOT_MS;

/** Celdas cuyo rectángulo queda a ≤ `radiusM` metros del punto (la del punto siempre incluida). */
export function cellsWithin(lat: number, lng: number, radiusM: number): string[] {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / mPerDegLng;
  const y0 = Math.floor((lat - dLat) / CELL_DEG);
  const y1 = Math.floor((lat + dLat) / CELL_DEG);
  const x0 = Math.floor((lng - dLng) / CELL_DEG);
  const x1 = Math.floor((lng + dLng) / CELL_DEG);
  const cells: string[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Punto del rectángulo más cercano al jugador.
      const nearLat = Math.min(Math.max(lat, y * CELL_DEG), (y + 1) * CELL_DEG);
      const nearLng = Math.min(Math.max(lng, x * CELL_DEG), (x + 1) * CELL_DEG);
      const dy = (nearLat - lat) * M_PER_DEG_LAT;
      const dx = (nearLng - lng) * mPerDegLng;
      if (dx * dx + dy * dy <= radiusM * radiusM) cells.push(`${y}_${x}`);
    }
  }
  return cells;
}

/** Noche por hora solar (UTC + longitud/15): de 18:00 a 6:00. No depende de zonas horarias ni de la red. */
export function isNightAt(epochMs: number, lng: number): boolean {
  const utcHours = (epochMs / 3_600_000) % 24;
  const solar = (((utcHours + lng / 15) % 24) + 24) % 24;
  return solar < 6 || solar >= 18;
}

/** Peso base: más raro cuanto menor `captureRate` y mayor `baseExp`. Legendarios y míticos: 0 (solo eventos). */
export function speciesWeight(
  s: Pick<Species, 'captureRate' | 'baseExp' | 'isLegendary' | 'isMythical' | 'isBaby'>,
): number {
  if (s.isLegendary || s.isMythical) return 0;
  const exp = s.baseExp > 0 ? s.baseExp : 100;
  const w = (s.captureRate / 255) * Math.min(1.5, 100 / exp);
  return s.isBaby ? w * BABY_FACTOR : w;
}

export type SpawnSpecies = Pick<
  Species,
  | 'id'
  | 'types'
  | 'captureRate'
  | 'baseExp'
  | 'genderRate'
  | 'isLegendary'
  | 'isMythical'
  | 'isBaby'
>;

/** Tabla de sorteo para un clima y momento del día. Se construye una vez y se reutiliza. */
export interface SpawnTable {
  ids: number[];
  genderRates: number[];
  cumulative: number[];
  total: number;
}

export function buildSpawnTable(
  species: readonly SpawnSpecies[],
  weather: Weather,
  night: boolean,
): SpawnTable {
  // Orden por id: la tabla (y por tanto los spawns) no depende del orden en que llegue el dataset.
  const sorted = [...species].sort((a, b) => a.id - b.id);
  const boosted = new Set(WEATHER_BOOSTS[weather]);
  const nightTypes = new Set(NIGHT_TYPES);
  const table: SpawnTable = { ids: [], genderRates: [], cumulative: [], total: 0 };
  for (const s of sorted) {
    let w = speciesWeight(s);
    if (w <= 0) continue;
    if (s.types.some((t) => boosted.has(t))) w *= WEATHER_FACTOR;
    if (night && s.types.some((t) => nightTypes.has(t))) w *= NIGHT_FACTOR;
    table.total += w;
    table.ids.push(s.id);
    table.genderRates.push(s.genderRate);
    table.cumulative.push(table.total);
  }
  if (table.ids.length === 0) throw new Error('No hay especies que puedan aparecer');
  return table;
}

/** Índice de la tabla para un número en [0, 1) (búsqueda binaria sobre los pesos acumulados). */
function pick(table: SpawnTable, r: number): number {
  const target = r * table.total;
  let lo = 0;
  let hi = table.cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (table.cumulative[mid] > target) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function spawnCount(r: number): number {
  const total = SPAWN_COUNT_WEIGHTS.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < SPAWN_COUNT_WEIGHTS.length; i++) {
    acc += SPAWN_COUNT_WEIGHTS[i];
    if (r * total < acc) return i;
  }
  return SPAWN_COUNT_WEIGHTS.length - 1;
}

/**
 * Los Pokémon de una celda en una franja. Misma (cellId, slot, seed, tabla) → mismo resultado, siempre.
 * El ORDEN de las tiradas forma parte del contrato: cambiarlo cambia todos los spawns (subir la versión en D-025).
 */
export function spawnsForCell(
  cellId: string,
  slot: number,
  seed: number,
  table: SpawnTable,
): WildSpawn[] {
  const b = cellBounds(cellId);
  const rng = createRng(seed);
  const count = spawnCount(rng.next());
  const spawns: WildSpawn[] = [];
  for (let index = 0; index < count; index++) {
    const t = pick(table, rng.next());
    const lat = b.south + rng.next() * CELL_DEG;
    const lng = b.west + rng.next() * CELL_DEG;
    // Niveles bajos más frecuentes (curva ^1,5).
    const level = MIN_LEVEL + Math.floor(rng.next() ** 1.5 * (MAX_LEVEL - MIN_LEVEL + 1));
    const ivs: Ivs = {
      hp: rng.int(0, 31),
      attack: rng.int(0, 31),
      defense: rng.int(0, 31),
      specialAttack: rng.int(0, 31),
      specialDefense: rng.int(0, 31),
      speed: rng.int(0, 31),
    };
    const nature = rng.pick(NATURES);
    const genderRate = table.genderRates[t];
    const genderRoll = rng.next();
    const gender = genderRate < 0 ? null : genderRoll * 8 < genderRate ? 'F' : 'M';
    const shiny = rng.chance(SHINY_CHANCE);
    spawns.push({
      id: `${cellId}:${slot}:${index}`,
      cellId,
      slot,
      index,
      speciesId: table.ids[t],
      lat,
      lng,
      level,
      ivs,
      nature,
      gender,
      shiny,
    });
  }
  return spawns;
}

/** Descompone un id de spawn (`y_x:slot:index`); `null` si no es válido. */
export function parseSpawnId(id: string): { cellId: string; slot: number; index: number } | null {
  const m = /^(-?\d+_-?\d+):(\d+):(\d)$/.exec(id);
  return m ? { cellId: m[1], slot: Number(m[2]), index: Number(m[3]) } : null;
}
