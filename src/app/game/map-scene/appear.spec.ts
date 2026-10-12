import { APPEAR_MS, DISAPPEAR_MS, appearPose, disappearPose } from './appear';

describe('appear', () => {
  it('al principio solo se agita la hierba', () => {
    const p = appearPose(100);
    expect(p.opacity).toBe(0);
    expect(p.grassAmp).toBeGreaterThan(0.5);
  });

  it('durante el salto sube por encima del reposo', () => {
    expect(Math.max(...[800, 850, 900, 950].map((t) => appearPose(t).y))).toBeGreaterThan(1.2);
  });

  it('al terminar queda en reposo exacto', () => {
    expect(appearPose(APPEAR_MS)).toEqual({ y: 1, scale: 1, opacity: 1, grassAmp: 0.15 });
  });

  it('el final del salto enlaza con el reposo (sin salto visual)', () => {
    const end = appearPose(APPEAR_MS - 1);
    expect(end.y).toBeCloseTo(1, 1);
    expect(end.scale).toBeCloseTo(1, 2);
  });

  it('nunca escala desde 0', () => {
    for (let t = 0; t <= APPEAR_MS; t += 50)
      expect(appearPose(t).scale).toBeGreaterThanOrEqual(0.95);
  });

  it('desaparecer termina invisible', () => {
    expect(disappearPose(0).opacity).toBe(1);
    expect(disappearPose(DISAPPEAR_MS).opacity).toBe(0);
  });
});
