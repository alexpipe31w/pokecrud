import type { Song } from './music-synth';

/**
 * Los temas del juego (F2-10), compuestos para PokéCRUD GO (propios, sin licencias de terceros; D-044). Compases de
 * 16 semicorcheas. Los acordes y los bajos se escriben con las funciones de abajo; las melodías, a mano.
 */

export type MusicTrack = 'map-day' | 'map-night' | 'battle';

/** Una nota (o acorde) que dura `steps` pasos. */
const hold = (note: string, steps: number): string =>
  [note, ...Array<string>(steps - 1).fill('_')].join(' ');
/** Un acorde por compás, sostenido. */
const pads = (voicings: string[]): string => voicings.map((v) => hold(v, 16)).join(' ');
/** Bajo: la fundamental en cada negra y la quinta en la última (`[raíz, quinta]` por compás). */
const walkingBass = (roots: [string, string][]): string =>
  roots
    .map(([r, f]) =>
      [r, '.', '.', '.', r, '.', '.', '.', r, '.', '.', '.', f, '.', '.', '.'].join(' '),
    )
    .join(' ');
/** Bajo de combate: corcheas sin parar, octava arriba en la 7.ª. */
const drivingBass = (roots: [string, string][]): string =>
  roots
    .map(([r, up]) => [r, '.', r, '.', r, '.', r, '.', r, '.', r, '.', up, '.', r, '.'].join(' '))
    .join(' ');

// ───────────── Mapa de día: Do mayor, tranquila y alegre ─────────────
const DAY_CHORDS = ['C4+E4+G4', 'A3+C4+E4', 'F3+A3+C4', 'G3+B3+D4', 'C4+E4+G4', 'A3+C4+E4'];
const MAP_DAY: Song = {
  bpm: 100,
  bars: 8,
  parts: [
    {
      kind: 'tone',
      wave: 'sine',
      gain: 0.16,
      attack: 0.06,
      sustain: 0.75,
      release: 0.35,
      pattern: `${pads(DAY_CHORDS)} ${hold('D4+F4+A4', 8)} ${hold('G3+B3+D4', 8)} ${hold('C4+E4+G4', 16)}`,
    },
    {
      kind: 'tone',
      wave: 'triangle',
      gain: 0.32,
      decay: 0.15,
      sustain: 0.35,
      pattern: walkingBass([
        ['C3', 'G2'],
        ['A2', 'E3'],
        ['F2', 'C3'],
        ['G2', 'D3'],
        ['C3', 'G2'],
        ['A2', 'E3'],
        ['D3', 'G2'],
        ['C3', 'G2'],
      ]),
    },
    {
      kind: 'tone',
      wave: 'square',
      cutoff: 1800,
      gain: 0.15,
      decay: 0.18,
      sustain: 0.45,
      release: 0.15,
      pattern: [
        'E5 _ G5 _ C6 _ _ _ B5 _ G5 _ E5 _ _ _',
        'A5 _ _ _ G5 _ E5 _ C5 _ _ _ . . . .',
        'F5 _ A5 _ C6 _ A5 _ G5 _ F5 _ E5 _ _ _',
        'D5 _ _ _ G5 _ _ _ B5 _ A5 _ G5 _ _ _',
        'E5 _ G5 _ C6 _ _ _ D6 _ C6 _ B5 _ _ _',
        'C6 _ A5 _ E5 _ _ _ A5 _ C6 _ E6 _ _ _',
        'D6 _ C6 _ A5 _ F5 _ G5 _ B5 _ D6 _ _ _',
        'C6 _ _ _ _ _ _ _ . . . . G5 _ _ _',
      ].join(' '),
    },
    { kind: 'drums', gain: 0.3, pattern: 'k . h . . . h . k k h . . . h .' },
  ],
};

// ───────────── Mapa de noche: La menor, lenta y suave ─────────────
const MAP_NIGHT: Song = {
  bpm: 78,
  bars: 8,
  parts: [
    {
      kind: 'tone',
      wave: 'sine',
      gain: 0.18,
      attack: 0.35,
      sustain: 0.85,
      release: 0.7,
      pattern: pads([
        'A3+C4+E4',
        'F3+A3+C4',
        'C4+E4+G4',
        'G3+B3+D4',
        'A3+C4+E4',
        'F3+A3+C4',
        'D4+F4+A4',
        'E3+G#3+B3',
      ]),
    },
    {
      kind: 'tone',
      wave: 'sine',
      gain: 0.3,
      attack: 0.05,
      sustain: 0.7,
      release: 0.5,
      pattern: ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'D3', 'E2'].map((n) => hold(n, 16)).join(' '),
    },
    {
      kind: 'tone',
      wave: 'triangle',
      gain: 0.16,
      attack: 0.04,
      decay: 0.3,
      sustain: 0.5,
      release: 0.45,
      pattern: [
        'E5 _ _ _ _ _ _ _ C5 _ _ _ B4 _ _ _',
        'A4 _ _ _ _ _ _ _ . . . . . . . .',
        'G4 _ _ _ C5 _ _ _ E5 _ _ _ D5 _ _ _',
        'B4 _ _ _ _ _ _ _ . . . . . . . .',
        'E5 _ _ _ _ _ _ _ A5 _ _ _ G5 _ _ _',
        'F5 _ _ _ E5 _ _ _ C5 _ _ _ A4 _ _ _',
        'D5 _ _ _ _ _ _ _ F5 _ _ _ E5 _ _ _',
        'G#4 _ _ _ _ _ _ _ B4 _ _ _ . . . .',
      ].join(' '),
    },
    { kind: 'drums', gain: 0.18, pattern: 'h . . . h . . . h . . . h . h .' },
  ],
};

