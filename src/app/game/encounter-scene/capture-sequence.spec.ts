import {
  SEQ_MS,
  ballDropY,
  preTimeline,
  resultTimeline,
  shakeAngle,
  stepAt,
  timelineEnd,
} from './capture-sequence';

const steps = (items: { step: string }[]) => items.map((i) => i.step);

describe('capture-sequence', () => {
  it('antes del servidor: absorber y caer, seguidos', () => {
    const pre = preTimeline(1000);
    expect(steps(pre)).toEqual(['absorb', 'drop']);
    expect(pre[0].start).toBe(1000);
    expect(pre[1].start).toBe(pre[0].end);
    expect(timelineEnd(pre)).toBe(1000 + SEQ_MS.absorb + SEQ_MS.drop);
  });

  it('capturado: 3 sacudidas y clic', () => {
    const tl = resultTimeline({ captured: true, shakes: 3, fled: false }, 0);
    expect(steps(tl)).toEqual([
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'click',
    ]);
    expect(tl.filter((i) => i.step === 'shake').map((i) => i.index)).toEqual([1, 2, 3]);
  });

  it('se escapa a la primera: sale de la bola y sigue el encuentro', () => {
    expect(steps(resultTimeline({ captured: false, shakes: 0, fled: false }, 0))).toEqual([
      'pause',
      'burst',
    ]);
  });

  it('se escapa y huye', () => {
    expect(steps(resultTimeline({ captured: false, shakes: 2, fled: true }, 0))).toEqual([
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'burst',
      'flee',
    ]);
  });

  it('sin huecos y al doble de rápido con speed 2', () => {
    const slow = resultTimeline({ captured: true, shakes: 3, fled: false }, 500);
    const fast = resultTimeline({ captured: true, shakes: 3, fled: false }, 500, 2);
    for (let i = 1; i < slow.length; i++) expect(slow[i].start).toBe(slow[i - 1].end);
    expect(timelineEnd(fast) - 500).toBeCloseTo((timelineEnd(slow) - 500) / 2, 6);
  });

  it('stepAt: el paso en curso y su avance', () => {
    const tl = preTimeline(0);
    expect(stepAt(tl, 300)).toEqual({ item: tl[0], k: 0.5 });
    expect(stepAt(tl, SEQ_MS.absorb)!.item.step).toBe('drop');
    expect(stepAt(tl, timelineEnd(tl))).toBeNull();
  });
});

describe('ballDropY y shakeAngle', () => {
  it('la bola cae de donde golpeó al suelo, bota un poco y se queda', () => {
    expect(ballDropY(0, -1, -1.34)).toBe(-1);
    expect(ballDropY(0.6, -1, -1.34)).toBeCloseTo(-1.34, 6);
    expect(ballDropY(0.8, -1, -1.34)).toBeCloseTo(-1.34 + 0.08, 6);
    expect(ballDropY(1, -1, -1.34)).toBeCloseTo(-1.34, 6);
  });

  it('cada sacudida empieza y acaba derecha', () => {
    expect(shakeAngle(0)).toBe(0);
    expect(shakeAngle(1)).toBeCloseTo(0, 6);
    expect(Math.abs(shakeAngle(0.125))).toBeGreaterThan(0.3);
  });
});
