import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CollectionItem, CollectionPage } from '@shared/protocol/collection';
import { environment } from '../../../environments/environment';
import { CollectionService } from './collection.service';

const URL = `${environment.serverUrl}/collection`;
const item = (id: string, over: Partial<CollectionItem> = {}): CollectionItem => ({
  id,
  speciesId: 25,
  nickname: null,
  level: 10,
  cp: 100,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '2026-10-13T12:00:00.000Z',
  ...over,
});
const page = (ids: string[], nextCursor: string | null, total = ids.length): CollectionPage => ({
  items: ids.map((id) => item(id)),
  nextCursor,
  total,
});

describe('CollectionService', () => {
  let svc: CollectionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(CollectionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** La petición pendiente (comprueba la URL sin la query) y sus parámetros. */
  const pending = () => {
    const req = http.expectOne((r) => r.url === URL);
    return { req, params: req.request.params };
  };

  it('load() pide la primera página (recientes primero, 30) y publica items, total y hasMore', async () => {
    const done = svc.load();
    const { req, params } = pending();
    expect(params.get('sort')).toBe('caughtAt');
    expect(params.get('order')).toBe('desc');
    expect(params.get('limit')).toBe('30');
    expect(params.has('cursor')).toBe(false);
    req.flush(page(['a', 'b'], 'b', 40));
    await done;
    expect(svc.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(svc.total()).toBe(40);
    expect(svc.hasMore()).toBe(true);
  });

  it('loadMore() manda el cursor y AÑADE; dos seguidos hacen una sola petición; sin más páginas no pide', async () => {
    const first = svc.load();
    pending().req.flush(page(['a'], 'a', 2));
    await first;

    const m1 = svc.loadMore();
    const m2 = svc.loadMore();
    const { req, params } = pending();
    expect(params.get('cursor')).toBe('a');
    req.flush(page(['b'], null, 2));
    await Promise.all([m1, m2]);
    expect(svc.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(svc.hasMore()).toBe(false);

    await svc.loadMore(); // sin cursor: no hay petición (verify() lo comprueba)
  });

  it('setQuery() vacía la lista y recarga desde el principio con el nuevo orden y filtros', async () => {
    const first = svc.load();
    pending().req.flush(page(['a'], 'a'));
    await first;

    const again = svc.setQuery({ sort: 'cp', shiny: true, type: 'fire' });
    expect(svc.items()).toEqual([]);
    const { req, params } = pending();
    expect(params.get('sort')).toBe('cp');
    expect(params.get('shiny')).toBe('true');
    expect(params.get('type')).toBe('fire');
    expect(params.has('favorite')).toBe(false); // lo no puesto no viaja
    req.flush(page(['z'], null));
    await again;
    expect(svc.items().map((i) => i.id)).toEqual(['z']);
  });

  it('un error de red deja un mensaje en español y la lista anterior intacta', async () => {
    const first = svc.load();
    pending().req.flush(page(['a'], 'a'));
    await first;

    const more = svc.loadMore();
    pending().req.error(new ProgressEvent('error'));
    await more;
    expect(svc.error()).toMatch(/No se pudo/);
    expect(svc.items().map((i) => i.id)).toEqual(['a']);
  });

  it('una respuesta vieja (de antes de cambiar los filtros) no pisa la nueva', async () => {
    const old = svc.load();
    const oldReq = pending().req;
    const fresh = svc.setQuery({ favorite: true });
    const reqs = http.match((r) => r.url === URL);
    const freshReq = reqs.find((r) => r.request.params.get('favorite') === 'true')!;
    freshReq.flush(page(['nuevo'], null));
    oldReq.flush(page(['viejo'], null));
    await Promise.all([old, fresh]);
    expect(svc.items().map((i) => i.id)).toEqual(['nuevo']);
  });

  it('invalidate() vacía la lista (la próxima visita recarga) y descarta lo que estuviera en camino', async () => {
    const first = svc.load();
    const req = pending().req;
    svc.invalidate();
    req.flush(page(['viejo'], null));
    await first;
    expect(svc.items()).toEqual([]);
    expect(svc.total()).toBeNull();
    expect(svc.loading()).toBe(false);
  });

  it('patchItem, removeItem y restoreItem cambian la lista sin pedir nada', async () => {
    const first = svc.load();
    pending().req.flush(page(['a', 'b', 'c'], null, 3));
    await first;

    svc.patchItem('b', { nickname: 'Chispa', favorite: true });
    expect(svc.items()[1]).toMatchObject({ nickname: 'Chispa', favorite: true });

    const removed = svc.removeItem('b');
    expect(svc.items().map((i) => i.id)).toEqual(['a', 'c']);
    expect(svc.total()).toBe(2);

    svc.restoreItem(removed!.item, removed!.index);
    expect(svc.items().map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(svc.total()).toBe(3);
  });

  it('F3-03: detail, patch (deja la fila de la lista al día) y transfer llaman a /collection/:id', async () => {
    const first = svc.load();
    pending().req.flush(page(['a', 'b'], null));
    await first;

    const d = svc.detail('a');
    const getReq = http.expectOne(`${URL}/a`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({ ...item('a'), stats: {} });
    expect((await d).id).toBe('a');

    const p = svc.patch('b', { nickname: 'Chispa' });
    const patchReq = http.expectOne(`${URL}/b`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ nickname: 'Chispa' });
    patchReq.flush(item('b', { nickname: 'Chispa' }));
    await p;
    expect(svc.items()[1].nickname).toBe('Chispa');

    const t = svc.transfer('a');
    const delReq = http.expectOne(`${URL}/a`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ candy: { familyId: 10, qty: 4, gained: 1 } });
    expect((await t).candy.gained).toBe(1);
  });
  it('F3-05: evolve() hace POST /collection/:id/evolve y deja la fila de la lista con la especie y el PC nuevos', async () => {
    const first = svc.load();
    pending().req.flush(page(['a', 'b'], null));
    await first;

    const e = svc.evolve('a', 26);
    const req = http.expectOne(`${URL}/a/evolve`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ to: 26 });
    req.flush({
      ...item('a', { speciesId: 26, cp: 250 }),
      stats: {},
      candy: { familyId: 10, qty: 0 },
    });
    expect((await e).speciesId).toBe(26);
    expect(svc.items()[0]).toMatchObject({ id: 'a', speciesId: 26, cp: 250 });
    expect(svc.items()[1].speciesId).toBe(25);
  });
});
