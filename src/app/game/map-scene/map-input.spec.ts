import { CRY_GAP_MS, CRY_RANGE_M, CryThrottle, cryGain } from './map-input';

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
});
