import * as THREE from 'three';

import { SPRITE_M, type PokemonVisual } from './spawn-layer';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
/** Orden de prueba (CLAUDE.md: no todas las especies tienen todos los sprites). */
export const spriteUrls = (id: number): string[] => [
  `${SPRITES}/other/home/${id}.png`,
  `${SPRITES}/other/official-artwork/${id}.png`,
  `${SPRITES}/${id}.png`,
];

const v = new THREE.Vector4();

/**
 * Metros locales de la escena → píxeles CSS del elemento del mapa, con la matriz de `ThreeJSOverlayView`
 * (`camera.projectionMatrix` ya es modelo-vista-proyección desde el ancla). null si queda detrás de la cámara.
 */
export function projectToScreen(
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): { x: number; y: number } | null {
  v.set(x, y, z, 1).applyMatrix4(m);
  if (v.w <= 0) return null;
  return { x: ((v.x / v.w + 1) / 2) * width, y: ((1 - v.y / v.w) / 2) * height };
}

interface Item {
  img: HTMLImageElement;
  speciesId: number;
}

/**
 * Pokémon del mapa pintados en HTML por ENCIMA del mapa (D-042): Google dibuja sus edificios 3D después de la capa
 * three.js y los tapaba. Cada fotograma (`render`, desde `onBeforeDraw` del overlay: la matriz es la de ESE
 * fotograma) se proyecta la base y la cabeza del Pokémon y se coloca su `<img>` solo con `transform` y `opacity`
 * (lo compone la GPU, sin relayout). Los más cercanos quedan delante (`z-index` por altura en pantalla).
 * Tocar una imagen llama a `onTap(id)`.
 */
export class PokemonDom {
  private readonly items = new Map<string, Item>();

  constructor(
    private readonly container: HTMLElement,
    private readonly onTap: (id: string) => void,
  ) {}

  render(visuals: readonly PokemonVisual[], m: THREE.Matrix4, width: number, height: number): void {
    const seen = new Set<string>();
    for (const p of visuals) {
      seen.add(p.id);
      const item = this.items.get(p.id) ?? this.create(p);
      const base = projectToScreen(m, p.x, p.y, p.z, width, height);
      const head = projectToScreen(m, p.x, p.y + SPRITE_M * p.scale, p.z, width, height);
      const s = item.img.style;
      if (!base || !head || p.opacity <= 0.01) {
        s.visibility = 'hidden';
        continue;
      }
      const size = Math.max(1, Math.hypot(head.x - base.x, head.y - base.y));
      s.visibility = 'visible';
      s.width = s.height = '100px'; // tamaño fijo: lo que cambia es la escala (sin relayout)
      s.transform = `translate3d(${base.x - size / 2}px, ${base.y - size}px, 0) scale(${size / 100})`;
      s.opacity = String(p.opacity);
      s.zIndex = String(Math.round(base.y));
    }
    for (const [id, item] of this.items) {
      if (!seen.has(id)) {
        item.img.remove();
        this.items.delete(id);
      }
    }
  }

  /** Sin la capa 3D (fuera del mapa, segundo plano): que no se queden flotando. */
  hideAll(): void {
    for (const { img } of this.items.values()) img.style.visibility = 'hidden';
  }

  dispose(): void {
    for (const { img } of this.items.values()) img.remove();
    this.items.clear();
  }

  private create(p: PokemonVisual): Item {
    const img = document.createElement('img');
    img.className = 'pokemon';
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    img.dataset['spawnId'] = p.id;
    const urls = spriteUrls(p.speciesId);
    let next = 0;
    img.onerror = () => {
      next++;
      if (next < urls.length) img.src = urls[next];
      else {
        console.warn('[mapa] sin sprite para la especie', p.speciesId);
        img.onerror = null;
      }
    };
    img.src = urls[0];
    img.addEventListener('click', () => this.onTap(p.id));
    const s = img.style;
    s.position = 'absolute';
    s.left = s.top = '0';
    s.transformOrigin = '0 0';
    s.willChange = 'transform, opacity';
    s.visibility = 'hidden';
    s.pointerEvents = 'auto';
    s.touchAction = 'manipulation';
    s.userSelect = 'none';
    s.setProperty('-webkit-user-select', 'none');
    s.setProperty('-webkit-tap-highlight-color', 'transparent');
    this.container.appendChild(img);
    const item = { img, speciesId: p.speciesId };
    this.items.set(p.id, item);
    return item;
  }
}
