import { RING_MIN, RING_PERIOD_MS, ringRadius, ringToken, throwQuality } from './precision-ring';

describe('precision-ring', () => {
  it('el aro encoge de 1 a RING_MIN y vuelve a empezar', () => {
    expect(ringRadius(0)).toBe(1);
    expect(ringRadius(RING_PERIOD_MS / 2)).toBeCloseTo((1 + RING_MIN) / 2, 6);
    expect(ringRadius(RING_PERIOD_MS - 1)).toBeCloseTo(RING_MIN, 2);
    expect(ringRadius(RING_PERIOD_MS)).toBe(1);
  });

  it('fuera del aro no hay bonus; dentro, mejor cuanto más pequeño', () => {
    expect(throwQuality(0.5, 0, 0.3)).toBe('none');
    expect(throwQuality(0.1, 0, 0.9)).toBe('nice');
    expect(throwQuality(0.1, 0, 0.5)).toBe('great');
    expect(throwQuality(0.1, 0.1, 0.3)).toBe('excellent');
  });

  it('el color sale de la probabilidad de captura', () => {
    expect(ringToken(0.8)).toBe('--success');
    expect(ringToken(0.4)).toBe('--gold');
    expect(ringToken(0.2)).toBe('--t-fire');
    expect(ringToken(0.05)).toBe('--danger');
  });
});
