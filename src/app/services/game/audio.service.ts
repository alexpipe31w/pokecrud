import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, effect, inject } from '@angular/core';
import { GameSettings, SettingsService } from './settings.service';

export type AudioBus = 'music' | 'sfx' | 'cries';

/** Crea el AudioContext. Es un token para poder pasar un doble en los tests (jsdom no tiene Web Audio). */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext>(
  'AUDIO_CONTEXT_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => new AudioContext(),
  },
);

/** Gritos decodificados que se guardan en memoria (LRU). */
export const CRY_CACHE_SIZE = 30;
const CRY_TIMEOUT_MS = 6000;
const cryUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
const sfxUrl = (name: string) => `assets/audio/sfx/${name}.ogg`;

/**
 * Efectos que existen en assets/audio/sfx/. Solo se piden esos: pedir uno que no existe deja un 404 como error
 * en la consola. Vacío hasta que F2-08 traiga los sonidos (entonces se añaden aquí sus nombres).
 */
export const SFX_CATALOG = new InjectionToken<ReadonlySet<string>>('SFX_CATALOG', {
  providedIn: 'root',
  factory: () => new Set<string>(),
});

/**
 * Audio del juego con tres buses (música, efectos, gritos) cuyo volumen sigue a SettingsService.
 * El AudioContext se crea perezosamente y se reanuda con el primer toque (política de autoplay).
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly settings = inject(SettingsService);
  private readonly createContext = inject(AUDIO_CONTEXT_FACTORY);
  private readonly sfxCatalog = inject(SFX_CATALOG);
  private ctx: AudioContext | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;

  /** Efectos: promesa memorizada por nombre (null = el archivo no existe). */
  private readonly sfx = new Map<string, Promise<AudioBuffer | null>>();
  /** Gritos: Map en orden de uso; el primero es el menos reciente. */
  private readonly cries = new Map<number, AudioBuffer>();
  private readonly pendingCries = new Map<number, Promise<AudioBuffer>>();

  constructor() {
    effect(() => this.applyVolumes(this.settings.settings()));
    inject(DOCUMENT).addEventListener('pointerdown', () => void this.unlock(), {
      once: true,
      capture: true,
    });
  }

  /** Reanuda el contexto. Se llama sola en el primer pointerdown del documento. */
  async unlock(): Promise<void> {
    const ctx = this.context();
    if (ctx.state === 'running') return;
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('[audio] no se pudo reanudar el contexto', err);
    }
  }

  /** Efecto corto (assets/audio/sfx/<name>.ogg). Si no existe, avisa una vez y sigue en silencio. */
  async playSfx(name: string): Promise<void> {
    const buffer = await this.loadSfx(name);
    if (buffer) this.play(buffer, 'sfx');
  }

  /** Grito de una especie. Nunca lanza: si falla la red resuelve false. */
  async playCry(speciesId: number): Promise<boolean> {
    try {
      this.play(await this.loadCry(speciesId), 'cries');
      return true;
    } catch (err) {
      console.warn(`[audio] no se pudo reproducir el grito #${speciesId}`, err);
      return false;
    }
  }

  private context(): AudioContext {
    if (!this.ctx) {
      const ctx = this.createContext();
      const bus = () => {
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        return gain;
      };
      this.ctx = ctx;
      this.buses = { music: bus(), sfx: bus(), cries: bus() };
      this.applyVolumes(this.settings.settings());
    }
    return this.ctx;
  }

  private applyVolumes(s: GameSettings): void {
    if (!this.buses) return;
    this.buses.music.gain.value = s.musicVolume;
    this.buses.sfx.gain.value = s.sfxVolume;
    this.buses.cries.gain.value = s.criesVolume;
  }

  private play(buffer: AudioBuffer, bus: AudioBus): void {
    const ctx = this.context();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.buses![bus]);
    source.start();
  }

  private loadSfx(name: string): Promise<AudioBuffer | null> {
    let pending = this.sfx.get(name);
    if (!pending) {
      if (!this.sfxCatalog.has(name)) {
        console.warn(`[audio] el efecto "${name}" aún no existe (llega en F2-08)`);
        pending = Promise.resolve(null);
      } else {
        pending = this.fetchBuffer(sfxUrl(name)).catch((err: unknown) => {
          console.warn(`[audio] no se pudo cargar el efecto "${name}"`, err);
          return null;
        });
      }
      this.sfx.set(name, pending);
    }
    return pending;
  }

  private async loadCry(id: number): Promise<AudioBuffer> {
    const cached = this.cries.get(id);
    if (cached) {
      this.cries.delete(id); // reinsertar = marcar como el más reciente
      this.cries.set(id, cached);
      return cached;
    }
    let pending = this.pendingCries.get(id);
    if (!pending) {
      pending = this.fetchBuffer(cryUrl(id), AbortSignal.timeout(CRY_TIMEOUT_MS));
      this.pendingCries.set(id, pending);
    }
    try {
      const buffer = await pending;
      this.cries.set(id, buffer);
      if (this.cries.size > CRY_CACHE_SIZE) {
        this.cries.delete(this.cries.keys().next().value!);
      }
      return buffer;
    } finally {
      this.pendingCries.delete(id);
    }
  }

  private async fetchBuffer(url: string, signal?: AbortSignal): Promise<AudioBuffer> {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return this.context().decodeAudioData(await res.arrayBuffer());
  }
}
