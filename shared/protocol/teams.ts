/**
 * Contrato de `/teams` (F0-08, contrato de JSON Server del curso) con los Pokémon CAPTURADOS de F3-06b (D-054).
 * `pokemonIds` (nº de Pokédex) sigue por el contrato del curso (Postman); el juego usa `caughtIds`.
 */

/** Como mucho 6 Pokémon por equipo (CHECK `max_six` y `max_six_caught` en la base). */
export const TEAM_MAX = 6;

export interface Team {
  id: number;
  name: string;
  description: string;
  pokemonIds: number[];
  /** Ids de `CaughtPokemon` del jugador, en orden. Transferir uno lo quita de sus equipos. */
  caughtIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** `POST /teams` (y `PATCH` con lo que cambie). Sin `caughtIds`, `PUT` conserva los que hubiera. */
export interface TeamInput {
  name: string;
  description?: string;
  pokemonIds: number[];
  caughtIds?: string[];
}
