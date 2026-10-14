import { ivPercent, ivStars } from './iv-appraisal.js';

const ivs = (n: number) => ({
  hp: n,
  attack: n,
  defense: n,
  specialAttack: n,
  specialDefense: n,
  speed: n,
});

describe('valoración de IVs', () => {
  it('porcentaje redondeado de 186', () => {
    expect(ivPercent(ivs(31))).toBe(100);
    expect(ivPercent(ivs(0))).toBe(0);
    expect(ivPercent(ivs(15))).toBe(48); // 90/186 = 48,4 %
  });

  it('estrellas por tramos; 4 solo con todo a 31', () => {
    expect(ivStars(ivs(15))).toBe(0);
    expect(ivStars(ivs(17))).toBe(1); // 54,8 %
    expect(ivStars(ivs(22))).toBe(2); // 71 %
    expect(ivStars(ivs(30))).toBe(3); // 96,8 %
    expect(ivStars(ivs(31))).toBe(4);
  });
});
