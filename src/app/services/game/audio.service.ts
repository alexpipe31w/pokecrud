import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { GameSettings, SettingsService } from './settings.service';
import { type MusicTrack, SONGS } from './music-songs';
import { renderSong } from './music-synth';
import { SFX_RECIPES, isSfxName, renderSfx } from './sfx-synth';

export type AudioBus = 'music' | 'sfx' | 'cries';

/** Crea el AudioContext. Es un token para poder pasar un doble en los tests (jsdom no tiene Web Audio). */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext>(
  'AUDIO_CONTEXT_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => new AudioContext(),
  },
);

/** Fundido al entrar o salir un tema (s). */
export const MUSIC_FADE_S = 0.8;
/** La música se genera a media frecuencia: la mitad de memoria y de trabajo, y para un bucle de fondo sobra. */
export const MUSIC_RATE = 22_050;

export type MusicRenderer = (track: MusicTrack, sampleRate: number) => Promise<Float32Array>;

/**
 * Genera un tema (F2-10). Por defecto en un Web Worker (en un móvil de gama media tarda más de un segundo y congelaría
 * la pantalla); sin workers (tests) o si el worker falla, aquí mismo.
 */
export const MUSIC_RENDERER = new InjectionToken<MusicRenderer>('MUSIC_RENDERER', {
  providedIn: 'root',
  factory: () => workerRenderer(),
});

function workerRenderer(): MusicRenderer {
  const inline: MusicRenderer = (track, rate) => Promise.resolve(renderSong(SONGS[track], rate));
  if (typeof Worker === 'undefined') return inline;
  let worker: Worker | null = null;
  let seq = 0;
  const waiting = new Map<number, (x: Float32Array) => void>();
  return (track, rate) => {
    try {
      if (!worker) {
        worker = new Worker(new URL('./music.worker', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }: MessageEvent<{ id: number; samples: Float32Array }>) => {
          waiting.get(data.id)?.(data.samples);
          waiting.delete(data.id);
        };
      }
      const id = ++seq;
      const w = worker;
      return new Promise<Float32Array>((resolve) => {
        waiting.set(id, resolve);
        w.onerror = (err) => {
          console.warn('[audio] el worker de música falló; se genera aquí', err);
          for (const [pendingId] of waiting) waiting.delete(pendingId);
          worker = null;
          void inline(track, rate).then(resolve);
        };
        w.postMessage({ id, track, rate });
      });
    } catch (err) {
      console.warn('[audio] sin worker de música; se genera aquí', err);
      return inline(track, rate);
    }
  };
}

/** Gritos decodificados que se guardan en memoria (LRU). */
export const CRY_CACHE_SIZE = 30;
const CRY_TIMEOUT_MS = 6000;
/**
 * La precarga no bloquea a nadie: puede esperar más. Con datos móviles un grito tardó > 6 s y no sonó en el primer
 * combate (Kenneth, Samsung A36): precargando al empezar el combate ya está listo cuando toca.
 */
