import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ThrowResult } from '@shared/protocol/encounters';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LocationService } from '../location/location.service';
import { BagService } from './bag.service';
import {
  CLIENT_THROW_ID,
  EncounterApiService,
  THROW_RETRY_DELAY_MS,
} from './encounter-api.service';
import { SpawnFeedService } from './spawn-feed.service';

const ID = 'c1:99:0';
const URL = `${environment.serverUrl}/encounters/${encodeURIComponent(ID)}`;
const RESULT: ThrowResult = {
  clientThrowId: 'tid-1',
  captured: true,
  shakes: 3,
  fled: false,
  throwQuality: 'great',
  xpGained: 150,
  caught: null,
  bag: { items: [{ item: 'POKE_BALL', qty: 29 }] },
};
const REQ = {
  ball: 'POKE_BALL' as const,
  berry: null,
  throwQuality: 'great' as const,
  curve: false,
};

describe('EncounterApiService', () => {
  let api: EncounterApiService;
  let http: HttpTestingController;
  const bag = { apply: vi.fn() };
  const auth = { addXp: vi.fn(), player: signal({ id: 'p1' }) };
  const feed = { hide: vi.fn(), reportPosition: vi.fn(async () => true) };
  const position = signal<{ lat: number; lng: number } | null>({ lat: 2.9, lng: -75.3 });

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BagService, useValue: bag },
        { provide: AuthService, useValue: auth },
        { provide: SpawnFeedService, useValue: feed },
        { provide: LocationService, useValue: { position } },
        { provide: CLIENT_THROW_ID, useValue: () => 'tid-1' },
        { provide: THROW_RETRY_DELAY_MS, useValue: 0 },
      ],
    });
    api = TestBed.inject(EncounterApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** El siguiente POST de lanzamiento (puede salir tras un reintento asíncrono). */
  const nextThrow = () => vi.waitFor(() => http.expectOne({ method: 'POST', url: `${URL}/throw` }));

  it('view pide el encuentro con el id codificado', async () => {
    const done = api.view(ID);
    http.expectOne(URL).flush({ id: ID });
    expect(await done).toEqual({ id: ID });
  });

  it('throw manda el lanzamiento con su id y reparte la respuesta', async () => {
    const done = api.throw(ID, REQ);
    const req = await nextThrow();
    expect(req.request.body).toEqual({ ...REQ, clientThrowId: 'tid-1' });
    req.flush(RESULT);
    expect(await done).toEqual(RESULT);
    expect(bag.apply).toHaveBeenCalledWith(RESULT.bag);
    expect(auth.addXp).toHaveBeenCalledWith(150);
    expect(feed.hide).toHaveBeenCalledWith(ID);
  });

  it('si se escapa sin huir, el Pokémon sigue en el mapa', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).flush({ ...RESULT, captured: false, shakes: 1 });
    await done;
    expect(feed.hide).not.toHaveBeenCalled();
  });

  it('sin red reintenta con el MISMO clientThrowId', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).error(new ProgressEvent('error'));
    const again = await nextThrow();
    expect(again.request.body.clientThrowId).toBe('tid-1');
    again.flush(RESULT);
    expect((await done).captured).toBe(true);
  });

  it('tras 3 intentos con 5xx se rinde', async () => {
    const done = api.throw(ID, REQ);
    const failed = expect(done).rejects.toBeInstanceOf(HttpErrorResponse);
    for (let i = 0; i < 3; i++) {
      (await nextThrow()).flush('caído', { status: 502, statusText: 'Bad Gateway' });
    }
    await failed;
  });

  it('403 (lejos): manda la posición de ahora y lo intenta una vez más', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).flush({}, { status: 403, statusText: 'Forbidden' });
    const again = await nextThrow();
    expect(feed.reportPosition).toHaveBeenCalledWith({ lat: 2.9, lng: -75.3 });
    again.flush(RESULT);
    expect((await done).captured).toBe(true);
  });

  it('409 (sin bolas / ya resuelto) no se reintenta', async () => {
    const done = api.throw(ID, REQ);
    const failed = expect(done).rejects.toMatchObject({ status: 409 });
    (await nextThrow()).flush({}, { status: 409, statusText: 'Conflict' });
    await failed;
  });
});
