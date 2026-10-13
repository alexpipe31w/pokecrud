import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CollectionItem } from '@shared/protocol/collection';
import type { Team } from '@shared/protocol/teams';
import { environment } from '../../../environments/environment';
import { TeamsService } from './teams.service';

const TEAMS = `${environment.serverUrl}/teams`;
const COLLECTION = `${environment.serverUrl}/collection`;
const team = (id: number, caughtIds: string[], name = `Equipo ${id}`): Team => ({
  id,
  name,
  description: '',
  pokemonIds: [],
  caughtIds,
  createdAt: '2026-10-13T12:00:00.000Z',
  updatedAt: '2026-10-13T12:00:00.000Z',
});
const item = (id: string, speciesId = 25): CollectionItem => ({
  id,
  speciesId,
  nickname: null,
  level: 10,
  cp: 100,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '2026-10-13T12:00:00.000Z',
});

describe('TeamsService', () => {
  let svc: TeamsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(TeamsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('load() trae los equipos (los más antiguos primero) y luego sus Pokémon con UNA petición ?ids', async () => {
    const done = svc.load();
    http
      .expectOne(`${TEAMS}?_sort=createdAt&_order=asc`)
      .flush([team(1, ['a', 'b']), team(2, ['b', 'c']), team(3, [])]);
    await Promise.resolve();
    const req = http.expectOne((r) => r.url === COLLECTION);
    expect(req.request.params.get('ids')).toBe('a,b,c');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({ items: [item('a', 1), item('b', 4), item('c', 7)], nextCursor: null, total: 3 });
    await done;
    expect(svc.teams()?.map((t) => t.id)).toEqual([1, 2, 3]);
    expect(svc.member('b')?.speciesId).toBe(4);
    expect(svc.loading()).toBe(false);
  });

  it('sin Pokémon en ningún equipo no pide la colección', async () => {
    const done = svc.load();
    http.expectOne(`${TEAMS}?_sort=createdAt&_order=asc`).flush([team(1, [])]);
    await done;
    http.expectNone((r) => r.url === COLLECTION);
    expect(svc.teams()).toHaveLength(1);
  });

  it('un error deja un mensaje en español', async () => {
    const done = svc.load();
    http
      .expectOne(`${TEAMS}?_sort=createdAt&_order=asc`)
      .flush(null, { status: 500, statusText: 'Error' });
    await done;
    expect(svc.error()).toBe('No se pudieron cargar tus equipos.');
  });

  it('create, update y remove llaman a /teams y dejan la lista al día', async () => {
    const first = svc.load();
    http.expectOne(`${TEAMS}?_sort=createdAt&_order=asc`).flush([]);
    await first;

    const c = svc.create('Fuego', ['x'], [item('x', 4)]);
    const post = http.expectOne(TEAMS);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      name: 'Fuego',
      description: '',
      pokemonIds: [],
      caughtIds: ['x'],
    });
    post.flush(team(9, ['x'], 'Fuego'));
    await c;
    expect(svc.teams()?.map((t) => t.name)).toEqual(['Fuego']);
    expect(svc.member('x')?.speciesId).toBe(4);

    const u = svc.update(9, { name: 'Lava', caughtIds: [] });
    const patch = http.expectOne(`${TEAMS}/9`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ name: 'Lava', caughtIds: [] });
    patch.flush(team(9, [], 'Lava'));
    await u;
    expect(svc.teams()?.[0].name).toBe('Lava');

    const r = svc.remove(9);
    const del = http.expectOne(`${TEAMS}/9`);
    expect(del.request.method).toBe('DELETE');
    del.flush({});
    await r;
    expect(svc.teams()).toEqual([]);
  });
});
