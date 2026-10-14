import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatasetMeta, Move, Species, TypeInfo } from './dataset.types.js';

const dir = join(process.cwd(), 'src', 'assets', 'data');
const load = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

describe('dataset generado', () => {
  const pokedex = load<Species[]>('pokedex.json');
  const moves = load<Move[]>('moves.json');
  const types = load<TypeInfo[]>('types.json');
  const meta = load<DatasetMeta>('meta.json');
  const moveIds = new Set(moves.map((m) => m.id));

  it('tiene las 1025 especies en orden y sin huecos', () => {
    expect(pokedex).toHaveLength(1025);
    pokedex.forEach((s, i) => expect(s.id).toBe(i + 1));
    expect(meta.speciesCount).toBe(1025);
  });

  it('cada especie tiene nombre, tipos, stats y captureRate válidos', () => {
    for (const s of pokedex) {
      expect(s.names.es.length).toBeGreaterThan(0);
      expect(s.types.length).toBeGreaterThanOrEqual(1);
      expect(s.types.length).toBeLessThanOrEqual(2);
      expect(Object.keys(s.baseStats).sort()).toEqual(['atk', 'def', 'hp', 'spa', 'spd', 'spe']);
      expect(s.captureRate).toBeGreaterThanOrEqual(3);
      expect(s.captureRate).toBeLessThanOrEqual(255);
      expect(s.flavor.length).toBeGreaterThan(0);
    }
  });

  it('casos conocidos', () => {
    const pikachu = pokedex[24];
    expect(pikachu.name).toBe('pikachu');
    expect(pikachu.types).toEqual(['electric']);
    expect(pikachu.captureRate).toBe(190);
    expect(pikachu.evolvesFrom).toBe(172); // Pichu
    expect(pikachu.evolvesTo.map((e) => e.to)).toContain(26); // Raichu
    expect(pokedex[149].isLegendary).toBe(true); // Mewtwo
    expect(pokedex[150].isMythical).toBe(true); // Mew
  });

  it('todos los movimientos del learnset existen en moves.json', () => {
    for (const s of pokedex) for (const l of s.learnset) expect(moveIds.has(l.moveId)).toBe(true);
    expect(pokedex.filter((s) => s.learnset.length === 0).length).toBeLessThan(10);
  });

  it('la tabla de tipos tiene los 18 tipos y casos conocidos', () => {
    expect(types).toHaveLength(18);
    const by = Object.fromEntries(types.map((t) => [t.name, t]));
    expect(by['water'].attack['fire']).toBe(2);
    expect(by['normal'].attack['ghost']).toBe(0);
    expect(by['fire'].attack['water']).toBe(0.5);
    expect(by['fairy'].attack['dragon']).toBe(2);
  });
});
