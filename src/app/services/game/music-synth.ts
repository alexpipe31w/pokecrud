/**
 * Música generada en el propio juego (F2-10), como los efectos (D-044): cada tema es una partitura corta que se
 * convierte en un bucle de muestras la primera vez que suena. Sin archivos ni licencias de terceros: es nuestra.
 *
 * Partitura: compases de 4/4 en pasos de semicorchea (16 por compás). Cada parte es una lista de pasos separados por
 * espacios que se repite hasta llenar el tema:
 * - notas: `C4` empieza una nota, `_` la alarga un paso, `.` es silencio; `C4+E4+G4` es un acorde;
 * - percusión: `k` bombo, `s` caja, `h` charles, `.` nada.
 */

import type { Wave } from './sfx-synth';

export interface ToneNote {
  step: number;
  steps: number;
  freqs: number[];
}
export interface DrumHit {
  step: number;
  steps: 1;
  drum: 'k' | 's' | 'h';
}

export type Part =
  | {
      kind: 'tone';
      wave: Exclude<Wave, 'noise'>;
      /** Volumen de la parte (0..1). */
      gain: number;
      pattern: string;
      /** Envolvente (s y nivel de sostén 0..1). */
      attack?: number;
      decay?: number;
      sustain?: number;
      release?: number;
      /** Filtro paso bajo (Hz) para suavizar ondas cuadradas y de sierra. */
      cutoff?: number;
    }
  | { kind: 'drums'; gain: number; pattern: string };

export interface Song {
  bpm: number;
  /** Compases de 4/4 (16 pasos cada uno). */
  bars: number;
  parts: Part[];
}

const STEPS_PER_BAR = 16;
const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frecuencia de una nota en notación inglesa (`A4` = 440 Hz; sostenidos con `#`). */
export function noteFreq(note: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  if (!m) throw new Error(`Nota no válida: ${note}`);
  const n = Number(m[3]) * 12 + SEMITONES[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((n - 57) / 12);
}

/** Notas (o golpes) de una parte, con su paso de inicio y duración en pasos. */
export function parsePart(pattern: string, drums = false): (ToneNote | DrumHit)[] {
  const tokens = pattern.trim().split(/\s+/);
  const out: (ToneNote | DrumHit)[] = [];
  let open: ToneNote | null = null;
  tokens.forEach((t, step) => {
    if (drums) {
      if (t === 'k' || t === 's' || t === 'h') out.push({ step, steps: 1, drum: t });
      else if (t !== '.') throw new Error(`Golpe no válido: ${t}`);
      return;
    }
    if (t === '_') {
      if (open) open.steps++;
      return;
    }
    open = null;
    if (t === '.') return;
    open = { step, steps: 1, freqs: t.split('+').map(noteFreq) };
    out.push(open);
  });
  return out;
}

/** Muestras mono en [-1, 1] del tema entero; las colas del final se envuelven al principio (bucle sin corte). */
export function renderSong(song: Song, sampleRate: number): Float32Array<ArrayBuffer> {
  const stepSec = 60 / song.bpm / 4;
  const totalSteps = song.bars * STEPS_PER_BAR;
  const length = Math.round(totalSteps * stepSec * sampleRate);
  const out = new Float32Array(length);
  const noise = xorshift(0x2545f491);
  const add = (at: number, value: number) => {
    out[(((at % length) + length) % length) | 0] += value;
  };

  for (const part of song.parts) {
    const events = parsePart(part.pattern, part.kind === 'drums');
    const patternSteps = part.pattern.trim().split(/\s+/).length;
    for (let offset = 0; offset < totalSteps; offset += patternSteps) {
      for (const e of events) {
        const start = Math.round((offset + e.step) * stepSec * sampleRate);
        if ('drum' in e) renderDrum(e.drum, part.gain, start, sampleRate, noise, add);
        else if (part.kind === 'tone') renderTone(part, e, stepSec, start, sampleRate, add);
      }
    }
  }

  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  if (peak > 0.9) for (let i = 0; i < out.length; i++) out[i] *= 0.9 / peak;
  return out;
}

function renderTone(
  part: Extract<Part, { kind: 'tone' }>,
  note: ToneNote,
  stepSec: number,
  start: number,
  rate: number,
  add: (at: number, v: number) => void,
): void {
  const attack = part.attack ?? 0.01;
  const decay = part.decay ?? 0.12;
  const sustain = part.sustain ?? 0.6;
  const release = part.release ?? 0.12;
  const held = note.steps * stepSec;
  const total = Math.round((held + release) * rate);
  const voices = note.freqs.length;
  const alpha = part.cutoff ? Math.min(1, (2 * Math.PI * part.cutoff) / rate) : 1;
  for (const freq of note.freqs) {
    let phase = 0;
    let low = 0;
    for (let i = 0; i < total; i++) {
      const t = i / rate;
      const env =
        t < attack
          ? t / attack
          : t < attack + decay
            ? 1 - (1 - sustain) * ((t - attack) / decay)
            : t < held
              ? sustain
              : sustain * Math.max(0, 1 - (t - held) / release);
      phase = (phase + freq / rate) % 1;
      let s = wave(part.wave, phase);
      low += alpha * (s - low);
      s = low;
      add(start + i, (s * env * part.gain) / Math.sqrt(voices));
    }
  }
}

function renderDrum(
  drum: 'k' | 's' | 'h',
  gain: number,
  start: number,
  rate: number,
  noise: () => number,
  add: (at: number, v: number) => void,
): void {
  if (drum === 'k') {
    // Bombo: seno que baja de 150 a 45 Hz.
    const n = Math.round(0.22 * rate);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      phase += (150 * (45 / 150) ** k) / rate;
      add(start + i, Math.sin(2 * Math.PI * phase) * Math.exp(-5 * k) * gain);
    }
    return;
  }
  if (drum === 's') {
    // Caja: ruido con algo de cuerpo.
    const n = Math.round(0.16 * rate);
    let low = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      low += 0.5 * (noise() - low);
      const body = Math.sin((2 * Math.PI * 190 * i) / rate) * Math.exp(-12 * k) * 0.4;
      add(start + i, (low * 0.8 + body) * Math.exp(-6 * k) * gain);
    }
    return;
  }
  // Charles: ruido agudo y muy corto (ruido menos su paso bajo).
  const n = Math.round(0.045 * rate);
  let low = 0;
  for (let i = 0; i < n; i++) {
    const x = noise();
    low += 0.3 * (x - low);
    add(start + i, (x - low) * Math.exp((-8 * i) / n) * gain * 0.35);
  }
}

function wave(w: Exclude<Wave, 'noise'>, p: number): number {
  switch (w) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
  }
}

function xorshift(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}
