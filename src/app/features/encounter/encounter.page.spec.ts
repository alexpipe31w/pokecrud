import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EncounterView } from '@shared/protocol/encounters';

import { CameraService, type CameraState } from '../../services/ar/camera.service';
import { OrientationService } from '../../services/ar/orientation.service';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { EncounterApiService } from '../../services/game/encounter-api.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SettingsService } from '../../services/game/settings.service';
import { ENCOUNTER_STAGE, EncounterPage, NO_GYRO_MS, encounterErrorText } from './encounter.page';

const view: EncounterView = {
  id: '12:34:5',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: false,
  heightScale: 1.45,
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

describe('EncounterPage', () => {
  const api = { view: vi.fn() };
  const playCry = vi.fn(() => Promise.resolve(true));
  const camState = signal<CameraState>('off');
  const camera = { state: camState, open: vi.fn(async () => null), close: vi.fn() };
  const orientation = { start: vi.fn(), stop: vi.fn(), pose: vi.fn(() => false) };
  const stage = {
    onFrame: null as ((now: number) => void) | null,
    start: vi.fn(),
    stop: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const createStage = vi.fn(() => stage);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    camState.set('off');
    stage.onFrame = null;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [EncounterPage],
      providers: [
        provideRouter([]),
        { provide: EncounterApiService, useValue: api },
        { provide: AudioService, useValue: { playCry } },
        // El plugin real de Capacitor no existe en web.
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        {
          provide: DatasetService,
          useValue: {
            load: () => Promise.resolve(),
            species: () =>
              new Map([[25, { names: { es: 'Pikachu' }, height: 4, types: ['electric'] }]]),
          },
        },
        { provide: CameraService, useValue: camera },
        { provide: OrientationService, useValue: orientation },
        { provide: ENCOUNTER_STAGE, useValue: createStage },
      ],
    });
  });

  const open = async (result: Promise<EncounterView>) => {
    api.view.mockReturnValueOnce(result);
    const f = TestBed.createComponent(EncounterPage);
    f.componentRef.setInput('id', '12:34:5');
    f.detectChanges();
    f.componentInstance.ionViewWillEnter();
    await settle(f);
    return f;
  };
  /** Deja correr las promesas (la API es un doble: Angular no las ve como tareas pendientes) y repinta. */
  const settle = async (f: { whenStable(): Promise<unknown> }) => {
    await new Promise((r) => setTimeout(r, 0));
    await f.whenStable();
  };
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('abre el encuentro: nombre, nivel, XL, grito, escena, sensores y cámara', async () => {
    const f = await open(Promise.resolve(view));
    expect(api.view).toHaveBeenCalledWith('12:34:5');
    expect(text(f)).toContain('Pikachu');
    expect(text(f)).toContain('Nv. 12');
    expect(text(f)).toContain('XL');
    expect(playCry).toHaveBeenCalledWith(25);
    expect(createStage).toHaveBeenCalledTimes(1);
    expect(stage.start).toHaveBeenCalled();
    expect(orientation.start).toHaveBeenCalled();
    expect(camera.open).toHaveBeenCalled();
  });

  it('un 403 dice que está demasiado lejos y no monta la escena', async () => {
    const f = await open(Promise.reject(new HttpErrorResponse({ status: 403 })));
    expect(text(f)).toContain('Estás demasiado lejos.');
    expect(createStage).not.toHaveBeenCalled();
  });

  it('si ya lo capturó, lo dice y no monta la escena', async () => {
    const f = await open(Promise.resolve({ ...view, status: 'caught' }));
    expect(text(f)).toContain('Ya lo atrapaste.');
    expect(createStage).not.toHaveBeenCalled();
  });

  it('al salir suelta cámara, sensores y bucle; al destruir, la GPU', async () => {
    const f = await open(Promise.resolve(view));
    f.componentInstance.ionViewWillLeave();
    expect(camera.close).toHaveBeenCalled();
    expect(orientation.stop).toHaveBeenCalled();
    expect(stage.stop).toHaveBeenCalled();
    f.destroy();
    expect(stage.dispose).toHaveBeenCalled();
  });

  it('apagar la AR lo guarda y suelta la cámara', async () => {
    const f = await open(Promise.resolve(view));
    camera.close.mockClear();
    (f.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Realidad aumentada"]')!
      .click();
    expect(TestBed.inject(SettingsService).settings().arEnabled).toBe(false);
    expect(camera.close).toHaveBeenCalled();
  });

  it('sin permiso de cámara o sin giroscopio lo explica', async () => {
    const f = await open(Promise.resolve(view));
    camState.set('denied');
    await settle(f);
    expect(text(f)).toContain('Sin permiso de cámara');
    camState.set('off');
    stage.onFrame!(performance.now() + NO_GYRO_MS + 100);
    await settle(f);
    expect(text(f)).toContain('Sin giroscopio');
  });
});
