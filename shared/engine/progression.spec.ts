import { ITEMS, STARTER_KIT } from './items.js';
import { MAX_PLAYER_LEVEL, levelForXp, levelProgress, totalXpForLevel } from './progression.js';

describe('progresión del jugador', () => {
  it('curva 500·(L−1)·L', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(1000);
    expect(totalXpForLevel(3)).toBe(3000);
    expect(totalXpForLevel(10)).toBe(45_000);
    expect(totalXpForLevel(40)).toBe(780_000);
  });

  it('levelForXp en los bordes y fuera de rango', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelForXp(999)).toBe(1);
    expect(levelForXp(1000)).toBe(2);
    expect(levelForXp(2999)).toBe(2);
    expect(levelForXp(3000)).toBe(3);
    expect(levelForXp(10_000_000)).toBe(MAX_PLAYER_LEVEL);
  });

  it('levelForXp es la inversa exacta de totalXpForLevel en todos los niveles', () => {
    for (let l = 1; l <= MAX_PLAYER_LEVEL; l++) {
      expect(levelForXp(totalXpForLevel(l))).toBe(l);
      if (l > 1) expect(levelForXp(totalXpForLevel(l) - 1)).toBe(l - 1);
    }
  });

  it('levelProgress para la barra del HUD', () => {
    expect(levelProgress(0)).toEqual({ level: 1, current: 0, needed: 1000, ratio: 0 });
    expect(levelProgress(1500)).toEqual({ level: 2, current: 500, needed: 2000, ratio: 0.25 });
    expect(levelProgress(780_000)).toEqual({ level: 40, current: 0, needed: 0, ratio: 1 });
  });

  it('el kit inicial cubre todos los objetos y no tiene cantidades negativas', () => {
    expect(Object.keys(STARTER_KIT).sort()).toEqual([...ITEMS].sort());
    for (const qty of Object.values(STARTER_KIT)) expect(qty).toBeGreaterThanOrEqual(0);
  });
});
