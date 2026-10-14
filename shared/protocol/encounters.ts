import type { BallId, BerryId, ThrowQuality } from '../engine/capture.js';
import type { ItemId } from '../engine/items.js';

/**
 * Respuesta de `GET /encounters/:id` (F2-06, contrato app↔servidor, ARQUITECTURA §2). `:id` es el id del spawn de
 * `GET /spawns`. Errores (D-028): 404 no existe, 410 su franja acabó, 403 el jugador está lejos, 409 ya resuelto.
 */
export interface EncounterView {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  heightScale: number;
  /** PC del individuo (D-049): lo calcula el servidor con sus IVs y naturaleza, que no salen de él. */
  cp: number;
  expiresAt: string;
  /** Si este jugador ya lo resolvió. */
  status: 'open' | 'caught' | 'fled';
}

/** La mochila entera (`GET /bag` y tras cada lanzamiento). */
export interface BagView {
  items: { item: ItemId; qty: number }[];
}

/** Cuerpo de `POST /encounters/:id/throw` (F2-05). */
export interface ThrowRequest {
  ball: BallId;
  /** Baya usada en ESTE lanzamiento (se gasta aunque falle), o null/ausente. */
  berry?: BerryId | null;
  /** Lo que dice el cliente; el servidor puede rebajar un "excellent" inverosímil (D-028). */
  throwQuality: ThrowQuality;
  curve: boolean;
  /** Id de ESTE lanzamiento: si se reintenta por la red, el mismo (no gasta otra bola). */
  clientThrowId: string;
}

/** El Pokémon capturado (para la pantalla de "¡Capturado!", F2-07). Sin IVs. */
export interface CaughtView {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  nature: string;
  heightScale: number;
  moves: number[];
}

/** Respuesta de `POST /encounters/:id/throw`. */
export interface ThrowResult {
  clientThrowId: string;
  captured: boolean;
  /** Sacudidas que se ven (0-3; 3 también si se captura). */
  shakes: number;
  fled: boolean;
  /** Calidad con la que contó el servidor (puede ser menor que la pedida). */
  throwQuality: ThrowQuality;
  xpGained: number;
  caught: CaughtView | null;
  /** Caramelos ganados al capturar (F3-02a, D-052); null si no capturó. */
  candy: { familyId: number; gained: number; total: number } | null;
  bag: BagView;
}
