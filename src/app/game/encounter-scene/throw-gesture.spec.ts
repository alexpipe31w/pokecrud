import {
  MIN_FLICK_PX_S,
  REF_FLICK_PX_S,
  curveOf,
  releaseVelocity,
  spinAngle,
  swipeToThrow,
  type GestureSample,
} from './throw-gesture';

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

describe('curva', () => {
  it('una vuelta en sentido horario = curva 1; al revés −1', () => {
    expect(spinAngle(circle(1), 200, 700)).toBeCloseTo(2 * Math.PI, 6);
    expect(curveOf(circle(1), 200, 700)).toBe(1);
    expect(curveOf(circle(-1), 200, 700)).toBe(-1);
  });

  it('media vuelta no basta', () => {
    expect(curveOf(circle(0.5), 200, 700)).toBe(0);
  });
});

describe('swipeToThrow', () => {
  it('hacia abajo o muy lento no es un lanzamiento', () => {
    expect(swipeToThrow({ vx: 0, vy: 500 })).toBeNull();
    expect(swipeToThrow({ vx: 0, vy: -(MIN_FLICK_PX_S - 1) })).toBeNull();
  });

  it('recto y firme = potencia 1 y puntería 0', () => {
    expect(swipeToThrow({ vx: 0, vy: -REF_FLICK_PX_S })).toEqual({ power: 1, aim: 0 });
  });

  it('en diagonal apunta a ese lado (con tope de 45°) y la potencia sale de lo vertical', () => {
    const t = swipeToThrow({ vx: 900, vy: -900 })!;
    expect(t.aim).toBeCloseTo(Math.PI / 4, 6);
    expect(t.power).toBeCloseTo(0.5, 6);
    expect(swipeToThrow({ vx: 3000, vy: -400 })!.aim).toBeCloseTo(Math.PI / 4, 6);
  });
});
