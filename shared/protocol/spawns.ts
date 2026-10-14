import type { Weather } from '../engine/spawns.js';

/** Lo que ve el cliente en el mapa. Nivel, IVs, naturaleza, sexo y shiny NO salen hasta el encuentro (F2, D-025). */
export interface VisibleSpawn {
  id: string;
  speciesId: number;
  lat: number;
  lng: number;
}

/** Respuesta de `GET /spawns?lat&lng` (contrato app↔servidor, ARQUITECTURA §2). */
export interface NearbySpawns {
  slot: number;
  /** Fin de la franja (ISO): el cliente vuelve a pedir a partir de aquí. */
  expiresAt: string;
  /** Clima y noche de la celda de clima del jugador en esta franja (los mismos que deciden los spawns). */
  weather: Weather;
  night: boolean;
  spawns: VisibleSpawn[];
}
