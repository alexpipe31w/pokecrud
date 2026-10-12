import { isNightLocal } from './day-night';

describe('isNightLocal (DISENO §1: noche de 19:00 a 6:00, hora del móvil)', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m);

  it('19:00 y 5:59 son de noche', () => {
    expect(isNightLocal(at(19))).toBe(true);
    expect(isNightLocal(at(5, 59))).toBe(true);
    expect(isNightLocal(at(0))).toBe(true);
  });

  it('6:00 y 18:59 son de día', () => {
    expect(isNightLocal(at(6))).toBe(false);
    expect(isNightLocal(at(18, 59))).toBe(false);
    expect(isNightLocal(at(12))).toBe(false);
  });
});
