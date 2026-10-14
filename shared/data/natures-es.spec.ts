import { NATURES } from '../engine/spawns.js';
import { NATURE_NAMES_ES, natureNameEs } from './natures-es.js';

describe('NATURE_NAMES_ES', () => {
  it('tiene las 25 naturalezas de los spawns, sin repetir nombre', () => {
    expect(Object.keys(NATURE_NAMES_ES).sort()).toEqual([...NATURES].sort());
    expect(new Set(Object.values(NATURE_NAMES_ES)).size).toBe(25);
  });

  it('nombres de PokéAPI en español', () => {
    expect(natureNameEs('adamant')).toBe('Firme');
    expect(natureNameEs('jolly')).toBe('Alegre');
  });

  it('una desconocida sale tal cual', () => {
    expect(natureNameEs('nueva')).toBe('nueva');
  });
});
