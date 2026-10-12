import { readFileSync } from 'node:fs';
import type { TypeInfo, TypeName } from '../../data/dataset.types.js';
import { TYPE_NAMES, buildTypeChart, effectiveness } from './type-chart.js';

const types = JSON.parse(
  readFileSync(new URL('../../../src/assets/data/types.json', import.meta.url), 'utf8'),
) as TypeInfo[];
const chart = buildTypeChart(types);

/**
 * Tabla oficial (Gen VI en adelante), escrita a mano a partir de Bulbapedia: atacante → defensor, solo lo que no es ×1.
 * 0 = no afecta, 0.5 = poco eficaz, 2 = súper eficaz.
 */
const OFFICIAL: Record<TypeName, Partial<Record<TypeName, 0 | 0.5 | 2>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

describe('tabla de tipos', () => {
  it('las 324 casillas de types.json coinciden con la tabla oficial', () => {
    let cells = 0;
    for (const atk of TYPE_NAMES) {
      for (const def of TYPE_NAMES) {
        expect(`${atk}→${def}: ${chart[atk][def]}`).toBe(
          `${atk}→${def}: ${OFFICIAL[atk][def] ?? 1}`,
        );
        cells++;
      }
    }
    expect(cells).toBe(324);
  });

  it('8 inmunidades exactas', () => {
    const zeros = TYPE_NAMES.flatMap((a) =>
      TYPE_NAMES.filter((d) => chart[a][d] === 0).map((d) => `${a}→${d}`),
    );
    expect(zeros.sort()).toEqual(
      [
        'normal→ghost',
        'fighting→ghost',
        'electric→ground',
        'ground→flying',
        'psychic→dark',
        'ghost→normal',
        'poison→steel',
        'dragon→fairy',
      ].sort(),
    );
  });

  it('doble tipo: multiplica (×4, ×0,25, inmune gana)', () => {
    expect(effectiveness(chart, 'ice', ['dragon', 'flying'])).toBe(4); // Dragonite
    expect(effectiveness(chart, 'ground', ['electric', 'flying'])).toBe(0); // Zapdos
    expect(effectiveness(chart, 'fire', ['water', 'dragon'])).toBe(0.25); // Kingdra
    expect(effectiveness(chart, 'electric', ['water', 'flying'])).toBe(4); // Gyarados
    expect(effectiveness(chart, 'fighting', ['normal'])).toBe(2);
    expect(effectiveness(chart, 'normal', ['normal'])).toBe(1);
  });

  it('falta un tipo en el dataset → error claro', () => {
    expect(() => buildTypeChart(types.filter((t) => t.name !== 'fairy'))).toThrow('fairy');
  });
});
