import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { BagService } from './bag.service';

describe('BagService', () => {
  const player = signal<{ id: string } | null>({ id: 'p1' });
  let bag: BagService;
  let http: HttpTestingController;

  beforeEach(() => {
    player.set({ id: 'p1' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { player } },
      ],
    });
    bag = TestBed.inject(BagService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => http.verify());

  const flushBag = async () => {
    const done = bag.load();
    http.expectOne(`${environment.serverUrl}/bag`).flush({
      items: [
        { item: 'POKE_BALL', qty: 30 },
        { item: 'GREAT_BALL', qty: 5 },
        { item: 'ULTRA_BALL', qty: 1 },
        { item: 'RAZZ_BERRY', qty: 5 },
      ],
    });
    await done;
  };

  it('carga la mochila y suma las bolas (no las bayas)', async () => {
    expect(bag.balls()).toBeNull();
    await flushBag();
    expect(bag.qty()?.RAZZ_BERRY).toBe(5);
    expect(bag.balls()).toBe(36);
  });

  it('si el servidor falla deja un error y no inventa cantidades', async () => {
    const done = bag.load();
    http
      .expectOne(`${environment.serverUrl}/bag`)
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await done;
    expect(bag.qty()).toBeNull();
    expect(bag.error()).toBe('No se pudo cargar la mochila.');
  });

  it('al cambiar de jugador o cerrar sesión se vacía', async () => {
    await flushBag();
    player.set(null);
    TestBed.tick();
    expect(bag.qty()).toBeNull();
  });
});
