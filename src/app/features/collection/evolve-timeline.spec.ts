import { BURST_MS, PULSE_MS, evolvePose } from './evolve-timeline';

/** Cuántas veces cambia A↔B entre `from` y `to` (muestreando cada ms). */
const flips = (from: number, to: number, burstAt = PULSE_MS): number => {
  let n = 0;
  let prev = evolvePose(from, burstAt).showB;
  for (let t = from + 1; t <= to; t++) {
    const cur = evolvePose(t, burstAt).showB;
    if (cur !== prev) n++;
    prev = cur;
  }
  return n;
};

describe('evolvePose', () => {
  it('empieza en la forma A, con brillo bajo y sin destello', () => {
    expect(evolvePose(0)).toMatchObject({ showB: false, burst: 0, revealed: false, done: false });
    expect(evolvePose(0).glow).toBeCloseTo(0.3);
  });

  it('alterna A↔B acelerando: en el último segundo, al menos 4 veces más cambios que en el primero', () => {
    const first = flips(0, 1000);
    const last = flips(PULSE_MS - 1000, PULSE_MS - 1);
    expect(first).toBeGreaterThan(0);
    expect(last).toBeGreaterThanOrEqual(4 * first);
  });

  it('el brillo sube hasta 1 al acabar de alternar', () => {
    expect(evolvePose(PULSE_MS / 2).glow).toBeGreaterThan(0.3);
    expect(evolvePose(PULSE_MS - 1).glow).toBeCloseTo(1, 1);
  });

  it('destello: sube y baja; la forma B a color aparece bajo el destello', () => {
    const peak = Math.max(
      ...Array.from({ length: BURST_MS }, (_, i) => evolvePose(PULSE_MS + i).burst),
    );
    expect(peak).toBeCloseTo(1, 1);
    expect(evolvePose(PULSE_MS + BURST_MS / 2)).toMatchObject({ showB: true, revealed: true });
  });

  it('al final: forma B en reposo, sin destello', () => {
    expect(evolvePose(PULSE_MS + BURST_MS)).toMatchObject({
      showB: true,
      burst: 0,
      revealed: true,
      done: true,
    });
  });

  it('mientras no llega la respuesta del servidor (burstAt = ∞) sigue alternando rápido, sin destello', () => {
    const waiting = Number.POSITIVE_INFINITY;
    expect(flips(PULSE_MS, PULSE_MS + 1000, waiting)).toBeGreaterThan(10);
    expect(evolvePose(PULSE_MS + 5000, waiting)).toMatchObject({
      burst: 0,
      done: false,
      revealed: false,
    });
  });

  it('si la respuesta llega tarde, el destello empieza entonces', () => {
    const at = PULSE_MS + 2000;
    expect(evolvePose(at - 1, at).burst).toBe(0);
    expect(evolvePose(at + BURST_MS, at).done).toBe(true);
  });
});
