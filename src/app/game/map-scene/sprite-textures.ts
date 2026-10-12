import * as THREE from 'three';

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
/** Orden de prueba (CLAUDE.md: no todas las especies tienen todos los sprites). */
export const spriteUrls = (id: number): string[] => [
  `${SPRITES}/other/home/${id}.png`,
  `${SPRITES}/other/official-artwork/${id}.png`,
  `${SPRITES}/${id}.png`,
];
/** Texturas sin usar que se guardan por si vuelve la especie (las que están en uso nunca se tiran). */
export const MAX_IDLE_TEXTURES = 40;

export type ImageLoad = (url: string) => Promise<TexImageSource>;

const defaultLoad: ImageLoad = (url) =>
  new THREE.ImageLoader().setCrossOrigin('anonymous').loadAsync(url);

interface Entry {
  texture: THREE.Texture;
  refs: number;
  /** Para elegir qué textura sin usar se tira primero (la que lleva más tiempo sin usarse). */
  releasedAt: number;
}

/**
 * Texturas de los sprites del mapa, una por especie y compartidas entre sprites (F1-07). `acquire` devuelve la textura
 * al momento (vacía hasta que llega la imagen) y `release` la suelta; solo se liberan de la GPU las que nadie usa,
 * y de esas se guardan las `MAX_IDLE_TEXTURES` más recientes.
 */
export class SpriteTextures {
  private readonly entries = new Map<number, Entry>();
  private clock = 0;

  constructor(private readonly load: ImageLoad = defaultLoad) {}

  acquire(speciesId: number): THREE.Texture {
    let e = this.entries.get(speciesId);
    if (!e) {
      const texture = new THREE.Texture();
      texture.colorSpace = THREE.SRGBColorSpace;
      e = { texture, refs: 0, releasedAt: 0 };
      this.entries.set(speciesId, e);
      void this.fill(speciesId, texture);
    }
    e.refs++;
    return e.texture;
  }

  release(speciesId: number): void {
    const e = this.entries.get(speciesId);
    if (!e || e.refs === 0) return;
    e.refs--;
    if (e.refs === 0) {
      e.releasedAt = ++this.clock;
      this.evictIdle();
    }
  }

  /** Cuántas texturas hay en memoria (en uso + sin usar). */
  get size(): number {
    return this.entries.size;
  }

  dispose(): void {
    for (const e of this.entries.values()) e.texture.dispose();
    this.entries.clear();
  }

  private evictIdle(): void {
    const idle = [...this.entries]
      .filter(([, e]) => e.refs === 0)
      .sort((a, b) => a[1].releasedAt - b[1].releasedAt);
    for (const [id, e] of idle.slice(0, Math.max(0, idle.length - MAX_IDLE_TEXTURES))) {
      e.texture.dispose();
      this.entries.delete(id);
    }
  }

  private async fill(speciesId: number, texture: THREE.Texture): Promise<void> {
    for (const url of spriteUrls(speciesId)) {
      try {
        texture.image = await this.load(url);
        texture.needsUpdate = true;
        return;
      } catch {
        // Esa variante no existe para esta especie: se prueba la siguiente.
      }
    }
    console.warn('[mapa] sin sprite para la especie', speciesId);
    const fallback = questionMark();
    if (fallback) {
      texture.image = fallback;
      texture.needsUpdate = true;
    }
  }
}

/** Un círculo con "?" cuando no hay ningún sprite (sin DOM —tests— no hay dibujo). */
function questionMark(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = 'rgba(15, 26, 43, 0.75)';
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 80px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 64, 70);
  return c;
}