const CRY_PRELOAD_TIMEOUT_MS = 20_000;
const cryUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`;
const sfxUrl = (name: string) => `assets/audio/sfx/${name}.ogg`;

/**
 * Efectos en ARCHIVO que existen en assets/audio/sfx/ (pedir uno que no existe deja un 404 en la consola). Los
 * efectos del juego se GENERAN (`sfx-synth.ts`, F2-08): este catálogo queda para sonidos grabados que lleguen más tarde.
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
  private readonly renderMusic = inject(MUSIC_RENDERER);
  private ctx: AudioContext | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;

  /** Efectos: promesa memorizada por nombre (null = el archivo no existe). */
  private readonly sfx = new Map<string, Promise<AudioBuffer | null>>();
  /** Gritos: Map en orden de uso; el primero es el menos reciente. */
  private readonly cries = new Map<number, AudioBuffer>();
  private readonly pendingCries = new Map<number, Promise<AudioBuffer>>();

  /** Tema que se ha pedido (o null = silencio). Solo uno a la vez (F2-10). */
  readonly music = signal<MusicTrack | null>(null);
  private playing: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private readonly musicBuffers = new Map<MusicTrack, Promise<AudioBuffer>>();
  /** Si el audio sonaba al pasar a segundo plano (para reanudarlo al volver). */
  private wasRunning = false;

  constructor() {
    effect(() => this.applyVolumes(this.settings.settings()));
    const doc = inject(DOCUMENT);
    doc.addEventListener('pointerdown', () => void this.unlock(), {
      once: true,
      capture: true,
    });
    // En segundo plano (otra app, pantalla apagada) nada suena; al volver sigue donde iba.
    doc.addEventListener('visibilitychange', () => {
      const ctx = this.ctx;
      if (!ctx) return;
      // Si el contexto no sabe suspender/reanudar (WebViews viejos, dobles de prueba), se sigue como estaba.
      try {
        if (doc.hidden) {
          this.wasRunning = ctx.state === 'running';
          if (typeof ctx.suspend === 'function') void ctx.suspend().catch(() => undefined);
        } else if (this.wasRunning && typeof ctx.resume === 'function') {
          void ctx.resume().catch(() => undefined);
        }
      } catch (err) {
        console.warn('[audio] no se pudo pausar/reanudar en segundo plano', err);
      }
    });
  }

  /**
   * Música de fondo en bucle (F2-10): `null` = silencio. El tema anterior se funde y se para mientras entra el nuevo
   * (nunca dos a la vez); pedir el que ya suena no lo reinicia. Nunca lanza.
   */
  async playMusic(track: MusicTrack | null): Promise<void> {
    if (track === this.music()) return;
    this.music.set(track);
    this.fadeOutMusic();
    if (!track) return;
    let buffer: AudioBuffer;
    try {
      buffer = await this.musicBuffer(track);
    } catch (err) {
      console.warn(`[audio] no se pudo preparar la música "${track}"`, err);
      return;
    }
    // Mientras se generaba se pidió otro tema (o silencio): este ya no suena.
    if (this.music() !== track || this.playing) return;
    const ctx = this.context();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + MUSIC_FADE_S);
    source.connect(gain);
    gain.connect(this.buses!.music);
    source.start();
    this.playing = { source, gain };
  }

  private fadeOutMusic(): void {
    const current = this.playing;
    if (!current || !this.ctx) return;
    const now = this.ctx.currentTime;
    const g = current.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + MUSIC_FADE_S);
    current.source.stop(now + MUSIC_FADE_S);
    this.playing = null;
  }

  /** Cada tema se genera una vez (unos 2 MB) y se guarda para volver a él sin esperar. */
  private musicBuffer(track: MusicTrack): Promise<AudioBuffer> {
    let pending = this.musicBuffers.get(track);
    if (!pending) {
      pending = this.renderMusic(track, MUSIC_RATE).then((samples) => {
        const buffer = this.context().createBuffer(1, samples.length, MUSIC_RATE);
        buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
        return buffer;
      });
      pending.catch(() => this.musicBuffers.delete(track));
      this.musicBuffers.set(track, pending);
    }
    return pending;
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

  /**
   * Descarga y decodifica estos gritos ya, sin sonar, con más margen de tiempo que al reproducir. Para cuando se sabe
   * qué va a sonar (al empezar un combate). Nunca lanza.
   */
  preloadCries(speciesIds: readonly number[]): void {
    for (const id of new Set(speciesIds)) {
      if (this.cries.has(id) || this.pendingCries.has(id)) continue;
      this.loadCry(id, CRY_PRELOAD_TIMEOUT_MS).catch((err: unknown) =>
        console.warn(`[audio] no se pudo precargar el grito #${id}`, err),
      );
    }
  }

  /**
   * Grito de una especie. Nunca lanza: si falla la red resuelve false. `gain` (0..1) baja este grito en concreto
   * sobre el volumen de gritos de los ajustes (p. ej. un Pokémon lejano en el mapa, F1-07).
   */
  async playCry(speciesId: number, gain = 1): Promise<boolean> {
    try {
      this.play(await this.loadCry(speciesId), 'cries', gain);
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

  private play(buffer: AudioBuffer, bus: AudioBus, gain = 1): void {
    const ctx = this.context();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (gain === 1) source.connect(this.buses![bus]);
    else {
      const local = ctx.createGain();
      local.gain.value = gain;
      local.connect(this.buses![bus]);
      source.connect(local);
    }
    source.start();
  }

  private loadSfx(name: string): Promise<AudioBuffer | null> {
    let pending = this.sfx.get(name);
    if (!pending) {
      if (isSfxName(name)) {
        pending = Promise.resolve(this.synth(name));
      } else if (!this.sfxCatalog.has(name)) {
        console.warn(`[audio] el efecto "${name}" no existe`);
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

  /** Efecto generado: se calcula una vez por nombre y se guarda (son unos pocos KB cada uno). */
  private synth(name: keyof typeof SFX_RECIPES): AudioBuffer {
    const ctx = this.context();
    const samples = renderSfx(SFX_RECIPES[name], ctx.sampleRate);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    return buffer;
  }

  private async loadCry(id: number, timeoutMs = CRY_TIMEOUT_MS): Promise<AudioBuffer> {
    const cached = this.cries.get(id);
    if (cached) {
      this.cries.delete(id); // reinsertar = marcar como el más reciente
      this.cries.set(id, cached);
      return cached;
    }
    let pending = this.pendingCries.get(id);
    if (!pending) {
      pending = this.fetchBuffer(cryUrl(id), AbortSignal.timeout(timeoutMs));
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
