import { readFileSync } from 'node:fs';
import type { Species } from '../data/dataset.types.js';
import { evolutionOptions } from './evolution.js';

const species = new Map(
  (
    JSON.parse(
      readFileSync(new URL('../../src/assets/data/pokedex.json', import.meta.url), 'utf8'),
    ) as Species[]
  ).map((s) => [s.id, s]),
);
const opts = (id: number) => evolutionOptions(species, id).map((o) => [o.to, o.cost]);

describe('evolutionOptions', () => {
  it('cadena de dos evoluciones: 25 la primera, 100 la segunda', () => {
    expect(opts(1)).toEqual([[2, 25]]);
    expect(opts(2)).toEqual([[3, 100]]);
    expect(opts(172)).toEqual([[25, 25]]);
    expect(opts(25)).toEqual([[26, 100]]);
  });

  it('una sola evolución: 50 (también las 8 ramas de Eevee)', () => {
    expect(opts(19)).toEqual([[20, 50]]);
    expect(opts(129)).toEqual([[130, 50]]);
    expect(opts(133)).toHaveLength(8);
    expect(opts(133).every(([, c]) => c === 50)).toBe(true);
  });

  it('ramas en una cadena de dos (Wurmple): las dos a 25', () => {
    expect(opts(265)).toEqual([
      [266, 25],
      [268, 25],
    ]);
  });

  it('sin evolución, última etapa o especie desconocida: ninguna opción', () => {
    expect(opts(128)).toEqual([]);
    expect(opts(3)).toEqual([]);
    expect(opts(99999)).toEqual([]);
  });

  it('un dato roto (ciclo) no cuelga', () => {
    const loop = new Map([
      [1, { id: 1, evolvesFrom: 2, evolvesTo: [{ to: 2 }], evolutionChainId: 9 }],
      [2, { id: 2, evolvesFrom: 1, evolvesTo: [{ to: 1 }], evolutionChainId: 9 }],
    ]) as unknown as Parameters<typeof evolutionOptions>[0];
    expect(() => evolutionOptions(loop, 1)).not.toThrow();
  });
});