// ───────────── Combate: Mi menor, rápida ─────────────
const BATTLE_CHORDS = [
  'E3+G3+B3',
  'E3+G3+B3',
  'C3+E3+G3',
  'D3+F#3+A3',
  'E3+G3+B3',
  'E3+G3+B3',
  'C3+E3+G3',
  'D3+F#3+A3',
  'A3+C4+E4',
  'A3+C4+E4',
  'E3+G3+B3',
  'E3+G3+B3',
  'C3+E3+G3',
  'D3+F#3+A3',
  'B2+D#3+F#3',
  'B2+D#3+F#3',
];
const BATTLE_ROOTS: [string, string][] = [
  ['E2', 'E3'],
  ['E2', 'E3'],
  ['C2', 'C3'],
  ['D2', 'D3'],
  ['E2', 'E3'],
  ['E2', 'E3'],
  ['C2', 'C3'],
  ['D2', 'D3'],
  ['A2', 'A3'],
  ['A2', 'A3'],
  ['E2', 'E3'],
  ['E2', 'E3'],
  ['C2', 'C3'],
  ['D2', 'D3'],
  ['B2', 'B3'],
  ['B2', 'B3'],
];
const BATTLE_HOOK = 'E5 _ . E5 G5 _ B5 _ A5 _ G5 _ F#5 _ E5 _';
const BATTLE: Song = {
  bpm: 150,
  bars: 16,
  parts: [
    {
      kind: 'tone',
      wave: 'saw',
      cutoff: 1400,
      gain: 0.1,
      attack: 0.02,
      sustain: 0.7,
      release: 0.15,
      pattern: pads(BATTLE_CHORDS),
    },
    {
      kind: 'tone',
      wave: 'square',
      cutoff: 900,
      gain: 0.3,
      decay: 0.08,
      sustain: 0.5,
      release: 0.05,
      pattern: drivingBass(BATTLE_ROOTS),
    },
    {
      kind: 'tone',
      wave: 'square',
      cutoff: 2600,
      gain: 0.16,
      decay: 0.1,
      sustain: 0.55,
      release: 0.08,
      pattern: [
        BATTLE_HOOK,
        'B4 _ _ _ E5 _ _ _ G5 _ F#5 _ E5 _ D5 _',
        'C5 _ E5 _ G5 _ _ _ E5 _ G5 _ C6 _ B5 _',
        'A5 _ _ _ F#5 _ D5 _ F#5 _ A5 _ D6 _ _ _',
        BATTLE_HOOK,
        'G5 _ _ _ B5 _ _ _ E6 _ D6 _ B5 _ G5 _',
        'E5 _ G5 _ C6 _ _ _ B5 _ G5 _ E5 _ C5 _',
        'D5 _ F#5 _ A5 _ _ _ D6 _ _ _ C6 _ A5 _',
        'A5 _ _ _ C6 _ _ _ E6 _ _ _ C6 _ A5 _',
        'G5 _ A5 _ C6 _ _ _ B5 _ A5 _ G5 _ E5 _',
        'E5 _ _ _ G5 _ B5 _ E6 _ _ _ D6 _ B5 _',
        'G5 _ _ _ F#5 _ _ _ E5 _ _ _ . . . .',
        'C6 _ _ _ B5 _ _ _ G5 _ _ _ E5 _ _ _',
        'D6 _ _ _ C6 _ _ _ A5 _ _ _ F#5 _ _ _',
        'D#5 _ F#5 _ B5 _ _ _ A5 _ F#5 _ D#5 _ _ _',
        'B4 _ _ _ D#5 _ _ _ F#5 _ _ _ B5 _ _ _',
      ].join(' '),
    },
    { kind: 'drums', gain: 0.5, pattern: 'k . h . s . h . k k h . s . h h' },
  ],
};

export const SONGS: Record<MusicTrack, Song> = {
  'map-day': MAP_DAY,
  'map-night': MAP_NIGHT,
  battle: BATTLE,
};
