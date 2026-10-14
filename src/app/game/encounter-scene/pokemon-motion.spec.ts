import {
  JUMP_MS,
  LAND_MS,
  TOUCHDOWN_MS,
  jumpSchedule,
  landingAt,
  motionAt,
} from './pokemon-motion';
import type { Personality } from './personality';

const calm: Personality = { agility: 0, skittish: 0, hover: 0, ghostly: false, fx: 'normal' };
const quick: Personality = { ...calm, agility: 1 };

describe('jumpSchedule', () => {
  it('misma semilla → mismos saltos, ordenados y ninguno durante el aterrizaje', () => {
    const a = jumpSchedule(42, 0.5, 60_000);
    expect(a).toEqual(jumpSchedule(42, 0.5, 60_000));
    expect(a[0]).toBeGreaterThan(2500);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
  });

  it('los rápidos saltan más a menudo', () => {
    expect(jumpSchedule(7, 1, 60_000).length).toBeGreaterThan(
      jumpSchedule(7, 0, 60_000).length * 1.8,
    );
  });
});

describe('motionAt', () => {
  it('quieto: en el suelo, respirando (±2,5 %)', () => {
    for (let t = 0; t < 2000; t += 100) {
      const f = motionAt(t, calm, [], 0.4);
      expect(f.lift).toBe(0);
      expect(f.jumping).toBe(false);
      expect(Math.abs(f.squash - 1)).toBeLessThanOrEqual(0.025 + 1e-9);
    }
  });

  it('los que vuelan flotan alrededor de su altura', () => {
    const f = motionAt(1000, { ...calm, hover: 0.6 }, [], 0.4);
    expect(f.lift).toBeGreaterThan(0.5);
    expect(f.lift).toBeLessThan(0.7);
  });

  it('a mitad del salto está en lo más alto; al acabar vuelve al suelo', () => {
    const mid = motionAt(5000 + JUMP_MS / 2, quick, [5000], 0.4);
    expect(mid.jumping).toBe(true);
    expect(mid.lift).toBeCloseTo((0.3 + 0.25 * 0.4) * 1.6, 6);
    expect(motionAt(5000 + JUMP_MS, quick, [5000], 0.4).jumping).toBe(false);
  });

  it('los rápidos saltan más alto', () => {
    const t = 5000 + JUMP_MS / 2;
    expect(motionAt(t, quick, [5000], 1).lift).toBeGreaterThan(motionAt(t, calm, [5000], 1).lift);
  });
});

describe('landingAt', () => {
  it('cae desde 1,5 m, toca el suelo en TOUCHDOWN_MS, se aplasta y acaba en LAND_MS', () => {
    expect(landingAt(0)).toEqual({ lift: 1.5, squash: 1.06 });
    expect(landingAt(TOUCHDOWN_MS - 1)!.lift).toBeLessThan(0.01);
    const squash = landingAt((TOUCHDOWN_MS + LAND_MS) / 2)!;
    expect(squash.lift).toBe(0);
    expect(squash.squash).toBeCloseTo(0.82, 6);
    expect(landingAt(LAND_MS)).toBeNull();
  });

  it('acaba antes del primer salto posible', () => {
    expect(LAND_MS).toBeLessThan(jumpSchedule(1, 1, 60_000)[0]);
  });
});
