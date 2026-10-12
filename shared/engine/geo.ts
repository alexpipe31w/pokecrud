/**
 * Geometría para distancias cortas (< 2 km) en el mapa: aproximación equirectangular, la misma que usa el servidor
 * en `server/src/location/location.service.ts` (error despreciable a esas distancias). `east`/`north` en metros.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocalM {
  east: number;
  north: number;
}

export const M_PER_DEG_LAT = 111_320;

const mPerDegLng = (lat: number): number => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

export function toLocalM(origin: LatLng, p: LatLng): LocalM {
  return {
    east: (p.lng - origin.lng) * mPerDegLng((origin.lat + p.lat) / 2),
    north: (p.lat - origin.lat) * M_PER_DEG_LAT,
  };
}

export function fromLocalM(origin: LatLng, east: number, north: number): LatLng {
  const lat = origin.lat + north / M_PER_DEG_LAT;
  return { lat, lng: origin.lng + east / mPerDegLng((origin.lat + lat) / 2) };
}

export function distanceM(a: LatLng, b: LatLng): number {
  const { east, north } = toLocalM(a, b);
  return Math.hypot(east, north);
}

/** Rumbo de `a` hacia `b` en grados: 0 = norte, 90 = este (sentido horario). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const { east, north } = toLocalM(a, b);
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
}
