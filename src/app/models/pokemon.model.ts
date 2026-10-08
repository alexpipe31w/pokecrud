/** Estadísticas base de un Pokémon (vienen de PokéAPI). */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/**
 * Pokémon guardado en el backend propio (`/pokemon`).
 * El `id` es el número de la Pokédex (1–151) y también el id de JSON Server.
 * `price` y `stock` no existen en PokéAPI: son datos propios de la app.
 */
export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  abilities: string[];
  imageUrl: string;
  /** Altura en metros. */
  height: number;
  /** Peso en kilogramos. */
  weight: number;
  baseExperience: number;
  stats: PokemonStats;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

/** Datos de un Pokémon antes de guardarlo (sin fechas). */
export type PokemonDraft = Omit<Pokemon, 'createdAt' | 'updatedAt'>;

/** Referencia mínima usada por el buscador (id + nombre). */
export interface PokemonRef {
  id: number;
  name: string;
}
