import type { TypeName } from '../data/dataset.types.js';
import type { Stats } from '../engine/battle/stats.js';
import type { BallId } from '../engine/capture.js';

/** Contrato de la colección (F3, `docs/plan/fases/F3-coleccion.md`): `/collection` y `/pokedex`. */

export type CollectionSort = 'caughtAt' | 'cp' | 'speciesId';
export type SortOrder = 'asc' | 'desc';

/** `GET /collection?…` (todo opcional). Por defecto: lo último capturado primero, 30 por página. */
export interface CollectionQuery {
  sort?: CollectionSort;
  order?: SortOrder;
  type?: TypeName;
  shiny?: boolean;
  favorite?: boolean;
  /** `nextCursor` de la página anterior. */
  cursor?: string;
  /** 1-50 (por defecto 30). */
  limit?: number;
}

/** Lo que pinta la rejilla: poco y ligero (sin IVs). */
export interface CollectionItem {
  id: string;
  speciesId: number;
  nickname: string | null;
  level: number;
  cp: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  favorite: boolean;
  caughtAt: string;
}

export interface CollectionPage {
  items: CollectionItem[];
  /** null = no hay más. */
  nextCursor: string | null;
  /** Total con los filtros puestos (para "12 Pokémon"). */
  total: number;
}

/** `GET /collection/:id`: la ficha completa. Los IVs SÍ salen: es SU Pokémon (D-052). */
export interface CollectionDetail extends CollectionItem {
  ivs: Stats;
  nature: string;
  /** Stats reales del individuo (`calcStats`, D-007). */
  stats: Stats;
  heightScale: number;
  moves: number[];
  ball: BallId;
  caughtLat: number;
  caughtLng: number;
  /** Caramelos de su familia (para F3-05). */
  candy: { familyId: number; qty: number };
}

/** `PATCH /collection/:id`. Mote null = quitarlo (se ve el nombre de la especie). */
export interface CollectionPatch {
  nickname?: string | null;
  favorite?: boolean;
}

/** `DELETE /collection/:id` (transferir). */
export interface TransferResult {
  candy: { familyId: number; qty: number; gained: number };
}

/** `GET /pokedex`: solo las especies que el jugador ha visto (el resto, ni vista ni capturada). */
export interface PokedexView {
  entries: { speciesId: number; seen: true; caught: boolean }[];
}
