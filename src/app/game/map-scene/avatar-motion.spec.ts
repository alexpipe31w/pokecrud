import { AvatarMotion, RUN_MIN_MS, TELEPORT_M, WALK_MIN_MS } from './avatar-motion';

/** Simula `seconds` a 60 fps con el objetivo moviéndose a `v` m/s hacia el este. */
function walk(m: AvatarMotion, v: number, seconds: number) {
  let east = m.target.east;
  let out = m.step(0);
  for (let i = 0; i < seconds * 60; i++) {
    east += v / 60;
    m.setTarget(east, 0);
    out = m.step(1 / 60);
  }
  return out;
}

describe('AvatarMotion', () => {
  it('quieto → idle', () => {
    const m = new AvatarMotion();
    expect(walk(m, 0, 2).gait).toBe('idle');
  });
  it('a 1,4 m/s → walk, mirando al este (90°) y velocidad ≈ 1,4', () => {
    const out = walk(new AvatarMotion(), 1.4, 6);
    expect(out.gait).toBe('walk');
    expect(out.facingDeg).toBeCloseTo(90, 0);
    expect(out.speed).toBeCloseTo(1.4, 1);
  });
  it('a 4 m/s → run', () => {
    expect(walk(new AvatarMotion(), 4, 6).gait).toBe('run');
  });
  it('alcanza un objetivo fijo sin pasarse', () => {
    const m = new AvatarMotion();
    m.setTarget(10, 0);
    let out = m.step(0);
    for (let i = 0; i < 300; i++) out = m.step(1 / 60);
    expect(out.east).toBeGreaterThan(9.9);
    expect(out.east).toBeLessThanOrEqual(10);
  });
  it(`un salto de más de ${TELEPORT_M} m se teletransporta (sin cruzar el mapa caminando)`, () => {
    const m = new AvatarMotion();
    m.setTarget(TELEPORT_M + 1, 0);
    expect(m.step(1 / 60).east).toBe(TELEPORT_M + 1);
  });
  it('umbrales coherentes', () => {
    expect(WALK_MIN_MS).toBeLessThan(1.4);
    expect(RUN_MIN_MS).toBeGreaterThan(1.4);
    expect(RUN_MIN_MS).toBeLessThan(4);
  });
});
