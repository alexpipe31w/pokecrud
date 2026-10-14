import { readFileSync } from 'node:fs';
import type { Species } from '../data/dataset.types.js';
import { type EvolutionNode, evolutionTree, methodText } from './evolution-chain.js';

const species = new Map(
  (
    JSON.parse(
      readFileSync(new URL('../../src/assets/data/pokedex.json', import.meta.url), 'utf8'),
    ) as Species[]
  ).map((s) => [s.id, s]),
);
const ids = (n: EvolutionNode): unknown => [n.id, n.next.map((e) => ids(e.node))];

describe('evolutionTree', () => {
  it('desde cualquier miembro sale la cadena entera desde la base: Raichu → Pichu → Pikachu → Raichu', () => {
    expect(ids(evolutionTree(species, 26))).toEqual([172, [[25, [[26, []]]]]]);
  });

  it('ramas: Eevee tiene 8 evoluciones', () => {
    expect(evolutionTree(species, 133).next).toHaveLength(8);
  });

  it('sin evolución: un solo nodo', () => {
    expect(ids(evolutionTree(species, 128))).toEqual([128, []]);
  });

  it('un dato roto (ciclo) no cuelga', () => {
    const loop = new Map([
      [
        1,
        {
          id: 1,
          evolvesFrom: 2,
          evolvesTo: [{ to: 2, trigger: 'level-up', minLevel: 1, item: null }],
        },
      ],
      [
        2,
        {
          id: 2,
          evolvesFrom: 1,
          evolvesTo: [{ to: 1, trigger: 'level-up', minLevel: 1, item: null }],
        },
      ],
    ]);
    expect(() => evolutionTree(loop, 1)).not.toThrow();
  });
});

describe('methodText', () => {
  it('método en español', () => {
    expect(methodText({ to: 2, trigger: 'level-up', minLevel: 16, item: null })).toBe('Nivel 16');
    expect(methodText({ to: 26, trigger: 'use-item', minLevel: null, item: 'thunder-stone' })).toBe(
      'Piedra Trueno',
    );
    expect(methodText({ to: 65, trigger: 'trade', minLevel: null, item: null })).toBe(
      'Intercambio',
    );
    expect(methodText({ to: 0, trigger: 'spin', minLevel: null, item: null })).toBe(
      'Condición especial',
    );
    expect(methodText({ to: 25, trigger: 'level-up', minLevel: null, item: null })).toBe(
      'Subir de nivel',
    );
  });
});
