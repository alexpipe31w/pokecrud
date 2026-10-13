import type { EvolutionLink, Species } from '../data/dataset.types.js';

export interface EvolutionNode {
  id: number;
  next: { node: EvolutionNode; link: EvolutionLink }[];
}

type Dex = ReadonlyMap<number, Pick<Species, 'id' | 'evolvesFrom' | 'evolvesTo'>>;
/** Ninguna cadena del dataset pasa de 3 etapas; así un dato roto (un ciclo) no cuelga. */
const MAX_DEPTH = 10;

/** Árbol de la cadena evolutiva de `id`, desde la especie base (ficha de la Pokédex, F3-04). */
export function evolutionTree(species: Dex, id: number): EvolutionNode {
  let base = id;
  for (let i = 0; i < MAX_DEPTH; i++) {
    const from = species.get(base)?.evolvesFrom;
    if (from == null || !species.has(from)) break;
    base = from;
  }
  const build = (sid: number, depth: number): EvolutionNode => ({
    id: sid,
    next:
      depth >= MAX_DEPTH
        ? []
        : (species.get(sid)?.evolvesTo ?? [])
            .filter((l) => species.has(l.to))
            .map((link) => ({ link, node: build(link.to, depth + 1) })),
  });
  return build(base, 0);
}

const ITEMS_ES: Record<string, string> = {
  'fire-stone': 'Piedra Fuego',
  'water-stone': 'Piedra Agua',
  'thunder-stone': 'Piedra Trueno',
  'leaf-stone': 'Piedra Hoja',
  'moon-stone': 'Piedra Lunar',
  'sun-stone': 'Piedra Solar',
  'shiny-stone': 'Piedra Día',
  'dusk-stone': 'Piedra Noche',
  'dawn-stone': 'Piedra Alba',
  'ice-stone': 'Piedra Hielo',
};

/** Cómo evoluciona en los juegos principales (informativo: aquí se evoluciona con caramelos, F3-05). */
export function methodText(link: EvolutionLink): string {
  if (link.trigger === 'level-up')
    return link.minLevel ? `Nivel ${link.minLevel}` : 'Subir de nivel';
  if (link.trigger === 'use-item') return (link.item && ITEMS_ES[link.item]) ?? 'Objeto evolutivo';
  if (link.trigger === 'trade') return 'Intercambio';
  return 'Condición especial';
}
