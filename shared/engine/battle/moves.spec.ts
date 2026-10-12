import { readFileSync } from 'node:fs';
import type { Move } from '../../data/dataset.types.js';
import {
  FALLBACK_MOVE_ID,
  defaultMoves,
  isSupportedMove,
  statChangeChance,
  statChangeTarget,
} from './moves.js';

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

describe('movimientos soportados por el motor v1 (con el dataset real)', () => {
  it('cuenta: todos los de daño con poder + los de estado con stats, estado alterado o curación', () => {
    const supported = moves.filter(isSupportedMove);
    const damaging = moves.filter((m) => m.category !== 'status' && (m.power ?? 0) > 0);
    expect(damaging).toHaveLength(442);
    // 550 del plan menos Aroma Floral y Labrar (no aplican en 1 vs 1, D-029)
    expect(supported).toHaveLength(548);
  });

  it.each([
    ['thunderbolt', true],
    ['swords-dance', true],
    ['thunder-wave', true],
    ['toxic', true],
    ['recover', true],
    ['seismic-toss', false],
    ['reflect', false],
    ['metronome', false],
    ['aromatic-mist', false],
  ])('%s → %s', (name, expected) => {
    expect(isSupportedMove(byName(name))).toBe(expected);
  });

  it('defaultMoves: los 4 últimos soportados hasta su nivel, sin repetir; si no hay, Placaje', () => {
    const learnset = [
      { moveId: 1, level: 1 },
      { moveId: 2, level: 1 },
      { moveId: 3, level: 3 },
      { moveId: 4, level: 7 },
      { moveId: 1, level: 9 },
      { moveId: 5, level: 12 },
      { moveId: 6, level: 40 },
      { moveId: 7, level: 0 },
      { moveId: 8, level: 10 },
    ];
    const ok = (id: number) => id !== 8;
    expect(defaultMoves(learnset, 12, ok)).toEqual([3, 4, 1, 5]);
    expect(defaultMoves(learnset, 5, ok)).toEqual([1, 2, 3]);
    expect(defaultMoves(learnset, 1, () => false)).toEqual([FALLBACK_MOVE_ID]);
    expect(defaultMoves([], 30, ok)).toEqual([FALLBACK_MOVE_ID]);
  });

  it('ninguna de las 1025 especies se queda sin movimientos a nivel 1, 25 y 50', () => {
    const pokedex = JSON.parse(
      readFileSync(new URL('../../../src/assets/data/pokedex.json', import.meta.url), 'utf8'),
    ) as { learnset: { moveId: number; level: number }[] }[];
    const ok = new Set(moves.filter(isSupportedMove).map((m) => m.id));
    for (const s of pokedex) {
      for (const level of [1, 25, 50]) {
        const picked = defaultMoves(s.learnset, level, (id) => ok.has(id));
        expect(picked.length).toBeGreaterThanOrEqual(1);
        expect(picked.length).toBeLessThanOrEqual(4);
      }
    }
  });
});
