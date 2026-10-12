import { advanceStride, limbPose } from './limb-pose';

describe('limbPose', () => {
  it('idle: piernas quietas y respiración suave', () => {
    const p = limbPose('idle', 1.2, 1.3);
    expect(p.legL).toBe(0);
    expect(p.legR).toBe(0);
    expect(Math.abs(p.bob)).toBeLessThan(0.1);
  });

  it('walk: piernas en oposición de fase y brazos al revés que las piernas', () => {
    const p = limbPose('walk', Math.PI / 3, 0);
    expect(p.legL).toBeCloseTo(-p.legR, 6);
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });

  it('run: más amplitud que walk y el cuerpo inclinado hacia delante', () => {
    const w = limbPose('walk', Math.PI / 2, 0);
    const r = limbPose('run', Math.PI / 2, 0);
    expect(Math.abs(r.legL)).toBeGreaterThan(Math.abs(w.legL));
    expect(r.lean).toBeGreaterThan(0);
    expect(w.lean).toBe(0);
  });
});

describe('advanceStride', () => {
  const dt = 1 / 60;

  it('los pies no patinan: a más velocidad, más cadencia', () => {
    expect(advanceStride(0, 'walk', 1.2, dt)).toBeGreaterThan(advanceStride(0, 'walk', 0.6, dt));
  });

  it('corriendo la zancada es más larga: a igual velocidad, menos cadencia que andando', () => {
    expect(advanceStride(0, 'run', 3, dt)).toBeLessThan(advanceStride(0, 'walk', 3, dt));
  });

  it('quieto no avanza', () => {
    expect(advanceStride(1, 'idle', 0.3, dt)).toBe(1);
  });

  it('un cambio pequeño de velocidad no hace saltar la fase (aunque lleve mucho rato abierta)', () => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 60 * 600; i++) a = advanceStride(a, 'walk', 1.4, dt);
    b = advanceStride(a, 'walk', 1.45, dt);
    a = advanceStride(a, 'walk', 1.4, dt);
    expect(Math.abs(b - a)).toBeLessThan(0.01);
  });

  it('se queda en [0, 2π)', () => {
    let p = 0;
    for (let i = 0; i < 1000; i++) {
      p = advanceStride(p, 'run', 4, dt);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(2 * Math.PI);
    }
  });
});
