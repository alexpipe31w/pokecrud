import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EncounterView } from '@shared/protocol/encounters';

import { environment } from '../../../environments/environment';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { EncounterPage, encounterErrorText } from './encounter.page';

const view: EncounterView = {
  id: '12:34:5',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: false,
  heightScale: 1,
  expiresAt: '2026-10-12T20:10:00Z',
  status: 'open',
};

describe('encounterErrorText (D-028)', () => {
  it('cada error del servidor tiene su texto', () => {
    expect(encounterErrorText(403)).toBe('Estás demasiado lejos.');
    expect(encounterErrorText(410)).toBe('Se ha ido…');
    expect(encounterErrorText(409)).toBe('Ya lo intentaste.');
    expect(encounterErrorText(404)).toBe('Este Pokémon ya no está.');
    expect(encounterErrorText(undefined)).toContain('conexión');
  });
});

describe('EncounterPage (provisional)', () => {
  let http: HttpTestingController;
  const playCry = vi.fn(() => Promise.resolve(true));

  beforeEach(() => {
    playCry.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [EncounterPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AudioService, useValue: { playCry } },
        // El plugin real de Capacitor no existe en web (y Angular le llamaría a ngOnDestroy al cerrar el TestBed).
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        {
          provide: DatasetService,
          useValue: {
            load: () => Promise.resolve(),
            species: () => new Map([[25, { names: { es: 'Pikachu' } }]]),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const open = async (id = '12:34:5') => {
    const f = TestBed.createComponent(EncounterPage);
    f.componentRef.setInput('id', id);
    f.componentInstance.ionViewWillEnter();
    return f;
  };

  it('pide el encuentro con el id codificado, enseña nombre y nivel y suena su grito', async () => {
    const f = await open();
    http.expectOne(`${environment.serverUrl}/encounters/12%3A34%3A5`).flush(view);
    await f.whenStable();
    const text = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pikachu');
    expect(text).toContain('Nivel 12');
    expect(playCry).toHaveBeenCalledWith(25);
  });

  it('un 403 dice que está demasiado lejos', async () => {
    const f = await open();
    http
      .expectOne(`${environment.serverUrl}/encounters/12%3A34%3A5`)
      .flush('lejos', { status: 403, statusText: 'Forbidden' });
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Estás demasiado lejos.');
  });
});
