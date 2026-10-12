import { limbPose } from './limb-pose';

describe('limbPose', () => {
  it('idle: piernas quietas y respiración suave', () => {
    const p = limbPose('idle', 0, 1.3);
    expect(p.legL).toBe(0);
    expect(p.legR).toBe(0);
    expect(Math.abs(p.bob)).toBeLessThan(0.1);
  });

  it('walk: piernas en oposición de fase y brazos al revés que las piernas', () => {
    const p = limbPose('walk', 1.4, 0.25);
    expect(p.legL).toBeCloseTo(-p.legR, 6);
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });

  it('run: más amplitud que walk y el cuerpo inclinado hacia delante', () => {
    const w = limbPose('walk', 1.4, 0.25);
    const r = limbPose('run', 4, 0.25 * (1.4 / 4));
    expect(Math.abs(r.legL)).toBeGreaterThan(Math.abs(w.legL));
    expect(r.lean).toBeGreaterThan(0);
    expect(w.lean).toBe(0);
  });

  it('los pies no patinan: la cadencia crece con la velocidad', () => {
    // Mismo instante: a más velocidad, la pierna ya ha recorrido más fase (primer cuarto de ciclo).
    const slow = limbPose('walk', 0.6, 0.1);
    const fast = limbPose('walk', 1.2, 0.1);
    expect(Math.abs(fast.legL)).toBeGreaterThan(Math.abs(slow.legL));
  });
});
