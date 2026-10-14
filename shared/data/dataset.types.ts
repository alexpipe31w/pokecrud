// Tipos del dataset generado por scripts/build-dataset.mjs (src/assets/data/*.json).
// Los usan la app y el servidor. Mantener en sincronía con el script.

export type TypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface EvolutionLink {
  /** Especie a la que evoluciona. */
  to: number;
  trigger: string; // 'level-up' | 'use-item' | 'trade' | ...
  minLevel: number | null;
  item: string | null;
}

export interface Species {
  id: number;
  name: string; // slug de PokéAPI: 'mr-mime'
  names: { es: string; en: string };
  genus: string; // ES con fallback EN: 'Pokémon Ratón'
  flavor: string; // ES con fallback EN, sin saltos raros
  types: TypeName[]; // 1 o 2, en orden de slot
  baseStats: BaseStats;
  captureRate: number; // 3..255
  baseExp: number; // puede ser 0 si PokéAPI trae null
  genderRate: number; // -1 sin género, 0..8 (octavos de hembra)
  height: number; // decímetros
  weight: number; // hectogramos
  generation: number; // 1..9
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  habitat: string | null;
  color: string;
  shape: string | null;
  growthRate: string;
  evolutionChainId: number;
  evolvesFrom: number | null;
  evolvesTo: EvolutionLink[];
  /** Movimientos por nivel del version-group más reciente que tenga la especie. */
  learnset: { moveId: number; level: number }[];
}

export interface Move {
  id: number;
  name: string;
  names: { es: string; en: string };
  type: TypeName;
  category: 'physical' | 'special' | 'status';
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  /** Estado que puede causar y su probabilidad (0 = no aplica). */
  ailment: string | null;
  ailmentChance: number;
  statChanges: { stat: string; change: number }[];
  statChance: number;
  critRate: number;
  drain: number;
  healing: number;
  minHits: number | null;
  maxHits: number | null;
  /** A quién afecta (PokéAPI `target`): `user`, `selected-pokemon`, `all-opponents`… (F4-02). */
  target: string;
  /** Probabilidad (0-100) de que el rival retroceda (F4-02). */
  flinchChance: number;
  /** PokéAPI `meta.category`: `damage`, `damage+raise` (stats del usuario), `damage+lower` (del rival), `net-good-stats`… */
  metaCategory: string | null;
}

export interface TypeInfo {
  name: TypeName;
  nameEs: string;
  /** Multiplicador cuando ESTE tipo ataca a cada tipo defensor (solo las entradas != 1). */
  attack: Partial<Record<TypeName, 0 | 0.5 | 2>>;
}

export interface DatasetMeta {
  generatedAt: string;
  speciesCount: number;
  movesCount: number;
  source: 'https://pokeapi.co/api/v2';
  /** Hash corto del contenido; la app lo usa para invalidar su caché de IndexedDB. */
  version: string;
}
