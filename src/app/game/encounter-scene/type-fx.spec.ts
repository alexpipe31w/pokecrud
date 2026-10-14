import { FX_KIND, particleAt, type FxKind } from './type-fx';

const KINDS: FxKind[] = ['rise', 'fall', 'spark', 'orbit', 'drift'];

describe('type-fx', () => {
  it('todos los tipos tienen partículas', () => {
    expect(Object.keys(FX_KIND)).toHaveLength(18);
  });

  it('el fuego sube y el agua cae (misma partícula dentro de su vida)', () => {
    // s0 = 0, s1 = 0,5 → vida = 0,5·t: en t = 0,2 va por 0,1 y en t = 1 por 0,5
    expect(particleAt('rise', 0, 0.5, 0, 1, 1, 0.5).y).toBeGreaterThan(
      particleAt('rise', 0, 0.5, 0, 0.2, 1, 0.5).y,
    );
    expect(particleAt('fall', 0, 0.5, 0, 1, 1, 0.5).y).toBeLessThan(
      particleAt('fall', 0, 0.5, 0, 0.2, 1, 0.5).y,
    );
  });

  it('siempre cerca del Pokémon y con alfa en [0, 1]', () => {
    for (const kind of KINDS) {
      for (let i = 0; i < 50; i++) {
        const s = [((i * 37) % 100) / 100, ((i * 61) % 100) / 100, ((i * 13) % 100) / 100];
        for (let t = 0; t < 5; t += 0.37) {
          const p = particleAt(kind, s[0], s[1], s[2], t, 1.2, 0.5);
          expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.5 * 1.21);
          expect(p.y).toBeGreaterThanOrEqual(-0.11);
          expect(p.y).toBeLessThanOrEqual(1.2 * 1.3 + 0.31);
          expect(p.alpha).toBeGreaterThanOrEqual(0);
          expect(p.alpha).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('es determinista', () => {
    expect(particleAt('spark', 0.3, 0.6, 0.9, 2.5, 1, 0.5)).toEqual(
      particleAt('spark', 0.3, 0.6, 0.9, 2.5, 1, 0.5),
    );
  });
});
