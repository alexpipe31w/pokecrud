import { deltaDeg, headingFromAlpha, normDeg, smoothAngle } from './angles';

describe('angles', () => {
  it('normDeg lleva a [0, 360)', () => {
    expect(normDeg(-10)).toBe(350);
    expect(normDeg(725)).toBe(5);
  });
  it('deltaDeg toma el camino corto', () => {
    expect(deltaDeg(350, 10)).toBe(20);
    expect(deltaDeg(10, 350)).toBe(-20);
    expect(deltaDeg(0, 180)).toBe(-180);
  });
  it('smoothAngle cruza el norte sin dar la vuelta por el sur', () => {
    expect(smoothAngle(359, 1, 0.5)).toBeCloseTo(0, 6);
    expect(smoothAngle(350, 10, 0.25)).toBeCloseTo(355, 6);
  });
  it('headingFromAlpha: alpha 90 en vertical = mira al oeste (270); con la pantalla girada 90 = norte', () => {
    expect(headingFromAlpha(90, 0)).toBe(270);
    expect(headingFromAlpha(90, 90)).toBe(0);
  });
});
