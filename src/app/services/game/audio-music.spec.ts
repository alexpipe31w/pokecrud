import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY, AudioService, MUSIC_FADE_S, MUSIC_RENDERER } from './audio.service';

/** AudioContext falso con lo que usa la música: fundidos, bucles, paradas y suspender/reanudar. */
function fakeContext() {
  const sources: {
    buffer: unknown;
    loop: boolean;
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    out?: ReturnType<typeof gainNode>;
  }[] = [];
  const gainNode = () => {
    const g = {
      gain: {
        value: 1,
        ramps: [] as [number, number][],
        setValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
        linearRampToValueAtTime: vi.fn((v: number, t: number) => g.gain.ramps.push([v, t])),
      },
      connect: vi.fn(),
    };
    return g;
  };
  const ctx = {
    state: 'running',
    currentTime: 10,
    destination: {},
    sampleRate: 48_000,
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      channels,
      length,
      sampleRate,
      copyToChannel: vi.fn(),
    })),
    createGain: vi.fn(() => gainNode()),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null as unknown,
        loop: false,
        connect: vi.fn((node: ReturnType<typeof gainNode>) => (src.out = node)),
        start: vi.fn(),
        stop: vi.fn(),
      } as (typeof sources)[number];
      sources.push(src);
      return src;
    }),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
  };
  return { ctx, sources };
}

describe('AudioService · música (F2-10)', () => {
  let audio: AudioService;
  let fake: ReturnType<typeof fakeContext>;
  let render: ReturnType<typeof vi.fn>;
  /** Para controlar cuándo termina de generarse cada tema. */
  let pending: Map<string, (x: Float32Array) => void>;

  beforeEach(() => {
    fake = fakeContext();
    pending = new Map();
    render = vi.fn((track: string) => new Promise<Float32Array>((ok) => pending.set(track, ok)));
    TestBed.configureTestingModule({
      providers: [
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => fake.ctx },
        { provide: MUSIC_RENDERER, useValue: render },
      ],
    });
    audio = TestBed.inject(AudioService);
  });
  const ready = async (track: string) => {
    pending.get(track)?.(new Float32Array(100));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('suena en bucle, entra con fundido y se genera a 22 050 Hz fuera de la pantalla', async () => {
    const p = audio.playMusic('map-day');
    await ready('map-day');
    await p;
    expect(render).toHaveBeenCalledWith('map-day', 22_050);
    expect(fake.sources).toHaveLength(1);
    const [src] = fake.sources;
    expect(src.loop).toBe(true);
    expect(src.start).toHaveBeenCalled();
    expect(src.out?.gain.ramps).toContainEqual([1, 10 + MUSIC_FADE_S]);
    expect(audio.music()).toBe('map-day');
  });

  it('pedir el mismo tema otra vez no lo reinicia', async () => {
    const p = audio.playMusic('map-day');
    await ready('map-day');
    await p;
    await audio.playMusic('map-day');
    expect(fake.sources).toHaveLength(1);
  });

  it('cambiar de tema: el anterior se funde y se para, el nuevo entra; nunca dos a la vez', async () => {
    const p1 = audio.playMusic('map-day');
    await ready('map-day');
    await p1;
    const p2 = audio.playMusic('battle');
    const day = fake.sources[0];
    expect(day.out?.gain.ramps).toContainEqual([0, 10 + MUSIC_FADE_S]);
    expect(day.stop).toHaveBeenCalledWith(10 + MUSIC_FADE_S);
    await ready('battle');
    await p2;
    expect(fake.sources).toHaveLength(2);
    expect(fake.sources[1].start).toHaveBeenCalled();
    expect(audio.music()).toBe('battle');
  });

  it('si se cambia antes de que termine de generarse, el primero no llega a sonar', async () => {
    const p1 = audio.playMusic('map-day');
    const p2 = audio.playMusic('battle');
    await ready('map-day');
    await ready('battle');
    await Promise.all([p1, p2]);
    expect(fake.sources).toHaveLength(1);
    expect(audio.music()).toBe('battle');
  });

  it('null = silencio (fundido y parada); volver a un tema ya generado no lo genera otra vez', async () => {
    const p1 = audio.playMusic('map-night');
    await ready('map-night');
    await p1;
    await audio.playMusic(null);
    expect(fake.sources[0].stop).toHaveBeenCalled();
    expect(audio.music()).toBeNull();
    await audio.playMusic('map-night');
    expect(render).toHaveBeenCalledTimes(1);
    expect(fake.sources).toHaveLength(2);
  });

  it('con la app en segundo plano el audio se suspende y al volver se reanuda', async () => {
    const p = audio.playMusic('map-day');
    await ready('map-day');
    await p;
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => true });
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(fake.ctx.suspend).toHaveBeenCalled();
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => false });
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(fake.ctx.resume).toHaveBeenCalled();
  });

  it('si el AudioContext no sabe suspender (dobles de prueba, WebViews viejos), ir a segundo plano no rompe nada', async () => {
    const p = audio.playMusic('map-day');
    await ready('map-day');
    await p;
    const ctx = fake.ctx as Partial<typeof fake.ctx>;
    delete ctx.suspend;
    delete ctx.resume;
    const doc = TestBed.inject(DOCUMENT);
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => true });
    expect(() => doc.dispatchEvent(new Event('visibilitychange'))).not.toThrow();
    Object.defineProperty(doc, 'hidden', { configurable: true, get: () => false });
    expect(() => doc.dispatchEvent(new Event('visibilitychange'))).not.toThrow();
  });
});
