import type { Species } from '@shared/data/dataset.types';
import { personalityOf } from './personality';

const species = (patch: Partial<Species>): Species =>
  ({
    types: ['normal'],
    baseStats: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    captureRate: 255,
    isLegendary: false,
    isMythical: false,
    shape: 'quadruped',
    ...patch,
  }) as Species;

describe('personalityOf', () => {
  it('agility sale de la velocidad: 20 → 0, 150 → 1', () => {
    expect(
      personalityOf(species({ baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 20 } }))
        .agility,
    ).toBe(0);
    expect(
      personalityOf(species({ baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 150 } }))
        .agility,
    ).toBe(1);
  });

  it('skittish: fácil de capturar 0, legendario casi 1', () => {
    expect(personalityOf(species({ captureRate: 255 })).skittish).toBe(0);
    expect(personalityOf(species({ captureRate: 3, isLegendary: true })).skittish).toBe(1);
  });

  it('los alados flotan 0,6 m, los fantasma 0,3 m y son semitransparentes', () => {
    expect(personalityOf(species({ shape: 'wings' })).hover).toBe(0.6);
    expect(personalityOf(species({ shape: 'bug-wings' })).hover).toBe(0.6);
    const ghost = personalityOf(species({ types: ['ghost', 'poison'], shape: 'ball' }));
    expect(ghost.hover).toBe(0.3);
    expect(ghost.ghostly).toBe(true);
    expect(personalityOf(species({})).hover).toBe(0);
  });

  it('las partículas son del tipo principal', () => {
    expect(personalityOf(species({ types: ['water', 'flying'] })).fx).toBe('water');
  });
});
