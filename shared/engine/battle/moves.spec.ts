import { readFileSync } from 'node:fs';
import type { Move } from '../../data/dataset.types.js';
import { statChangeChance, statChangeTarget } from './moves.js';

const moves = JSON.parse(
  readFileSync(new URL('../../../src/assets/data/moves.json', import.meta.url), 'utf8'),
) as Move[];
const byName = (name: string): Move => {
  const m = moves.find((x) => x.name === name);
  if (!m) throw new Error(`No está en el dataset: ${name}`);
  return m;
};

describe('a quién afectan los cambios de stats (con el dataset real)', () => {
  it.each([
    // de estado: manda `target`
    ['swords-dance', 'user'],
    ['calm-mind', 'user'],
    ['howl', 'user'],
    ['growl', 'opponent'],
    ['charm', 'opponent'],
    ['string-shot', 'opponent'],
    ['aromatic-mist', 'none'],
    // de daño: manda `meta.category` (el `target` de todos es selected-pokemon)
    ['power-up-punch', 'user'],
    ['close-combat', 'user'],
    ['overheat', 'user'],
    ['flame-charge', 'user'],
    ['psychic', 'opponent'],
    ['crunch', 'opponent'],
    // Gen 9 sin categoría en PokéAPI
    ['lumina-crash', 'opponent'],
    ['syrup-bomb', 'opponent'],
    ['torch-song', 'user'],
    ['armor-cannon', 'user'],
    ['make-it-rain', 'user'],
    // sin cambios de stats
    ['tackle', 'none'],
  ])('%s → %s', (name, expected) => {
    expect(statChangeTarget(byName(name))).toBe(expected);
  });

  it('probabilidad: 0 en PokéAPI = siempre; si no, la suya', () => {
    expect(statChangeChance(byName('swords-dance'))).toBe(100);
    expect(statChangeChance(byName('torch-song'))).toBe(100);
    expect(statChangeChance(byName('psychic'))).toBe(10);
    expect(statChangeChance(byName('tackle'))).toBe(0);
  });

  it('el dataset trae target, flinchChance y metaCategory en los 706 movimientos', () => {
    expect(moves).toHaveLength(706);
    for (const m of moves) {
      expect(typeof m.target).toBe('string');
      expect(m.flinchChance).toBeGreaterThanOrEqual(0);
      expect(m).toHaveProperty('metaCategory');
    }
    expect(byName('bite').flinchChance).toBe(30);
  });
});
