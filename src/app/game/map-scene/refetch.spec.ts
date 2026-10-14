import { fromLocalM } from '@shared/engine/geo';

import { REFETCH_MOVE_M, backoffMs, shouldRefetch, type FetchState } from './refetch';

const O = { lat: 2.9273, lng: -75.2819 };
const base: FetchState = {
  inFlight: false,
  lastAt: 100_000,
  lastPos: O,
  expiresAt: 400_000,
  failures: 0,
};

describe('shouldRefetch', () => {
  it('la primera vez, sí', () =>
    expect(shouldRefetch({ ...base, lastAt: null, lastPos: null }, 0, O)).toBe(true));

  it('nunca con una petición en vuelo', () =>
    expect(shouldRefetch({ ...base, inFlight: true, lastAt: null }, 0, O)).toBe(false));

  it('quieto y dentro de la franja, no', () => expect(shouldRefetch(base, 200_000, O)).toBe(false));

  it('al acabar la franja, sí aunque haga poco de la última', () =>
    expect(shouldRefetch({ ...base, lastAt: 399_000 }, 401_001, O)).toBe(true));

  it(`moverse más de ${REFETCH_MOVE_M} m, sí; pero no antes de 8 s`, () => {
    const far = fromLocalM(O, REFETCH_MOVE_M + 1, 0);
    expect(shouldRefetch(base, 107_000, far)).toBe(false);
    expect(shouldRefetch(base, 108_001, far)).toBe(true);
  });

  it('tras 2 fallos espera 10 s', () => {
    const s = { ...base, lastAt: null, lastPos: null, failures: 2, lastAttemptAt: 100_000 };
    expect(shouldRefetch(s, 109_000, O)).toBe(false);
    expect(shouldRefetch(s, 110_001, O)).toBe(true);
  });

  it('la espera tras fallar crece 5 → 10 → 20 s y no pasa de 60 s', () => {
    expect([1, 2, 3, 10].map(backoffMs)).toEqual([5_000, 10_000, 20_000, 60_000]);
  });
});
