/**
 * Contratos del CRUD del curso que la app usa con la UI del juego (F3-06c): `/favorites` y `/customPokemon`. Son los
 * de JSON Server (D-019); NO cambian (Postman los prueba). Las fechas las pone el servidor.
 */

/** Valoración de un favorito: 1-5 (CHECK `rating_range`). */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export interface Favorite {
  id: number;
  /** Nº de Pokédex de la especie (uno por especie y jugador: 409 si se repite). */
  pokemonId: number;
  pokemonName: string;
  note: string;
  rating: number;
  createdAt: string;
}

export type FavoriteInput = Pick<Favorite, 'pokemonId' | 'pokemonName' | 'rating'> & {
  note?: string;
};

/** Las cuatro stats del formato de JSON Server (1-255). */
export interface CustomStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CustomPokemon {
  id: number;
  name: string;
  /** 1-2 tipos (claves en inglés: `fire`, `water`…). */
  types: string[];
  stats: CustomStats;
  imageUrl: string;
  description: string;
  createdAt: string;
}

export type CustomPokemonInput = Pick<CustomPokemon, 'name' | 'types' | 'stats'> & {
  imageUrl?: string;
  description?: string;
};
