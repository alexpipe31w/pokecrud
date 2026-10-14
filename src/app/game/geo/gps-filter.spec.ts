import { fromLocalM, toLocalM } from '@shared/engine/geo';
import { GpsFilter, type GpsFix } from './gps-filter';

const O = { lat: 2.9273, lng: -75.2819 };
const fix = (east: number, north: number, t: number, accuracy = 5): GpsFix => ({
  ...fromLocalM(O, east, north),
  accuracy,
  timestamp: t,
});

describe('GpsFilter', () => {
  it('el primer fix pasa tal cual', () => {
    const out = new GpsFilter().push(fix(0, 0, 1000))!;
    expect(out.lat).toBeCloseTo(O.lat, 9);
    expect(out.weak).toBe(false);
  });

  it('un primer fix malo (80 m) se acepta pero marcado como débil', () => {
    expect(new GpsFilter().push(fix(0, 0, 1000, 80))!.weak).toBe(true);
  });

  it('con un fix bueno ya, uno de precisión > 50 m se ignora', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000));
    expect(f.push(fix(30, 0, 3000, 60))).toBeNull();
  });

  it('descarta un salto de 120 m en 1 s y acepta el mismo sitio 2 s después', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000));
    expect(f.push(fix(120, 0, 2000))).toBeNull();
    expect(f.push(fix(120, 0, 3000))).not.toBeNull();
  });

  it('ignora fixes con hora repetida o anterior', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 5000));
    expect(f.push(fix(1, 0, 5000))).toBeNull();
    expect(f.push(fix(1, 0, 4000))).toBeNull();
  });

  it('suaviza ruido de ±6 m alrededor del mismo punto (queda a < 3 m)', () => {
    const f = new GpsFilter();
    let out = null;
    for (let i = 0; i < 8; i++) out = f.push(fix(i % 2 ? 6 : -6, 0, 1000 + i * 1000));
    expect(Math.abs(toLocalM(O, out!).east)).toBeLessThan(3);
  });

  it('pondera por precisión: un fix de 4 m pesa más que uno de 20 m', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000, 20));
    const out = f.push(fix(10, 0, 2000, 4))!;
    expect(toLocalM(O, out).east).toBeGreaterThan(9);
  });
});
