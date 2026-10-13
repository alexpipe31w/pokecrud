import type { TypeName } from '../data/dataset.types.js';
import { TYPE_NAMES, type TypeChart, effectiveness } from './battle/type-chart.js';

/** Cómo le afecta cada tipo atacante a una especie (ficha de la Pokédex, F3-04). Los ×1 no se listan. */
export interface DefenseProfile {
  x4: TypeName[];
  x2: TypeName[];
  x05: TypeName[];
  x025: TypeName[];
  x0: TypeName[];
}

export function defenseProfile(types: readonly TypeName[], chart: TypeChart): DefenseProfile {
  const p: DefenseProfile = { x4: [], x2: [], x05: [], x025: [], x0: [] };
  for (const atk of TYPE_NAMES) {
    const m = effectiveness(chart, atk, types);
    if (m === 4) p.x4.push(atk);
    else if (m === 2) p.x2.push(atk);
    else if (m === 0.5) p.x05.push(atk);
    else if (m === 0.25) p.x025.push(atk);
    else if (m === 0) p.x0.push(atk);
  }
  return p;
}
