import * as THREE from 'three';

/** Briznas por mata: muchas y finas para que parezca hierba de verdad y no cuatro conos (F1-07, pedido de Alex). */
export const BLADES_PER_TUFT = 40;
/** Radio de la mata alrededor del Pokémon (más densa en el centro). */
export const TUFT_RADIUS_M = 5;
/** Exagerado como el sprite: a zoom 19 un metro son ~3 px y una hierba "real" de 30 cm no se vería. */
export const HEIGHT_M: [number, number] = [2.6, 5.5];
const WIDTH_M: [number, number] = [0.5, 0.9];
/** Verdes de la hierba (de seco a jugoso): cada brizna coge uno y lo varía un poco. */
const GREENS = [0x3f8f3a, 0x4fae45, 0x66c25a, 0x2f7a35];

export interface BladeSpec {
  /** Posición respecto al centro de la mata (m). */
  dx: number;
  dz: number;
  yaw: number;
  /** Inclinación en reposo (rad). */
  lean: number;
  height: number;
  width: number;
  color: THREE.Color;
  /** Desfase del balanceo. */
  sway: number;
}

/** Briznas de una mata: deterministas por `seed` (la misma mata no cambia al volver a sincronizar). */
export function tuftBlades(seed: number): BladeSpec[] {
  let s = seed >>> 0 || 1;
  const rnd = (): number => {
    // xorshift32: barato y suficiente para repartir hierba
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  const lerp = ([a, b]: [number, number], k: number): number => a + (b - a) * k;
  return Array.from({ length: BLADES_PER_TUFT }, () => {
    const angle = rnd() * Math.PI * 2;
    // rnd² concentra las briznas en el centro: mata tupida que se abre hacia fuera.
    const r = rnd() ** 2 * TUFT_RADIUS_M + 0.4;
    const color = new THREE.Color(GREENS[Math.floor(rnd() * GREENS.length)]);
    color.offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
    return {
      dx: Math.cos(angle) * r,
      dz: Math.sin(angle) * r,
      yaw: rnd() * Math.PI * 2,
      lean: (rnd() - 0.5) * 0.5 + (r / TUFT_RADIUS_M) * 0.35, // las de fuera se abren hacia fuera
      height: lerp(HEIGHT_M, rnd()) * (1 - 0.35 * (r / TUFT_RADIUS_M)),
      width: lerp(WIDTH_M, rnd()),
      color,
      sway: rnd() * Math.PI * 2,
    };
  });
}

/**
 * Una brizna de 1 m de alto y 1 m de ancho en la base (se escala por instancia): hoja que se estrecha hasta la punta
 * y se curva un poco hacia delante, más oscura abajo que arriba (colores de vértice × color de la instancia).
 */
export function bladeGeometry(): THREE.BufferGeometry {
  const rows = [
    { h: 0, w: 0.5, c: 0.55 },
    { h: 0.35, w: 0.42, c: 0.75 },
    { h: 0.7, w: 0.25, c: 0.92 },
  ];
  const pos: number[] = [];
  const col: number[] = [];
  const bend = (h: number): number => 0.18 * h * h;
  for (const r of rows) {
    pos.push(-r.w, r.h, bend(r.h), r.w, r.h, bend(r.h));
    col.push(r.c, r.c, r.c, r.c, r.c, r.c);
  }
  pos.push(0, 1, bend(1)); // punta
  col.push(1, 1, 1);
  const index = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
