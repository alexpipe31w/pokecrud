import { EYE_HEIGHT_M } from './encounter-layout';
import { flightPos, hitBox, planFlight, resolveFlight, type TargetBox } from './throw-physics';

const GROUND = -EYE_HEIGHT_M;

/** Pokémon de `heightM` delante a `d` metros, con los pies a `lift` metros del suelo. */
function target(heightM: number, d: number, lift = 0, lat = 0): TargetBox {
  return { fwd: d, lat, baseY: GROUND + lift, groundY: GROUND, ...hitBox(heightM, 1) };
}
const centerY = (b: TargetBox) => b.baseY + b.height / 2;

describe('throw-physics', () => {
  it('potencia 1 y recto: al centro del Pokémon, a 2 m y a 10 m', () => {
    for (const d of [2, 10]) {
      const box = target(0.4, d);
      const hit = resolveFlight(planFlight(1, 0, 0, d, centerY(box)), box);
      expect(hit.kind).toBe('hit');
      if (hit.kind === 'hit') {
        expect(hit.u).toBeCloseTo(0, 6);
        expect(hit.v).toBeCloseTo(0, 6);
      }
    }
  });

  it('flojo se queda corto (cae al suelo antes de llegar)', () => {
    const box = target(0.4, 2);
    const hit = resolveFlight(planFlight(0.5, 0, 0, 2, centerY(box)), box);
    expect(hit.kind).toBe('miss');
    if (hit.kind === 'miss') expect(hit.fwd).toBeLessThan(2);
  });

  it('demasiado fuerte pasa por encima de uno pequeño pero da en la cabeza de uno grande', () => {
    const small = target(0.4, 2);
    expect(resolveFlight(planFlight(1.6, 0, 0, 2, centerY(small)), small).kind).toBe('miss');
    const snorlax = target(2.1, 3.78);
    const hit = resolveFlight(planFlight(1.2, 0, 0, 3.78, centerY(snorlax)), snorlax);
    expect(hit.kind).toBe('hit');
    if (hit.kind === 'hit') expect(hit.v).toBeGreaterThan(0.5);
  });

  it('torcido 25° no le da a uno pequeño a 3 m', () => {
    const box = target(0.4, 3);
    expect(resolveFlight(planFlight(1, (25 * Math.PI) / 180, 0, 3, centerY(box)), box).kind).toBe(
      'miss',
    );
  });

  it('con efecto se abre a un lado y vuelve: llega al centro igual', () => {
    const box = target(0.4, 3);
    const f = planFlight(1, 0, 1, 3, centerY(box));
    expect(flightPos(f, f.tArrive / 2).lat).toBeCloseTo(0.6, 6);
    const hit = resolveFlight(f, box);
    expect(hit.kind).toBe('hit');
    if (hit.kind === 'hit') expect(hit.u).toBeCloseTo(0, 6);
  });

  it('si salta justo cuando llega la bola, la bola pasa por debajo', () => {
    const still = target(0.4, 2);
    const f = planFlight(1, 0, 0, 2, centerY(still));
    expect(resolveFlight(f, target(0.4, 2, 0.6)).kind).toBe('miss');
  });

  it('hitBox: los diminutos tienen una caja mínima', () => {
    expect(hitBox(0.1, 1)).toEqual({ height: 0.35, halfWidth: 0.18 });
    expect(hitBox(2, 1)).toEqual({ height: 2, halfWidth: 0.7 });
  });
});
