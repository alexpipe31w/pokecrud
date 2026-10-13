/**
 * Tamaño y sitio del Pokémon en la escena del encuentro (F2-04a, D-045). Metros; la cámara (el móvil) está en el
 * origen y el suelo a −EYE_HEIGHT_M.
 */

/** Altura a la que se sostiene el móvil: el suelo está a esta distancia por debajo de la cámara. */
export const EYE_HEIGHT_M = 1.4;
/** `heightScale` del servidor va de 0,5 a 1,5 (D-028): por debajo de esto es XS y por encima XL. */
export const XS_MAX = 0.6;
export const XL_MIN = 1.4;
const MIN_HEIGHT_M = 0.1;
const MIN_DISTANCE_M = 2;
/** Los enormes no caben (VISION: "un Wailord no cabe en la pantalla"): no se alejan más de esto. */
const MAX_DISTANCE_M = 12;

/** Altura real en metros: la de PokéAPI (decímetros) por la variación individual. */
export const pokemonHeightM = (heightDm: number, heightScale: number): number =>
  Math.max(MIN_HEIGHT_M, (heightDm / 10) * heightScale);

/** Distancia a la que aparece: que quepa pero se note el tamaño (los pequeños a 2 m, los grandes más lejos). */
export const encounterDistance = (heightM: number): number =>
  Math.min(MAX_DISTANCE_M, Math.max(MIN_DISTANCE_M, heightM * 1.8));

export function sizeClass(heightScale: number): 'XS' | 'XL' | null {
  if (heightScale < XS_MAX) return 'XS';
  if (heightScale > XL_MIN) return 'XL';
  return null;
}

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Arte grande con el orden de prueba de CLAUDE.md (no todas las especies tienen todos), en shiny si toca. */
export function artUrls(id: number, shiny: boolean): string[] {
  const s = shiny ? '/shiny' : '';
  return [
    `${SPRITES}/other/home${s}/${id}.png`,
    `${SPRITES}/other/official-artwork${s}/${id}.png`,
    `${SPRITES}${s}/${id}.png`,
  ];
}
