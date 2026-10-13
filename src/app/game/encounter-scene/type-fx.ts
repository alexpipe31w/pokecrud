import type { TypeName } from '@shared/data/dataset.types';

/**
 * Partículas del encuentro según el tipo principal (DISENO §5, VISION: "Fuego deja partículas, Agua salpica…",
 * F2-04b). Posición de cada partícula en función del tiempo y de 3 semillas en [0, 1): sin estado, la escena solo
 * copia el resultado al búfer de `THREE.Points` cada fotograma. Metros respecto a los pies del Pokémon.
 */
export type FxKind = 'rise' | 'fall' | 'spark' | 'orbit' | 'drift';

export const FX_KIND: Readonly<Record<TypeName, FxKind>> = {
  fire: 'rise',
  dragon: 'rise',
  fighting: 'rise',
  water: 'fall',
  ice: 'fall',
  electric: 'spark',
  steel: 'spark',
  ghost: 'orbit',
  psychic: 'orbit',
  fairy: 'orbit',
  dark: 'orbit',
  poison: 'orbit',
  grass: 'drift',
  bug: 'drift',
  flying: 'drift',
  normal: 'drift',
  ground: 'drift',
  rock: 'drift',
};

export const FX_COUNT = 60;

export interface FxPoint {
  x: number;
  y: number;
  z: number;
  /** 0..1 */
  alpha: number;
}

const TAU = Math.PI * 2;
const fract = (n: number): number => n - Math.floor(n);

/** `s0..s2`: semillas de la partícula; `t` en segundos; `radius` ≈ medio ancho del Pokémon. */
export function particleAt(
  kind: FxKind,
  s0: number,
  s1: number,
  s2: number,
  t: number,
  heightM: number,
  radius: number,
  out: FxPoint = { x: 0, y: 0, z: 0, alpha: 0 },
): FxPoint {
  const life = fract(t * (0.3 + 0.4 * s1) + s0);
  let ang: number;
  let r: number;
  switch (kind) {
    case 'rise': // brasas que suben y se apagan
      ang = s2 * TAU + t * (0.4 + s0);
      r = radius * (0.5 + 0.5 * s1) * (1 - 0.4 * life);
      out.y = life * (heightM * 1.3 + 0.3);
      out.alpha = Math.sin(Math.PI * life);
      break;
    case 'fall': // gotas que caen alrededor
      ang = s2 * TAU;
      r = radius * (0.4 + 0.8 * s1);
      out.y = (1 - life) * (heightM * 1.2 + 0.4);
      out.alpha = Math.sin(Math.PI * life);
      break;
    case 'spark': {
      // chispas que saltan de sitio 12 veces por segundo y parpadean
      const tick = Math.floor(t * 12 + s0 * 12);
      const p = fract(Math.sin((tick + 1) * (s1 * 91.7 + s2 * 47.3 + 1)) * 43758.5453);
      ang = p * TAU;
      r = radius * 0.7;
      out.y = heightM * (0.2 + 0.7 * fract(p * 7.13));
      out.alpha = fract(t * 12 + s0 * 12) < 0.3 ? 1 : 0;
      break;
    }
    case 'orbit': // luces que dan vueltas despacio
      ang = s2 * TAU + t * (0.5 + 0.5 * s1);
      r = radius * (0.8 + 0.3 * s0);
      out.y = heightM * (0.2 + 0.8 * s1) + 0.1 * Math.sin(t * 2 + s0 * 6);
      out.alpha = 0.5 + 0.5 * Math.sin(t * 3 + s2 * 6);
      break;
    case 'drift': // hojas/polvo que caen balanceándose
      ang = s2 * TAU + 0.6 * Math.sin(t + s0 * 6);
      r = radius * (0.5 + 0.7 * s1);
      out.y = (1 - life) * (heightM + 0.5);
      out.alpha = 0.8 * Math.sin(Math.PI * life);
      break;
  }
  out.x = Math.cos(ang) * r;
  out.z = Math.sin(ang) * r;
  return out;
}
