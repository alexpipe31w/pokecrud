import { MAX_DRAWN, diffSpawns, nearestN } from './spawn-diff';

const s = (id: string, lat: number, lng: number) => ({ id, speciesId: 1, lat, lng });
const O = { lat: 2.9273, lng: -75.2819 };

describe('spawn-diff', () => {
  it('detecta los nuevos y los que ya no están; los que siguen no se tocan', () => {
    const d = diffSpawns(new Set(['a', 'b']), [s('b', 0, 0), s('c', 0, 0)]);
    expect(d.added.map((x) => x.id)).toEqual(['c']);
    expect(d.removed).toEqual(['a']);
  });

  it('nearestN se queda con los N más cercanos al origen, en orden', () => {
    const list = [
      s('lejos', O.lat + 0.001, O.lng),
      s('cerca', O.lat + 0.0001, O.lng),
      s('medio', O.lat + 0.0005, O.lng),
    ];
    expect(nearestN(list, O, 2).map((x) => x.id)).toEqual(['cerca', 'medio']);
  });

  it(`por defecto dibuja como mucho ${MAX_DRAWN} (D-035)`, () => {
    const list = Array.from({ length: 50 }, (_, i) => s(`p${i}`, O.lat + i * 1e-5, O.lng));
    expect(nearestN(list, O)).toHaveLength(MAX_DRAWN);
  });
});
