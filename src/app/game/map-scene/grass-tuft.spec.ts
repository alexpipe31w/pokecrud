import { BLADES_PER_TUFT, HEIGHT_M, TUFT_RADIUS_M, bladeGeometry, tuftBlades } from './grass-tuft';

describe('grass-tuft', () => {
  it(`${BLADES_PER_TUFT} briznas, siempre las mismas para la misma semilla`, () => {
    const a = tuftBlades(1234);
    expect(a).toHaveLength(BLADES_PER_TUFT);
    expect(tuftBlades(1234)).toEqual(a);
    expect(tuftBlades(99)).not.toEqual(a);
  });

  it('todas dentro de la mata, de alturas y verdes variados', () => {
    const b = tuftBlades(7);
    for (const x of b) {
      expect(Math.hypot(x.dx, x.dz)).toBeLessThanOrEqual(TUFT_RADIUS_M + 0.5);
      expect(x.height).toBeGreaterThan(0.5);
      expect(x.height).toBeLessThanOrEqual(HEIGHT_M[1]);
      expect(x.color.g).toBeGreaterThan(x.color.r); // verde
    }
    expect(new Set(b.map((x) => x.height.toFixed(2))).size).toBeGreaterThan(BLADES_PER_TUFT / 2);
    expect(new Set(b.map((x) => x.color.getHexString())).size).toBeGreaterThan(3);
  });

  it('más tupida en el centro que en el borde', () => {
    const b = tuftBlades(42);
    const inner = b.filter((x) => Math.hypot(x.dx, x.dz) < TUFT_RADIUS_M / 2).length;
    expect(inner).toBeGreaterThan(b.length / 2);
  });

  it('la brizna mide 1 m, acaba en punta y es más oscura abajo', () => {
    const g = bladeGeometry();
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(1, 6);
    expect(g.boundingBox!.min.y).toBe(0);
    const c = g.getAttribute('color');
    expect(c.getX(0)).toBeLessThan(c.getX(c.count - 1));
    g.dispose();
  });
});
