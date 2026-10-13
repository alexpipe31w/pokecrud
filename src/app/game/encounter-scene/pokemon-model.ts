import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Modelos 3D de los Pokémon (F2-12, D-048): `.glb` de `github.com/Pokemon-3D-api/assets` (Draco + WebP), cargados desde
 * su URL. Son © Nintendo/Creatures/GAME FREAK: NO se suben a nuestro repo (proyecto académico sin publicar, D-010).
 * No todas las especies tienen (968 de 1025 el 12-10-2026) y shiny solo unas 150: sin modelo, el encuentro usa el arte
 * plano de F2-04a.
 */
const MODELS = 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt';

/** Algunos pesan hasta 14 MB: con datos lentos mejor el arte plano que esperar para siempre. */
export const MODEL_TIMEOUT_MS = 20_000;

export interface PokemonModel {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
}

/** Lo que se usa de `GLTFLoader` (para los tests). */
export interface ModelLoaderLike {
  loadAsync(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>;
}

export const modelUrl = (id: number, shiny: boolean): string =>
  `${MODELS}/${shiny ? 'shiny' : 'regular'}/${id}.glb`;

/**
 * Modelo del Pokémon, o null si no hay (o no carga a tiempo). Un shiny solo usa su modelo shiny: si no existe, el
 * arte plano shiny enseña los colores correctos, que es lo que el jugador tiene que ver.
 */
export async function loadPokemonModel(
  id: number,
  shiny: boolean,
  loader: ModelLoaderLike = defaultLoader(),
): Promise<PokemonModel | null> {
  const url = modelUrl(id, shiny);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const gltf = await Promise.race([
      loader.loadAsync(url),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), MODEL_TIMEOUT_MS);
      }),
    ]);
    return { scene: gltf.scene, clips: gltf.animations };
  } catch (err) {
    // 404 = esa especie no tiene modelo (normal); el resto, red o modelo roto.
    console.warn('[modelo 3D] sin modelo, se usa el arte plano', { id, shiny, err: String(err) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let shared: GLTFLoader | null = null;

/** Un solo `GLTFLoader` con Draco; el decodificador lo sirve la app (`assets/draco/`, copiado por `angular.json`). */
function defaultLoader(): GLTFLoader {
  if (!shared) {
    const draco = new DRACOLoader().setDecoderPath(new URL('assets/draco/', document.baseURI).href);
    shared = new GLTFLoader().setCrossOrigin('anonymous').setDRACOLoader(draco);
  }
  return shared;
}
