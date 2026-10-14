import { createRng, hashString } from './rng.js';

describe('rng', () => {
  it('misma semilla → misma secuencia', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('valores en [0, 1)', () => {
    const r = createRng(7);
    // Un solo `expect` con los que se salen: 20.000 `expect` sueltos tardaban > 1 s (F0-15).
    const out: number[] = [];
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      if (!(v >= 0 && v < 1)) out.push(v);
    }
    expect(out).toEqual([]);
  });

  it('int(min,max) incluye ambos extremos y es aproximadamente uniforme', () => {
    const r = createRng(123);
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[r.int(1, 6) - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(9_000);
  });

  it('hashString es estable y distingue entradas', () => {
    expect(hashString('cell_1_2|slot_9')).toBe(hashString('cell_1_2|slot_9'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('chance(p) respeta la probabilidad', () => {
    const r = createRng(5);
    let hits = 0;
    for (let i = 0; i < 100_000; i++) if (r.chance(0.25)) hits++;
    expect(hits / 100_000).toBeCloseTo(0.25, 1);
  });
});
