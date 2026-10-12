import {
  type CaptureInput,
  type FleeInput,
  MAX_FLEE,
  MIN_FLEE,
  captureChance,
  captureValue,
  fleeChance,
  resolveThrow,
  shakeThreshold,
} from './capture.js';
import { createRng } from './rng.js';

const base = (over: Partial<CaptureInput> = {}): CaptureInput => ({
  captureRate: 45,
  ball: 'POKE_BALL',
  berry: null,
  throwQuality: 'none',
  curve: false,
  ...over,
});
const flee = (over: Partial<FleeInput> = {}): FleeInput => ({
  captureRate: 45,
  speed: 45,
  isLegendary: false,
  isMythical: false,
  ...over,
});

describe('fórmula de captura (casos conocidos)', () => {
  it('vida llena: a = captureRate · bonus / 3', () => {
    expect(captureValue(base())).toBe(15);
    expect(captureValue(base({ captureRate: 255 }))).toBe(85);
  });

  it('PS a 1 de 100 casi triplica a (Gen III+)', () => {
    expect(captureValue(base({ hpMax: 100, hpCurrent: 1 }))).toBeCloseTo((298 * 45) / 300, 10);
  });

  it('sacudidas: b = floor(65536 / (255/a)^0,1875) y probabilidad = (b/65536)^4', () => {
    // a = 15 → (17)^0,1875 = 1,70104… → b = 38527 → 11,95 %
    expect(shakeThreshold(15)).toBe(38527);
    expect(captureChance(base())).toBeCloseTo(0.1195, 3);
    expect(shakeThreshold(255)).toBe(65536);
    expect(shakeThreshold(0)).toBe(0);
  });

  it('legendario (captureRate 3): Poké Ball sin ayudas ≈ 1,6 %; con todo (a = 10,2) ≈ 8,9 %', () => {
    expect(captureChance(base({ captureRate: 3 }))).toBeCloseTo(0.0157, 3);
    const best = captureChance(
      base({
        captureRate: 3,
        ball: 'ULTRA_BALL',
        berry: 'RAZZ_BERRY',
        throwQuality: 'excellent',
        curve: true,
      }),
    );
    expect(best).toBeCloseTo(0.0894, 3);
  });

  it('Pidgey (255) con Super Ball, Excelente y curva → captura segura', () => {
    expect(
      captureChance(
        base({ captureRate: 255, ball: 'GREAT_BALL', throwQuality: 'excellent', curve: true }),
      ),
    ).toBe(1);
  });

  it('cada ayuda sube la probabilidad', () => {
    const p = captureChance(base());
    expect(captureChance(base({ ball: 'GREAT_BALL' }))).toBeGreaterThan(p);
    expect(captureChance(base({ ball: 'ULTRA_BALL' }))).toBeGreaterThan(
      captureChance(base({ ball: 'GREAT_BALL' })),
    );
    expect(captureChance(base({ berry: 'RAZZ_BERRY' }))).toBeGreaterThan(p);
    expect(captureChance(base({ throwQuality: 'nice' }))).toBeGreaterThan(p);
    expect(captureChance(base({ throwQuality: 'great' }))).toBeGreaterThan(
      captureChance(base({ throwQuality: 'nice' })),
    );
    expect(captureChance(base({ throwQuality: 'excellent' }))).toBeGreaterThan(
      captureChance(base({ throwQuality: 'great' })),
    );
    expect(captureChance(base({ curve: true }))).toBeGreaterThan(p);
  });

  it('rechaza entradas imposibles (el servidor nunca debe calcular con basura)', () => {
    expect(() => captureValue(base({ captureRate: 0 }))).toThrow(RangeError);
    expect(() => captureValue(base({ captureRate: 300 }))).toThrow(RangeError);
    expect(() => captureValue(base({ hpMax: 10, hpCurrent: 11 }))).toThrow(RangeError);
    expect(() => captureValue(base({ hpMax: 10, hpCurrent: 0 }))).toThrow(RangeError);
    expect(() => captureValue(base({ ball: 'RAZZ_BERRY' as never }))).toThrow(RangeError);
    expect(() => captureValue(base({ berry: 'POKE_BALL' as never }))).toThrow(RangeError);
    expect(() => captureValue(base({ throwQuality: 'perfect' as never }))).toThrow(RangeError);
  });
});

describe('huida', () => {
  it('entre 5 % y 35 %; más si es raro, rápido o legendario', () => {
    expect(fleeChance(flee({ captureRate: 255, speed: 0 }))).toBeCloseTo(MIN_FLEE, 10);
    expect(fleeChance(flee({ captureRate: 3, speed: 200, isLegendary: true }))).toBe(MAX_FLEE);
    expect(fleeChance(flee({ speed: 120 }))).toBeGreaterThan(fleeChance(flee({ speed: 30 })));
    expect(fleeChance(flee({ captureRate: 45 }))).toBeGreaterThan(
      fleeChance(flee({ captureRate: 190 })),
    );
    expect(fleeChance(flee({ isMythical: true }))).toBeGreaterThan(fleeChance(flee()));
  });
});

describe('resolveThrow', () => {
  it('mismo RNG → mismo resultado', () => {
    const run = () => {
      const rng = createRng(1234);
      return Array.from({ length: 50 }, () => resolveThrow(base(), flee(), rng));
    };
    expect(run()).toEqual(run());
  });

  it('consume siempre 5 tiradas, capture o no', () => {
    for (const input of [
      base({ captureRate: 255, ball: 'ULTRA_BALL', curve: true }),
      base({ captureRate: 3 }),
    ]) {
      const a = createRng(99);
      resolveThrow(input, flee(), a);
      const b = createRng(99);
      for (let i = 0; i < 5; i++) b.next();
      expect(a.next()).toBe(b.next());
    }
  });

  it('la frecuencia de captura en 40.000 lanzamientos coincide con captureChance', () => {
    const rng = createRng(7);
    for (const input of [
      base(),
      base({ captureRate: 3 }),
      base({ captureRate: 120, berry: 'RAZZ_BERRY' }),
    ]) {
      let captured = 0;
      for (let i = 0; i < 40_000; i++) if (resolveThrow(input, flee(), rng).captured) captured++;
      expect(captured / 40_000).toBeCloseTo(captureChance(input), 2);
    }
  });

  it('capturado ⇒ 3 sacudidas y nunca huye; fallido ⇒ 0-3 sacudidas y huye con la frecuencia esperada', () => {
    const rng = createRng(21);
    let failed = 0;
    let fled = 0;
    for (let i = 0; i < 40_000; i++) {
      const r = resolveThrow(base(), flee({ speed: 120 }), rng);
      if (r.captured) {
        expect(r.shakes).toBe(3);
        expect(r.fled).toBe(false);
      } else {
        expect(r.shakes).toBeGreaterThanOrEqual(0);
        expect(r.shakes).toBeLessThanOrEqual(3);
        failed++;
        if (r.fled) fled++;
      }
    }
    expect(fled / failed).toBeCloseTo(fleeChance(flee({ speed: 120 })), 2);
  });
});
