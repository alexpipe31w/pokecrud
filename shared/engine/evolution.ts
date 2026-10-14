import type { Species } from '../data/dataset.types.js';

type Dex = ReadonlyMap<
  number,
  Pick<Species, 'id' | 'evolvesFrom' | 'evolvesTo' | 'evolutionChainId'>
>;

export interface EvolutionOption {
  to: number;
  cost: number;
}

/** Caramelos de cada evolución (D-053): cadena de una evolución 50; de dos, 25 la primera y 100 la segunda. */
export const EVOLVE_COST_SINGLE = 50;
export const EVOLVE_COST_FIRST = 25;
export const EVOLVE_COST_SECOND = 100;

const MAX_HOPS = 10;

/** Etapa de una especie: saltos de `evolvesFrom` hasta la base (0 = base). */
const stageOf = (dex: Dex, id: number): number => {
  let n = 0;
  for (let cur = dex.get(id)?.evolvesFrom; cur != null && n < MAX_HOPS; cur = dex.get(cur)?.evolvesFrom) n++;
  return n;
};

const depthCache = new WeakMap<Dex, Map<number, number>>();

/** Etapa máxima de una cadena (0 = no evoluciona). Se calcula una vez por mapa. */
function chainDepth(dex: Dex, chainId: number): number {
  let cache = depthCache.get(dex);
  if (!cache) {
    cache = new Map();
    for (const s of dex.values())
      cache.set(s.evolutionChainId, Math.max(cache.get(s.evolutionChainId) ?? 0, stageOf(dex, s.id)));
    depthCache.set(dex, cache);
  }
  return cache.get(chainId) ?? 0;
}

/** Evoluciones posibles de `from` y su coste en caramelos de la familia (D-053). */
export function evolutionOptions(dex: Dex, from: number): EvolutionOption[] {
  const s = dex.get(from);
  if (!s) return [];
  const cost =
    chainDepth(dex, s.evolutionChainId) <= 1
      ? EVOLVE_COST_SINGLE
      : stageOf(dex, from) === 0
        ? EVOLVE_COST_FIRST
        : EVOLVE_COST_SECOND;
  return s.evolvesTo.filter((l) => dex.has(l.to)).map((l) => ({ to: l.to, cost }));
}
