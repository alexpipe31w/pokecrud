import { type Song, noteFreq, parsePart, renderSong } from './music-synth';
import { SONGS } from './music-songs';

const RATE = 22_050;
const rms = (x: Float32Array, from = 0, to = x.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
};
const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('music-synth (F2-10)', () => {
  it('frecuencia de una nota: La4 = 440 Hz, Do4 ≈ 261,63, La#3 ≈ 233,08; una nota rara lanza', () => {
    expect(noteFreq('A4')).toBe(440);
    expect(noteFreq('C4')).toBeCloseTo(261.63, 1);
    expect(noteFreq('A#3')).toBeCloseTo(233.08, 1);
    expect(() => noteFreq('H4')).toThrow();
  });

  it('una parte: cada nota dura hasta el siguiente paso que no sea "_"; "." es silencio; "+" hace acordes', () => {
    expect(parsePart('C4 _ _ . E4 _ C4+G4 .')).toEqual([
      { step: 0, steps: 3, freqs: [noteFreq('C4')] },
      { step: 4, steps: 2, freqs: [noteFreq('E4')] },
      { step: 6, steps: 1, freqs: [noteFreq('C4'), noteFreq('G4')] },
    ]);
    expect(parsePart('k . s . h h . .', true)).toEqual([
      { step: 0, steps: 1, drum: 'k' },
      { step: 2, steps: 1, drum: 's' },
      { step: 4, steps: 1, drum: 'h' },
      { step: 5, steps: 1, drum: 'h' },
    ]);
  });

  const tiny: Song = {
    bpm: 120,
    bars: 1,
    parts: [
      { kind: 'tone', wave: 'triangle', gain: 0.5, pattern: 'C4 _ _ _ E4 _ _ _ G4 _ _ _ C5 _ _ _' },
      { kind: 'drums', gain: 0.6, pattern: 'k . h . s . h . k . h . s . h .' },
    ],
  };

  it('dura lo que dicen el tempo y los compases, suena, no satura y es determinista', () => {
    const out = renderSong(tiny, RATE);
    expect(out.length).toBe(Math.round(2 * RATE)); // 1 compás de 4 tiempos a 120 = 2 s
    expect(rms(out)).toBeGreaterThan(0.03);
    expect(peak(out)).toBeLessThanOrEqual(1);
    expect(renderSong(tiny, RATE)).toEqual(out);
  });

  it('bucle sin corte: lo que suena al final del compás se oye al principio (cola envuelta)', () => {
    const tail: Song = {
      bpm: 120,
      bars: 1,
      parts: [
        {
          kind: 'tone',
          wave: 'sine',
          gain: 0.6,
          release: 0.4,
          pattern: '. . . . . . . . . . . . . . . A4',
        },
      ],
    };
    const out = renderSong(tail, RATE);
    expect(rms(out, 0, Math.round(0.05 * RATE))).toBeGreaterThan(0.01);
  });

  it('los tres temas: 15-45 s, suenan sin saturar; combate más rápido que el día y el día que la noche', () => {
    for (const [name, song] of Object.entries(SONGS)) {
      const out = renderSong(song, RATE);
      const seconds = out.length / RATE;
      expect(seconds, name).toBeGreaterThanOrEqual(15);
      expect(seconds, name).toBeLessThanOrEqual(45);
      expect(rms(out), name).toBeGreaterThan(0.03);
      expect(peak(out), name).toBeLessThanOrEqual(1);
    }
    expect(SONGS.battle.bpm).toBeGreaterThan(SONGS['map-day'].bpm);
    expect(SONGS['map-day'].bpm).toBeGreaterThan(SONGS['map-night'].bpm);
  });

  it('cada parte cabe un número entero de veces en el tema (si no, el bucle se descuadraría)', () => {
    for (const [name, song] of Object.entries(SONGS)) {
      const steps = song.bars * 16;
      for (const part of song.parts) {
        const n = part.pattern.trim().split(/\s+/).length;
        expect(steps % n, `${name}: parte de ${n} pasos`).toBe(0);
      }
    }
  });
});
