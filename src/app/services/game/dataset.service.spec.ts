import 'fake-indexeddb/auto';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import type { DatasetMeta, Move, Species, TypeInfo } from '@shared/data/dataset.types';
import { DatasetService } from './dataset.service';

const meta = (version: string): DatasetMeta => ({
  generatedAt: '2026-10-11T00:00:00.000Z',
  speciesCount: 1,
  movesCount: 1,
  source: 'https://pokeapi.co/api/v2',
  version,
});
const pokedex = [{ id: 25, name: 'pikachu' }] as Species[];
const moves = [{ id: 84, name: 'thunder-shock' }] as Move[];
const types = [{ name: 'electric', nameEs: 'Eléctrico', attack: {} }] as TypeInfo[];

/** Espera (con tiempo real) a que se cumpla una condición: IndexedDB y HTTP son asíncronos. */
async function until(check: () => boolean, ms = 2000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('tiempo de espera agotado');
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('DatasetService', () => {
  let http: HttpTestingController;

  /** Espera a que llegue la petición y la responde (match() consume lo que encuentra). */
  const flushWhenRequested = async (url: string, body: object) => {
    let req: ReturnType<HttpTestingController['match']> = [];
    await until(() => (req = http.match(url)).length > 0);
    req[0].flush(body);
  };
  const flushBundle = async () => {
    await flushWhenRequested('assets/data/pokedex.json', pokedex);
    http.expectOne('assets/data/moves.json').flush(moves);
    http.expectOne('assets/data/types.json').flush(types);
  };
  const newInstance = () => TestBed.runInInjectionContext(() => new DatasetService());

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory(); // IndexedDB vacío en cada test
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la primera carga pide los 4 JSON y queda lista con Maps por id', async () => {
    const service = TestBed.inject(DatasetService);
    const done = service.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await flushBundle();
    await done;
    expect(service.status()).toBe('ready');
    expect(service.species().get(25)?.name).toBe('pikachu');
    expect(service.moves().get(84)?.name).toBe('thunder-shock');
    expect(service.types()).toHaveLength(1);
  });

  it('con la misma versión, una instancia nueva solo pide meta.json (lee de IndexedDB)', async () => {
    const first = TestBed.inject(DatasetService);
    const done = first.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await flushBundle();
    await done;

    const second = newInstance();
    const again = second.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await again;
    expect(second.status()).toBe('ready');
    expect(second.species().size).toBe(1);
  });

  it('con otra versión vuelve a descargar', async () => {
    const first = TestBed.inject(DatasetService);
    const done = first.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await flushBundle();
    await done;

    const second = newInstance();
    const again = second.load();
    http.expectOne('assets/data/meta.json').flush(meta('v2'));
    await flushBundle();
    await again;
    expect(second.status()).toBe('ready');
  });

  it('un error HTTP deja status=error con mensaje, y se puede reintentar', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = TestBed.inject(DatasetService);
    const done = service.load();
    http.expectOne('assets/data/meta.json').flush('caído', { status: 500, statusText: 'Error' });
    await done;
    expect(service.status()).toBe('error');
    expect(service.error()).toBeTruthy();

    const retry = service.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await flushBundle();
    await retry;
    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    error.mockRestore();
  });

  it('dos load() simultáneos hacen una sola descarga y esperan lo mismo', async () => {
    const service = TestBed.inject(DatasetService);
    const a = service.load();
    const b = service.load();
    http.expectOne('assets/data/meta.json').flush(meta('v1'));
    await flushBundle();
    await Promise.all([a, b]);
    expect(service.status()).toBe('ready');
  });
});
