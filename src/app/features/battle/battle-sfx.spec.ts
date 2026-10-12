import { eventSfx, hitSfx } from './battle-sfx';

describe('battle-sfx', () => {
  it('golpe: el crítico manda; luego muy eficaz, poco eficaz o normal', () => {
    expect(hitSfx(true, 0.5)).toBe('hit-crit');
    expect(hitSfx(false, 2)).toBe('hit-super');
    expect(hitSfx(false, 0.5)).toBe('hit-weak');
    expect(hitSfx(false, 1)).toBe('hit');
  });

  it('cada evento con su efecto', () => {
    expect(eventSfx({ kind: 'miss', side: 0 })).toBe('miss');
    expect(eventSfx({ kind: 'faint', side: 1 })).toBe('faint');
    expect(eventSfx({ kind: 'heal', side: 0, amount: 5, hpAfter: 20 })).toBe('heal');
    expect(eventSfx({ kind: 'status', side: 1, status: 'burn' })).toBe('status');
    expect(eventSfx({ kind: 'stat', side: 0, stat: 'attack', change: 2 })).toBe('stat-up');
    expect(eventSfx({ kind: 'stat', side: 1, stat: 'defense', change: -1 })).toBe('stat-down');
    expect(eventSfx({ kind: 'move', side: 0, moveId: 33 })).toBeNull();
  });

  it('el daño de un movimiento lo decide hitSfx; el de veneno/quemadura suena flojo', () => {
    expect(
      eventSfx({ kind: 'damage', side: 1, amount: 10, hpAfter: 5, source: 'move' }),
    ).toBeNull();
    expect(eventSfx({ kind: 'damage', side: 1, amount: 3, hpAfter: 2, source: 'burn' })).toBe(
      'hit-weak',
    );
  });
});
