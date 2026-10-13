/**
 * Efectos de sonido generados en el propio juego (F2-08, D-044): cada efecto es una receta de "voces" (un tono con
 * barrido de frecuencia o ruido, con su envolvente) que se convierte en muestras al vuelo. Sin archivos que
 * descargar (con datos móviles el primer sonido no llegaba a tiempo) y sin licencias de terceros: son nuestros.
 */

export type Wave = 'sine' | 'square' | 'triangle' | 'saw' | 'noise';

export interface Voice {
  wave: Wave;
  /** Frecuencia al empezar y al acabar (Hz; barrido exponencial). En `noise`, el corte del filtro paso bajo. */
  from: number;
  to: number;
  /** Segundos. */
  start: number;
  duration: number;
  /** Volumen máximo (0..1). */
  gain: number;
  /** Subida inicial (s); el resto cae exponencialmente. */
  attack?: number;
}

/** Los efectos del juego. Las claves son los nombres que se piden con `AudioService.playSfx`. */
export const SFX_RECIPES = {
  /** Toque de botón: un "tic" corto y suave. */
  tap: [
    { wave: 'sine', from: 1100, to: 700, start: 0, duration: 0.045, gain: 0.25, attack: 0.002 },
  ],
  /** Golpe normal: ruido seco + un golpe grave. */
  hit: [
    { wave: 'noise', from: 2600, to: 900, start: 0, duration: 0.12, gain: 0.45, attack: 0.002 },
    { wave: 'sine', from: 180, to: 55, start: 0, duration: 0.18, gain: 0.6, attack: 0.003 },
  ],
  /** Muy eficaz: más fuerte, con un chasquido agudo. */
  'hit-super': [
    { wave: 'noise', from: 5000, to: 1200, start: 0, duration: 0.16, gain: 0.55, attack: 0.001 },
    { wave: 'sine', from: 220, to: 45, start: 0, duration: 0.26, gain: 0.75, attack: 0.002 },
    { wave: 'square', from: 1400, to: 900, start: 0.02, duration: 0.08, gain: 0.12 },
  ],
  /** Poco eficaz: apagado y flojo. */
  'hit-weak': [
    { wave: 'noise', from: 900, to: 400, start: 0, duration: 0.09, gain: 0.3, attack: 0.004 },
    { wave: 'sine', from: 140, to: 80, start: 0, duration: 0.12, gain: 0.35, attack: 0.004 },
  ],
  /** Golpe crítico: golpe fuerte + destello que sube. */
  'hit-crit': [
    { wave: 'noise', from: 6000, to: 1500, start: 0, duration: 0.15, gain: 0.55, attack: 0.001 },
    { wave: 'sine', from: 240, to: 50, start: 0, duration: 0.24, gain: 0.7, attack: 0.002 },
    {
      wave: 'triangle',
      from: 1200,
      to: 2600,
      start: 0.05,
      duration: 0.22,
      gain: 0.25,
      attack: 0.01,
    },
  ],
  /** Fallo: un "fiu" de aire. */
  miss: [
    { wave: 'noise', from: 600, to: 3500, start: 0, duration: 0.22, gain: 0.25, attack: 0.08 },
  ],
  /** Debilitado: tono que cae despacio. */
  faint: [
    { wave: 'triangle', from: 620, to: 110, start: 0, duration: 0.75, gain: 0.35, attack: 0.02 },
    { wave: 'sine', from: 310, to: 55, start: 0.05, duration: 0.8, gain: 0.25, attack: 0.02 },
  ],
  /** Curación: dos notas que suben, suaves. */
  heal: [
    { wave: 'sine', from: 660, to: 660, start: 0, duration: 0.18, gain: 0.25, attack: 0.02 },
    { wave: 'sine', from: 990, to: 990, start: 0.12, duration: 0.3, gain: 0.25, attack: 0.02 },
  ],
  /** Sube una estadística. */
  'stat-up': [
    { wave: 'square', from: 400, to: 1200, start: 0, duration: 0.3, gain: 0.12, attack: 0.01 },
  ],
  /** Baja una estadística. */
  'stat-down': [
    { wave: 'square', from: 1000, to: 300, start: 0, duration: 0.3, gain: 0.12, attack: 0.01 },
  ],
  /** Le cae un estado (quemado, paralizado…): zumbido raro. */
  status: [
    { wave: 'saw', from: 300, to: 260, start: 0, duration: 0.35, gain: 0.12, attack: 0.02 },
    { wave: 'saw', from: 307, to: 266, start: 0, duration: 0.35, gain: 0.12, attack: 0.02 },
  ],
  /** Victoria: arpegio Do-Mi-Sol-Do. */
  victory: [
    { wave: 'square', from: 523, to: 523, start: 0, duration: 0.14, gain: 0.14 },
    { wave: 'square', from: 659, to: 659, start: 0.13, duration: 0.14, gain: 0.14 },
    { wave: 'square', from: 784, to: 784, start: 0.26, duration: 0.14, gain: 0.14 },
    { wave: 'square', from: 1047, to: 1047, start: 0.39, duration: 0.45, gain: 0.16 },
    { wave: 'triangle', from: 523, to: 523, start: 0.39, duration: 0.45, gain: 0.2 },
  ],
  /** El Pokémon aterriza en el encuentro (F2-04b): golpe sordo con polvo. */
  land: [
    { wave: 'noise', from: 700, to: 200, start: 0, duration: 0.16, gain: 0.4, attack: 0.003 },
    { wave: 'sine', from: 120, to: 50, start: 0, duration: 0.26, gain: 0.6, attack: 0.004 },
  ],
  /** Aparece un shiny (F2-04b): tres destellos que suben. */
  shiny: [
    { wave: 'triangle', from: 1800, to: 2400, start: 0, duration: 0.12, gain: 0.22 },
    { wave: 'triangle', from: 2400, to: 3200, start: 0.1, duration: 0.15, gain: 0.22 },
    { wave: 'sine', from: 3200, to: 3600, start: 0.22, duration: 0.3, gain: 0.18, attack: 0.01 },
  ],
} satisfies Record<string, Voice[]>;

