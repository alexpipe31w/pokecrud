import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fromLocalM } from '@shared/engine/geo';
import type { NearbySpawns } from '@shared/protocol/spawns';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { SpawnFeedService } from './spawn-feed.service';

const O = { lat: 2.9273, lng: -75.2819 };
const T0 = Date.parse('2026-10-12T20:00:00Z');
const body = (over: Partial<NearbySpawns> = {}): NearbySpawns => ({
  slot: 1,
  expiresAt: new Date(T0 + 300_000).toISOString(),
  weather: 'rain',
  night: false,
  spawns: [{ id: 'a', speciesId: 25, lat: O.lat, lng: O.lng }],
  ...over,
});

describe('SpawnFeedService', () => {
  const player = signal<{ id: string } | null>({ id: 'p1' });
  let feed: SpawnFeedService;
  let http: HttpTestingController;
  const url = `${environment.serverUrl}/spawns`;

  beforeEach(() => {
    player.set({ id: 'p1' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { player } },
      ],
    });
    feed = TestBed.inject(SpawnFeedService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => http.verify());

  const respond = async (done: Promise<void>, res: NearbySpawns = body()) => {
    http.expectOne((r) => r.url === url).flush(res);
    await done;
  };

  it('el primer tick pide con lat/lng (6 decimales) y publica spawns, clima y noche', async () => {
    const done = feed.tick({ lat: O.lat + 1.23456789e-7, lng: O.lng }, T0);
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('lat')).toBe(
      String(Math.round((O.lat + 1.23456789e-7) * 1e6) / 1e6),
    );
    expect(req.request.params.get('lng')).toBe(String(O.lng));
    req.flush(body());
    await done;
    expect(feed.spawns().map((s) => s.id)).toEqual(['a']);
    expect(feed.weather()).toBe('rain');
    expect(feed.night()).toBe(false);
  });

  it('un segundo tick inmediato en el mismo sitio no pide; al acabar la franja, sí', async () => {
    await respond(feed.tick(O, T0));
    await feed.tick(O, T0 + 1000);
    http.expectNone((r) => r.url === url);
    await respond(feed.tick(O, T0 + 302_000), body({ spawns: [] }));
    expect(feed.spawns()).toEqual([]);
  });

  it('moverse más de 60 m pide de nuevo (pasados 8 s)', async () => {
    await respond(feed.tick(O, T0));
    await respond(feed.tick(fromLocalM(O, 0, 70), T0 + 9000));
  });

  it('un 503 deja el error y conserva la lista anterior; luego espera antes de reintentar', async () => {
    await respond(feed.tick(O, T0));
    const done = feed.tick(O, T0 + 302_000);
    http
      .expectOne((r) => r.url === url)
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await done;
    expect(feed.error()).toBe('Los Pokémon salvajes no están disponibles ahora mismo.');
    expect(feed.spawns().map((s) => s.id)).toEqual(['a']);
    await feed.tick(O, T0 + 304_000); // < 5 s tras el fallo
    http.expectNone((r) => r.url === url);
    await respond(feed.tick(O, T0 + 308_000));
    expect(feed.error()).toBeNull();
  });

  it('al cambiar de jugador se vacía', async () => {
    await respond(feed.tick(O, T0));
    player.set({ id: 'p2' });
    TestBed.tick();
    expect(feed.spawns()).toEqual([]);
    expect(feed.weather()).toBeNull();
  });
});
