import { A36_CURVE_GESTURES } from './a36-curve-gestures.data';
import { EYE_HEIGHT_M } from './encounter-layout';
import {
  GOOD_MAX_PX_S,
  GOOD_MIN_PX_S,
  MIN_FLICK_PX_S,
  curveOf,
  releaseVelocity,
  swipeToThrow,
  turnAngle,
  type GestureSample,
} from './throw-gesture';
import { hitBox, planFlight, resolveFlight, type TargetBox } from './throw-physics';

/**
 * Velocidad al soltar (px/s hacia arriba, px/s a la derecha) de 17 lanzamientos reales con el dedo en el Samsung A36
 * (Kenneth, 2026-10-12, D-050): "como salgan", sin corregir.
 */
const A36_FLICKS: readonly [number, number][] = [
  [1356, 275], [3085, 375], [2759, -149], [1615, 64], [1450, 68], [1596, 54], [2238, 181], [1119, -5], [1400, -120],
  [3329, -190], [3198, 260], [1989, 312], [3299, 102], [2463, 326], [2718, 8], [2374, 168], [1929, 117],
];

/** Un Pokémon diminuto (caja mínima) en el suelo a 2 m, delante: el caso más difícil de acertar. */
const tinyAt2m = (): TargetBox => ({
  fwd: 2,
  lat: 0,
  baseY: -EYE_HEIGHT_M,
  groundY: -EYE_HEIGHT_M,
  ...hitBox(0.2, 1),
});

const throwAt = (box: TargetBox, vy: number, vx = 0) => {
  const t = swipeToThrow({ vx, vy: -vy });
  if (!t) return 'no-throw';
  return resolveFlight(planFlight(t.power, t.aim, 0, box.fwd, box.baseY + box.height / 2), box).kind;
};

/** Un círculo de radio 40 px alrededor de (200, 700) en `n` muestras, `turns` vueltas (+ horario). */
const circle = (turns: number, n = 40): GestureSample[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * turns * 2 * Math.PI;
    return { x: 200 + 40 * Math.cos(a), y: 700 + 40 * Math.sin(a), t: i * 10 };
  });

describe('releaseVelocity', () => {
  it('usa solo los últimos 80 ms', () => {
    const s: GestureSample[] = [
      { x: 0, y: 800, t: 0 }, // lento al principio
      { x: 0, y: 790, t: 300 },
      { x: 0, y: 750, t: 340 },
      { x: 0, y: 700, t: 380 },
    ];
    // de t = 300 a 380: 90 px en 0,08 s
    expect(releaseVelocity(s)).toEqual({ vx: 0, vy: -1125 });
  });

  it('null con menos de dos muestras o sin tiempo', () => {
    expect(releaseVelocity([{ x: 0, y: 0, t: 0 }])).toBeNull();
    expect(
      releaseVelocity([
        { x: 0, y: 0, t: 5 },
        { x: 0, y: -10, t: 5 },
      ]),
    ).toBeNull();
  });
});

/** `n` muestras de un tirón recto hacia arriba desde (x, y), con temblor de ±`jitter` px a los lados. */
const flick = (x: number, y: number, n = 12, jitter = 0): GestureSample[] =>
  Array.from({ length: n }, (_, i) => ({ x: x + (i % 2 ? jitter : -jitter), y: y - i * 30, t: i * 16 }));

const fromA36 = (g: readonly (readonly [number, number, number])[]): GestureSample[] =>
  g.map(([x, y, t]) => ({ x, y, t }));