export type SfxName = keyof typeof SFX_RECIPES;

export const isSfxName = (name: string): name is SfxName => name in SFX_RECIPES;

/** Muestras mono en [-1, 1] de una receta. Determinista (el ruido sale de una semilla fija). */
export function renderSfx(voices: readonly Voice[], sampleRate: number): Float32Array<ArrayBuffer> {
  const end = Math.max(...voices.map((v) => v.start + v.duration));
  const out = new Float32Array(Math.ceil(end * sampleRate) + 1);
  let seed = 0x9e3779b9;
  const noise = (): number => {
    // xorshift32
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296) * 2 - 1;
  };
  for (const v of voices) {
    const n = Math.floor(v.duration * sampleRate);
    const offset = Math.floor(v.start * sampleRate);
    const attack = Math.max(1, Math.floor((v.attack ?? 0.005) * sampleRate));
    let phase = 0;
    let low = 0; // filtro paso bajo del ruido
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const freq = v.from * (v.to / v.from) ** k;
      // Envolvente: subida lineal y caída exponencial hasta ~0 al final (sin chasquidos).
      const env = i < attack ? i / attack : Math.exp(-4 * ((i - attack) / (n - attack))) * (1 - k);
      let s: number;
      if (v.wave === 'noise') {
        const alpha = Math.min(1, (2 * Math.PI * freq) / sampleRate);
        low += alpha * (noise() - low);
        s = low * 2;
      } else {
        phase += freq / sampleRate;
        const p = phase % 1;
        s =
          v.wave === 'sine'
            ? Math.sin(2 * Math.PI * p)
            : v.wave === 'square'
              ? p < 0.5
                ? 1
                : -1
              : v.wave === 'triangle'
                ? 1 - 4 * Math.abs(p - 0.5)
                : 2 * p - 1;
      }
      out[offset + i] += s * env * v.gain;
    }
  }
  // Nunca pasar de ±1 (si varias voces se suman, se reescala).
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  if (peak > 0.95) for (let i = 0; i < out.length; i++) out[i] *= 0.95 / peak;
  return out;
}
