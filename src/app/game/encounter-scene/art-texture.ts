import * as THREE from 'three';

/** Lo que se usa de `THREE.TextureLoader` (para los tests). */
export interface TextureLoaderLike {
  loadAsync(url: string): Promise<THREE.Texture>;
}

/**
 * Primera textura que cargue de la lista (`artUrls`: home → official-artwork → normal; no todas las especies tienen
 * todas). null si no carga ninguna: la escena enseña la silueta de "?" y el encuentro sigue.
 */
export async function loadFirstTexture(
  urls: readonly string[],
  loader: TextureLoaderLike = new THREE.TextureLoader().setCrossOrigin('anonymous'),
): Promise<THREE.Texture | null> {
  for (const url of urls) {
    try {
      const tex = await loader.loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      // siguiente
    }
  }
  return null;
}
