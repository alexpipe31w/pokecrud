import { CRY_GAP_MS, CRY_RANGE_M, CryThrottle, cryGain, isTap, toNdc } from './map-input';

describe('map-input', () => {
  describe('cryGain', () => {
    it('cerca suena más que lejos, entre 0,2 y 0,6', () => {
      expect(cryGain(0)).toBe(0.6);
      expect(cryGain(CRY_RANGE_M * 0.95)).toBe(0.2);
      expect(cryGain(10)!).toBeGreaterThan(cryGain(40)!);
    });
    it(`más allá de ${CRY_RANGE_M} m no suena`, () => expect(cryGain(CRY_RANGE_M + 1)).toBeNull());
  });

  describe('CryThrottle', () => {
    it(`como mucho un grito cada ${CRY_GAP_MS / 1000} s`, () => {
      const t = new CryThrottle();
      expect(t.take(0)).toBe(true);
      expect(t.take(CRY_GAP_MS - 1)).toBe(false);
      expect(t.take(CRY_GAP_MS)).toBe(true);
    });
  });

  describe('isTap', () => {
    const down = { x: 100, y: 100, t: 0 };
    it('soltar casi en el mismo sitio y rápido = toque', () =>
      expect(isTap(down, { x: 105, y: 103, t: 200 })).toBe(true));
    it('arrastre (> 10 px) no', () => expect(isTap(down, { x: 115, y: 100, t: 100 })).toBe(false));
    it('pulsación larga (> 300 ms) no', () =>
      expect(isTap(down, { x: 100, y: 100, t: 400 })).toBe(false));
  });

  describe('toNdc', () => {
    const rect = { left: 10, top: 20, width: 200, height: 400 };
    it('centro → (0, 0); esquina superior izquierda → (−1, 1)', () => {
      expect(toNdc(110, 220, rect)).toEqual({ x: 0, y: 0 });
      expect(toNdc(10, 20, rect)).toEqual({ x: -1, y: 1 });
      expect(toNdc(210, 420, rect)).toEqual({ x: 1, y: -1 });
    });
  });
});
