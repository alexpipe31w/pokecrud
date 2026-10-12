import type { TypeInfo, TypeName } from '../../data/dataset.types.js';

/**
 * Tabla de tipos 18×18 (F4-02). Se construye desde `types.json` (generado de PokéAPI) y se comprueba en el test contra
 * la tabla oficial escrita a mano: si cualquiera de las dos cambia, el test lo dice.
 */
export const TYPE_NAMES: readonly TypeName[] = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

export type Multiplier = 0 | 0.5 | 1 | 2;
export type TypeChart = Readonly<Record<TypeName, Readonly<Record<TypeName, Multiplier>>>>;

/** Matriz completa (las entradas que no vienen en `types.json` valen 1). Lanza si falta algún tipo. */
export function buildTypeChart(types: readonly TypeInfo[]): TypeChart {
  const byName = new Map(types.map((t) => [t.name, t]));
  const chart = {} as Record<TypeName, Record<TypeName, Multiplier>>;
  for (const atk of TYPE_NAMES) {
    const info = byName.get(atk);
    if (!info) throw new Error(`Falta el tipo ${atk} en types.json`);
    chart[atk] = {} as Record<TypeName, Multiplier>;
    for (const def of TYPE_NAMES) chart[atk][def] = info.attack[def] ?? 1;
  }
  return chart;
}

/** Multiplicador de un ataque de tipo `attack` contra un Pokémon de 1 o 2 tipos: 0, 0,25, 0,5, 1, 2 o 4. */
export function effectiveness(
  chart: TypeChart,
  attack: TypeName,
  defenderTypes: readonly TypeName[],
): number {
  return defenderTypes.reduce((m, def) => m * chart[attack][def], 1);
}
