import { FpsMeter } from './fps-meter';

describe('FpsMeter', () => {
  const feed = (meter: FpsMeter, deltas: number[]) => {
    let t = 1000;
    meter.frame(t);
    for (const d of deltas) {
      t += d;
      meter.frame(t);
    }
  };

  it('60 fps estables → media 60, p95 16,7 ms y sin tirones', () => {
    const m = new FpsMeter();
    feed(m, Array(120).fill(1000 / 60));
    expect(m.summary()).toEqual({
      frames: 120,
      seconds: 2,
      avgFps: 60,
      p95Ms: 16.7,
      worstMs: 16.7,
      jankPct: 0,
    });
  });

  it('cuenta como tirón lo que pasa de 33,4 ms y lo refleja en p95 y peor fotograma', () => {
    const m = new FpsMeter();
    feed(m, [...Array(90).fill(16), ...Array(10).fill(50)]);
    const s = m.summary();
    expect(s.jankPct).toBe(10);
    expect(s.p95Ms).toBe(50);
    expect(s.worstMs).toBe(50);
    expect(s.avgFps).toBeCloseTo(100000 / 1940, 1);
  });

  it('recentFps mira solo la ventana pedida', () => {
    const m = new FpsMeter();
    feed(m, [...Array(60).fill(50), ...Array(60).fill(1000 / 60)]);
    expect(m.recentFps(1000)).toBe(60);
  });

  it('sin fotogramas o tras reset → todo a 0', () => {
    const m = new FpsMeter();
    feed(m, [16, 16]);
    m.reset();
    expect(m.summary().frames).toBe(0);
    expect(m.recentFps()).toBe(0);
  });
});
