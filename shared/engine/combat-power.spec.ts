import { calcStats } from './battle/stats.js';
import { MIN_CP, combatPower } from './combat-power.js';
import type { Ivs } from './spawns.js';

const PIKACHU = { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 };
const ivs = (n: number): Ivs => ({
  hp: n,
  attack: n,
  defense: n,
  specialAttack: n,
  specialDefense: n,
  speed: n,
});

describe('combatPower (PC, D-049)', () => {
  it('caso a mano: A = 7/8·120 + 1/8·80 = 115, D = 5/8·100 + 3/8·60 = 85 → 115·√85·√100/10 = 1060', () => {
    expect(
      combatPower({
        hp: 100,
        attack: 80,
        specialAttack: 120,
        defense: 60,
        specialDefense: 100,
        speed: 50,
      }),
    ).toBe(1060);
  });

  it('Pikachu Nv. 12 con IVs 15 y naturaleza neutra: 46 (stats 32/20/16/18/18 calculadas a mano)', () => {
    const s = calcStats(PIKACHU, ivs(15), 12, 'hardy');
    expect(s).toMatchObject({ hp: 32, attack: 20, defense: 16, specialAttack: 18, specialDefense: 18 });
    // A = 7/8·20 + 1/8·18 = 19,75 · D = 5/8·18 + 3/8·16 = 17,25 → 19,75·√17,25·√32/10 = 46,4
    expect(combatPower(s)).toBe(46);
  });

  it(`nunca baja de ${MIN_CP}`, () => {
    expect(
      combatPower({ hp: 12, attack: 6, specialAttack: 6, defense: 6, specialDefense: 6, speed: 6 }),
    ).toBe(MIN_CP);
  });

  it('crece con el nivel y con los IVs', () => {
    const at = (level: number, iv: number) => combatPower(calcStats(PIKACHU, ivs(iv), level, 'hardy'));
    expect(at(30, 15)).toBeGreaterThan(at(12, 15));
    expect(at(30, 31)).toBeGreaterThan(at(30, 0));
  });
});
