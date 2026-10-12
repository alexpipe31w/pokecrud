import { distanceM, type LatLng } from '@shared/engine/geo';
import type { VisibleSpawn } from '@shared/protocol/spawns';

/** Máximo de Pokémon dibujados a la vez: lo medido en el spike (D-035). */
export const MAX_DRAWN = 30;

/** Qué spawns entran y cuáles salen respecto a los que ya hay en la escena (los que siguen no se tocan). */
export function diffSpawns(
  current: ReadonlySet<string>,
  next: readonly VisibleSpawn[],
): { added: VisibleSpawn[]; removed: string[] } {
  const nextIds = new Set(next.map((x) => x.id));
  return {
    added: next.filter((x) => !current.has(x.id)),
    removed: [...current].filter((id) => !nextIds.has(id)),
  };
}

/** Los `n` spawns más cercanos a `origin`, del más cercano al más lejano. */
export function nearestN(list: readonly VisibleSpawn[], origin: LatLng, n = MAX_DRAWN): VisibleSpawn[] {
  return list
    .map((x) => ({ x, d: distanceM(origin, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((e) => e.x);
}
