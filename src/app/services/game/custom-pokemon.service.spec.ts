import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CustomPokemon } from '@shared/protocol/course';
import { environment } from '../../../environments/environment';
import { CustomPokemonService } from './custom-pokemon.service';

const URL = `${environment.serverUrl}/customPokemon`;
const mon = (id: number, name = `m${id}`): CustomPokemon => ({
  id,
  name,
  types: ['fire'],
  stats: { hp: 50, attack: 60, defense: 40, speed: 70 },
  imageUrl: '',
  description: '',
  createdAt: '2026-10-13T12:00:00.000Z',
});

describe('CustomPokemonService', () => {
  let svc: CustomPokemonService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(CustomPokemonService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('load() trae los del jugador, los más nuevos primero, de 100 en 100', async () => {
    const done = svc.load();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('_sort')).toBe('createdAt');
    expect(req.request.params.get('_order')).toBe('desc');
    expect(req.request.params.get('_limit')).toBe('100');
    req.flush([mon(2), mon(1)]);
    await done;
    expect(svc.list()?.map((m) => m.id)).toEqual([2, 1]);
    expect(svc.byId(1)?.name).toBe('m1');
  });

  it('create (POST), update (PATCH) y remove (DELETE) dejan la lista al día', async () => {
    const first = svc.load();
    http.expectOne((r) => r.url === URL).flush([mon(1)]);
    await first;
    const input = {
      name: 'Flamita',
      types: ['fire'],
      stats: { hp: 10, attack: 20, defense: 30, speed: 40 },
      imageUrl: '',
      description: 'Pequeño',
    };
    const c = svc.create(input);
    const post = http.expectOne(URL);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush({ ...mon(5, 'Flamita') });
    await c;
    expect(svc.list()?.map((m) => m.id)).toEqual([5, 1]);

    const u = svc.update(1, { ...input, name: 'Otro' });
    const patch = http.expectOne(`${URL}/1`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush(mon(1, 'Otro'));
    await u;
    expect(svc.byId(1)?.name).toBe('Otro');

    const r = svc.remove(5);
    const del = http.expectOne(`${URL}/5`);
    expect(del.request.method).toBe('DELETE');
    del.flush({});
    await r;
    expect(svc.list()?.map((m) => m.id)).toEqual([1]);
  });

  it('un error al cargar deja un mensaje en español', async () => {
    const done = svc.load();
    http.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Error' });
    await done;
    expect(svc.error()).toBe('No se pudieron cargar tus Pokémon personalizados.');
  });
});
