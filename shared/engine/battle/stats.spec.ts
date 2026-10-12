import { NATURES } from '../spawns.js';
import {
  NATURE_EFFECTS,
  accuracyStageMultiplier,
  calcStats,
  clampStage,
  stageMultiplier,
} from './stats.js';

const GARCHOMP = { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 };
const IV31 = { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 };
const IV0 = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

describe('stats', () => {
  it('ejemplo de Bulbapedia: Garchomp nv 78, Firme (adamant), con sus IVs y EVs', () => {
    // https://bulbapedia.bulbagarden.net/wiki/Stat#Example → 289 / 278 / 193 / 135 / 171 / 171
    const stats = calcStats(
      GARCHOMP,
      { hp: 24, attack: 12, defense: 30, specialAttack: 16, specialDefense: 23, speed: 5 },
      78,
      'adamant',
      { hp: 74, attack: 190, defense: 91, specialAttack: 48, specialDefense: 84, speed: 23 },
    );
    expect(stats).toEqual({
      hp: 289,
      attack: 278,
      defense: 193,
      specialAttack: 135,
      specialDefense: 171,
      speed: 171,
    });
  });

  it('sin EVs (como en el juego, D-007): Garchomp nv 50, IV 31, Alegre (jolly)', () => {
    // PS = floor(247·50/100)+60 = 183; Atq = floor(291·50/100)+5 = 150; Vel = floor((117+5)·1,1) = 134;
    // AtEsp = floor((95+5)·0,9) = 90
    expect(calcStats(GARCHOMP, IV31, 50, 'jolly')).toEqual({
      hp: 183,
      attack: 150,
      defense: 115,
      specialAttack: 90,
      specialDefense: 105,
      speed: 134,
    });
  });

  it('extremos: nivel 1, IV 0, naturaleza neutra; Shedinja siempre 1 PS', () => {
    expect(calcStats(GARCHOMP, IV0, 1, 'hardy')).toEqual({
      hp: 13,
      attack: 7,
      defense: 6,
      specialAttack: 6,
      specialDefense: 6,
      speed: 7,
    });
    expect(calcStats({ ...GARCHOMP, hp: 1 }, IV31, 100, 'hardy').hp).toBe(1);
  });

  it('25 naturalezas: 5 neutras y 20 que suben una y bajan otra distinta', () => {
    expect(Object.keys(NATURE_EFFECTS).sort()).toEqual([...NATURES].sort());
    const effects = Object.values(NATURE_EFFECTS);
    expect(effects.filter((e) => e === null)).toHaveLength(5);
    for (const e of effects) if (e) expect(e[0]).not.toBe(e[1]);
  });

  it('rechaza nivel o naturaleza imposibles', () => {
    expect(() => calcStats(GARCHOMP, IV31, 0, 'hardy')).toThrow(RangeError);
    expect(() => calcStats(GARCHOMP, IV31, 101, 'hardy')).toThrow(RangeError);
    expect(() => calcStats(GARCHOMP, IV31, 50, 'inventada' as never)).toThrow(RangeError);
  });
});

describe('etapas', () => {
  it('ataque/defensa: ×2/8 … ×8/2, y se topan en ±6', () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(1)).toBe(1.5);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(6)).toBe(4);
    expect(stageMultiplier(-1)).toBeCloseTo(2 / 3, 10);
    expect(stageMultiplier(-6)).toBe(0.25);
    expect(stageMultiplier(9)).toBe(4);
    expect(clampStage(-8)).toBe(-6);
  });

  it('precisión/evasión: ×3/9 … ×9/3', () => {
    expect(accuracyStageMultiplier(1)).toBeCloseTo(4 / 3, 10);
    expect(accuracyStageMultiplier(6)).toBe(3);
    expect(accuracyStageMultiplier(-6)).toBeCloseTo(1 / 3, 10);
  });
});
