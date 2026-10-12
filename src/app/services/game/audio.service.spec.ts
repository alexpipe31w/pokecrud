import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY, AudioService, CRY_CACHE_SIZE, SFX_CATALOG } from './audio.service';
import { SettingsService } from './settings.service';

/** Doble mínimo de AudioContext: registra ganancias y sonidos reproducidos. */
function fakeContext() {
  const gains: { gain: { value: number }; connect: ReturnType<typeof vi.fn> }[] = [];
  const started: unknown[] = [];
  const ctx = {
    state: 'suspended',
    destination: {},
    sampleRate: 48_000,
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      channels,
      length,
      sampleRate,
      copyToChannel: vi.fn(),
    })),
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
    createGain: vi.fn(() => {
      const g = { gain: { value: 1 }, connect: vi.fn() };
      gains.push(g);
      return g;
    }),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null as unknown,
        connect: vi.fn(),
        start: vi.fn(() => started.push(src.buffer)),
      };
      return src;
    }),
    decodeAudioData: vi.fn((data: ArrayBuffer) => Promise.resolve({ decoded: data })),
  };
  return { ctx, gains, started };
}

const okResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });

describe('AudioService', () => {
  let fake: ReturnType<typeof fakeContext>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: AudioService;

  beforeEach(() => {
    localStorage.clear();
    fake = fakeContext();
    fetchMock = vi.fn(okResponse);
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => fake.ctx },
        { provide: SFX_CATALOG, useValue: new Set(['throw', 'roto']) },
      ],
    });
    service = TestBed.inject(AudioService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const cryFetches = (id: number) =>
    fetchMock.mock.calls.filter(([url]) => String(url).endsWith(`/latest/${id}.ogg`)).length;

  it('playCry descarga el grito una vez y lo reproduce en el bus de gritos', async () => {
    expect(await service.playCry(25)).toBe(true);
    expect(await service.playCry(25)).toBe(true);
    expect(cryFetches(25)).toBe(1);
    expect(fake.started).toHaveLength(2);
  });

  it('playCry con volumen pone una ganancia propia entre el sonido y el bus de gritos (F1-07)', async () => {
    await service.playCry(25); // crea los 3 buses
    const buses = fake.gains.length;
    expect(await service.playCry(25, 0.3)).toBe(true);
    expect(fake.gains).toHaveLength(buses + 1);
    const local = fake.gains[buses];
    expect(local.gain.value).toBe(0.3);
    expect(local.connect).toHaveBeenCalledWith(fake.gains[2]); // buses: music, sfx, cries
  });

  it('playCry sin volumen no añade ganancias (suena a 1)', async () => {
    await service.playCry(25);
    const buses = fake.gains.length;
    await service.playCry(25);
    expect(fake.gains).toHaveLength(buses);
  });

  it(`la caché LRU expulsa el grito menos usado al pasar de ${CRY_CACHE_SIZE}`, async () => {
    for (let id = 1; id <= CRY_CACHE_SIZE; id++) await service.playCry(id);
    await service.playCry(1); // se usa: pasa a ser el más reciente
    await service.playCry(CRY_CACHE_SIZE + 1); // entra uno más → sale el 2
    await service.playCry(1);
    await service.playCry(2);
    expect(cryFetches(1)).toBe(1);
    expect(cryFetches(2)).toBe(2);
  });

  it('un fallo de red en playCry no lanza y resuelve false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(service.playCry(7)).resolves.toBe(false);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(service.playCry(8)).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('playSfx de un efecto generado (F2-08) lo calcula una vez, sin descargar nada, y lo reproduce', async () => {
    await service.playSfx('hit-crit');
    await service.playSfx('hit-crit');
    expect(fake.ctx.createBuffer).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.started).toHaveLength(2);
  });

  it('preloadCries descarga los gritos sin sonar y luego playCry ya no los pide', async () => {
    service.preloadCries([25, 25, 4]);
    await new Promise((r) => setTimeout(r, 0));
    expect(cryFetches(25)).toBe(1);
    expect(cryFetches(4)).toBe(1);
    expect(fake.started).toHaveLength(0);
    await service.playCry(25);
    expect(cryFetches(25)).toBe(1);
    expect(fake.started).toHaveLength(1);
  });

  it('playSfx de un efecto que no existe (ni generado ni en el catálogo) avisa una vez y no lo pide', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await service.playSfx('no-existe');
    await service.playSfx('no-existe');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.started).toHaveLength(0);
    warn.mockRestore();
  });

  it('playSfx de un efecto del catálogo lo descarga una vez y lo reproduce', async () => {
    await service.playSfx('throw');
    await service.playSfx('throw');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('assets/audio/sfx/throw.ogg');
    expect(fake.started).toHaveLength(2);
  });

  it('si un efecto del catálogo falla al cargar, avisa una vez y sigue en silencio', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await service.playSfx('roto');
    await service.playSfx('roto');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fake.started).toHaveLength(0);
    warn.mockRestore();
  });

  it('los volúmenes de los buses siguen a los ajustes', async () => {
    await service.playCry(25); // crea el contexto y los buses
    const [music, sfx, cries] = fake.gains;
    expect([music.gain.value, sfx.gain.value, cries.gain.value]).toEqual([0.6, 0.8, 0.9]);
    TestBed.inject(SettingsService).update({ criesVolume: 0.2 });
    TestBed.tick();
    expect(cries.gain.value).toBe(0.2);
  });

  it('unlock reanuda el contexto (política de autoplay)', async () => {
    await service.unlock();
    expect(fake.ctx.resume).toHaveBeenCalled();
    expect(fake.ctx.state).toBe('running');
  });
});
