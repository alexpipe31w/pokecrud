import { JOYSTICK_DEADZONE, JOYSTICK_MAX_MS, joystickVelocity } from './joystick-math';

describe('joystickVelocity', () => {
  it('dentro de la zona muerta no se mueve', () => {
    expect(joystickVelocity(JOYSTICK_DEADZONE * 0.9, 0, 0)).toEqual({ east: 0, north: 0 });
  });
  it('arriba del todo con la cámara al norte = norte a la velocidad máxima', () => {
    const v = joystickVelocity(0, -1, 0);
    expect(v.north).toBeCloseTo(JOYSTICK_MAX_MS, 6);
    expect(v.east).toBeCloseTo(0, 6);
  });
  it('arriba con la cámara mirando al este = este', () => {
    const v = joystickVelocity(0, -1, 90);
    expect(v.east).toBeCloseTo(JOYSTICK_MAX_MS, 6);
    expect(v.north).toBeCloseTo(0, 6);
  });
  it('fuera del círculo se recorta a 1', () => {
    const v = joystickVelocity(3, 0, 0);
    expect(Math.hypot(v.east, v.north)).toBeCloseTo(JOYSTICK_MAX_MS, 6);
  });
});