describe('curva (D-050: cuenta lo que GIRA el dedo, no dónde está)', () => {
  it('una vuelta en sentido horario = curva 1; al revés −1', () => {
    expect(turnAngle(circle(1))).toBeGreaterThan(1.8 * Math.PI);
    expect(curveOf(circle(1))).toBe(1);
    expect(curveOf(circle(-1))).toBe(-1);
  });

  it('media vuelta no basta', () => {
    expect(curveOf(circle(0.5))).toBe(0);
  });

  it('un círculo que EMPIEZA donde se agarra la bola (el gesto natural) también es curva', () => {
    // Antes se medía alrededor del punto de agarre: ese punto queda en el borde del círculo y nunca pasaba de ½ vuelta.
    const fromEdge = circle(1).map((p) => ({ ...p, x: p.x - 40 }));
    expect(curveOf(fromEdge)).toBe(1);
  });

  it('el tirón final hacia arriba no deshace la vuelta', () => {
    const c = circle(1.2);
    const end = c[c.length - 1];
    const tail = flick(end.x, end.y).map((p) => ({ ...p, t: p.t + end.t + 10 }));
    expect(curveOf([...c, ...tail])).toBe(1);
    expect(curveOf([...circle(-1.2), ...tail])).toBe(-1);
  });

  it('un lanzamiento recto con temblor no es curva', () => {
    expect(curveOf(flick(200, 700, 20, 2))).toBe(0);
  });

  it('los 4 lanzamientos con curva reales del A36 son curva, en su sentido (horario)', () => {
    for (const g of A36_CURVE_GESTURES) expect(curveOf(fromA36(g))).toBe(1);
  });
});

describe('swipeToThrow', () => {
  it('hacia abajo o muy lento no es un lanzamiento', () => {
    expect(swipeToThrow({ vx: 0, vy: 500 })).toBeNull();
    expect(swipeToThrow({ vx: 0, vy: -(MIN_FLICK_PX_S - 1) })).toBeNull();
  });

  it('recto y firme = potencia 1 y puntería 0 en TODA la zona buena (D-050)', () => {
    for (const v of [GOOD_MIN_PX_S, 1800, 2500, GOOD_MAX_PX_S]) {
      expect(swipeToThrow({ vx: 0, vy: -v })).toEqual({ power: 1, aim: 0 });
    }
  });

  it('por debajo de la zona buena se queda corto; por encima, largo (con tope)', () => {
    expect(swipeToThrow({ vx: 0, vy: -0.9 * GOOD_MIN_PX_S })!.power).toBeCloseTo(0.9, 6);
    expect(swipeToThrow({ vx: 0, vy: -MIN_FLICK_PX_S })!.power).toBeCloseTo(0.35, 6);
    expect(swipeToThrow({ vx: 0, vy: -1.2 * GOOD_MAX_PX_S })!.power).toBeCloseTo(1.2, 6);
    expect(swipeToThrow({ vx: 0, vy: -20000 })!.power).toBe(2);
  });

  it('en diagonal apunta a ese lado (con tope de 45°) y la potencia sale de lo vertical', () => {
    const t = swipeToThrow({ vx: 900, vy: -900 })!;
    expect(t.aim).toBeCloseTo(Math.PI / 4, 6);
    expect(t.power).toBeCloseTo(0.9, 6);
    expect(swipeToThrow({ vx: 3000, vy: -400 })!.aim).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('lanzar con el dedo de verdad (gestos medidos en el A36, D-050)', () => {
  it('todos los gestos reales, rectos, le dan a un Pokémon diminuto a 2 m', () => {
    for (const [vy] of A36_FLICKS) expect(throwAt(tinyAt2m(), vy)).toBe('hit');
  });

  it('con su puntería real, la mayoría le da (los torcidos > 5° fallan)', () => {
    const hits = A36_FLICKS.filter(([vy, vx]) => throwAt(tinyAt2m(), vy, vx) === 'hit').length;
    expect(hits).toBeGreaterThanOrEqual(12); // 13 de 17: fallan los de 6,9°, 7,5°, 8,9° y 11,4°
  });

  it('flojo sigue quedándose corto y demasiado fuerte pasa por encima', () => {
    expect(throwAt(tinyAt2m(), 0.85 * GOOD_MIN_PX_S)).toBe('miss');
    expect(throwAt(tinyAt2m(), 1.25 * GOOD_MAX_PX_S)).toBe('miss');
  });
});
