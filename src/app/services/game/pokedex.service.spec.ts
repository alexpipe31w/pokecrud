import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PokedexService } from './pokedex.service';

const URL = `${environment.serverUrl}/pokedex`;

describe('PokedexService', () => {
  let svc: PokedexService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(PokedexService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const flush = async (entries: { speciesId: number; caught: boolean }[]) => {
    const done = svc.load();
    http.expectOne(URL).flush({ entries: entries.map((e) => ({ ...e, seen: true })) });
    await done;
  };

  it('carga una vez y cuenta vistos (incluye capturados) y capturados', async () => {
    await flush([
      { speciesId: 1, caught: false },
      { speciesId: 25, caught: true },
      { speciesId: 151, caught: true },
    ]);
    expect(svc.statusOf(25)).toBe('caught');
    expect(svc.statusOf(1)).toBe('seen');
    expect(svc.statusOf(4)).toBe('unseen');
    expect(svc.seenCount()).toBe(3);
    expect(svc.caughtCount()).toBe(2);
  });

  it('un segundo load() sin invalidar no pide nada; tras invalidate() sí', async () => {
    await flush([]);
    await svc.load(); // verify() comprueba que no hubo petición
    svc.invalidate();
    await flush([{ speciesId: 7, caught: false }]);
    expect(svc.statusOf(7)).toBe('seen');
  });

  it('un error deja un mensaje y permite reintentar', async () => {
    const done = svc.load();
    http.expectOne(URL).error(new ProgressEvent('error'));
    await done;
    expect(svc.error()).toMatch(/No se pudo/);
    await flush([{ speciesId: 4, caught: true }]);
    expect(svc.error()).toBeNull();
    expect(svc.caughtCount()).toBe(1);
  });
});
