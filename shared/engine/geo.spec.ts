import { bearingDeg, distanceM, fromLocalM, toLocalM } from './geo.js';

const NEIVA = { lat: 2.9273, lng: -75.2819 };

describe('geo', () => {
  it('distanceM: 0,001° de latitud ≈ 111,32 m', () => {
    expect(distanceM(NEIVA, { lat: NEIVA.lat + 0.001, lng: NEIVA.lng })).toBeCloseTo(111.32, 1);
  });

  it('distanceM: igual que el servidor (equirectangular) en longitud', () => {
    const p = { lat: NEIVA.lat, lng: NEIVA.lng + 0.001 };
    expect(distanceM(NEIVA, p)).toBeCloseTo(111.32 * Math.cos((NEIVA.lat * Math.PI) / 180), 1);
  });

  it('toLocalM / fromLocalM son inversas', () => {
    const p = fromLocalM(NEIVA, 120, -35);
    const back = toLocalM(NEIVA, p);
    expect(back.east).toBeCloseTo(120, 6);
    expect(back.north).toBeCloseTo(-35, 6);
  });

  it('bearingDeg: norte 0, este 90, sur 180, oeste 270', () => {
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 0, 10))).toBeCloseTo(0, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 10, 0))).toBeCloseTo(90, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 0, -10))).toBeCloseTo(180, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, -10, 0))).toBeCloseTo(270, 6);
  });
});
