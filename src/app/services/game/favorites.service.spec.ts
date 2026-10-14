import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Favorite } from '@shared/protocol/course';
import { environment } from '../../../environments/environment';
import { FavoritesService } from './favorites.service';

const URL = `${environment.serverUrl}/favorites`;
const fav = (id: number, pokemonId: number, rating = 3, note = ''): Favorite => ({
  id,
  pokemonId,
  pokemonName: `p${pokemonId}`,
  note,
  rating,
  createdAt: '2026-10-13T12:00:00.000Z',
});
const isList = (page: number) => (r: { url: string; params: { get(k: string): string | null } }) =>
  r.url === URL && r.params.get('_page') === String(page);

describe('FavoritesService', () => {
  let svc: FavoritesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(FavoritesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('load() pide de 100 en 100 (los más recientes primero) hasta que una página viene corta', async () => {
    const done = svc.load();
    const p1 = http.expectOne(isList(1));
    expect(p1.request.params.get('_limit')).toBe('100');
    expect(p1.request.params.get('_sort')).toBe('createdAt');
    expect(p1.request.params.get('_order')).toBe('desc');
    p1.flush(Array.from({ length: 100 }, (_, i) => fav(i + 1, i + 1)));
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(isList(2)).flush([fav(101, 101)]);
    await done;
    expect(svc.favorites()).toHaveLength(101);
    expect(svc.of(101)?.id).toBe(101);
    expect(svc.of(999)).toBeUndefined();
  });

  it('save(): si no es favorito hace POST; si ya lo es, PATCH de la valoración y la nota', async () => {
    const first = svc.load();
    http.expectOne(isList(1)).flush([fav(7, 25, 2)]);
    await first;

    const created = svc.save({
      pokemonId: 6,
      pokemonName: 'charizard',
      rating: 5,
      note: 'El mejor',
    });
    const post = http.expectOne(URL);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      pokemonId: 6,
      pokemonName: 'charizard',
      rating: 5,
      note: 'El mejor',
    });
    post.flush(fav(8, 6, 5, 'El mejor'));
    await created;
    expect(svc.of(6)?.rating).toBe(5);

    const edited = svc.save({ pokemonId: 25, pokemonName: 'pikachu', rating: 4, note: '' });
    const patch = http.expectOne(`${URL}/7`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ rating: 4, note: '' });
    patch.flush(fav(7, 25, 4));
    await edited;
    expect(svc.of(25)?.rating).toBe(4);
    expect(svc.favorites()?.map((f) => f.id)).toEqual([8, 7]);
  });

  it('remove() borra y lo quita de la lista', async () => {
    const first = svc.load();
    http.expectOne(isList(1)).flush([fav(7, 25)]);
    await first;
    const r = svc.remove(7);
    const del = http.expectOne(`${URL}/7`);
    expect(del.request.method).toBe('DELETE');
    del.flush({});
    await r;
    expect(svc.of(25)).toBeUndefined();
  });

  it('un error al cargar deja un mensaje en español', async () => {
    const done = svc.load();
    http.expectOne(isList(1)).flush(null, { status: 500, statusText: 'Error' });
    await done;
    expect(svc.error()).toBe('No se pudieron cargar tus favoritos.');
  });
});
