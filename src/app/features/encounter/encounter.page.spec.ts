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
import * as THREE from 'three';

import type { EncounterScene } from '../../game/encounter-scene/encounter-scene';
import {
  ENCOUNTER_STAGE,
  EncounterPage,
  NO_GYRO_MS,
  POKEMON_MODEL,
  encounterErrorText,
} from './encounter.page';

const view: EncounterView = {
  id: '12:34:5',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: false,
  heightScale: 1.45,
  cp: 312,
  expiresAt: '2026-10-12T20:10:00Z',
  status: 'open',
};

/** Lo que la pantalla lee de la ficha (tamaño, tipo y personalidad). */
const PIKACHU = {
  names: { es: 'Pikachu' },
  height: 4,
  types: ['electric'],
  baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
  captureRate: 190,
  shape: 'quadruped',
  isLegendary: false,
  isMythical: false,
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
  const playSfx = vi.fn(() => Promise.resolve());
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
  const createStage = vi.fn((_c: HTMLCanvasElement, _w: EncounterScene) => stage);
  /** Modelo 3D de prueba: una caja (F2-12). */
  const cube = () => ({
    scene: new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))) as THREE.Group,
    clips: [],
  });
  const loadModel = vi.fn(async (_id: number, _shiny: boolean) => cube() as ReturnType<typeof cube> | null);

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
        { provide: AudioService, useValue: { playCry, playSfx } },
        // El plugin real de Capacitor no existe en web.
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        {
          provide: DatasetService,
          useValue: {
            load: () => Promise.resolve(),
            species: () => new Map([[25, PIKACHU]]),
          },
        },
        { provide: CameraService, useValue: camera },
        { provide: OrientationService, useValue: orientation },
        { provide: ENCOUNTER_STAGE, useValue: createStage },
        { provide: POKEMON_MODEL, useValue: loadModel },
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

  it('abre el encuentro: nombre, nivel, XL, escena, sensores y cámara', async () => {
    const f = await open(Promise.resolve(view));
    expect(api.view).toHaveBeenCalledWith('12:34:5');
    expect(text(f)).toContain('Pikachu');
    expect(text(f)).toContain('Nv. 12');
    expect(text(f)).toContain('XL');
    expect(createStage).toHaveBeenCalledTimes(1);
    expect(stage.start).toHaveBeenCalled();
    expect(orientation.start).toHaveBeenCalled();
    expect(camera.open).toHaveBeenCalled();
  });

  it('al tocar el suelo (F2-04b): grito completo y golpe, una sola vez', async () => {
    await open(Promise.resolve(view));
    expect(playCry).not.toHaveBeenCalled();
    stage.onFrame!(performance.now() + 600);
    stage.onFrame!(performance.now() + 700);
    expect(playCry).toHaveBeenCalledTimes(1);
    expect(playCry).toHaveBeenCalledWith(25);
    expect(playSfx).toHaveBeenCalledWith('land');
  });

  it('si es shiny suena su destello', async () => {
    await open(Promise.resolve({ ...view, shiny: true }));
    stage.onFrame!(performance.now() + 600);
    expect(playSfx).toHaveBeenCalledWith('shiny');
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

  it('pone el modelo 3D del Pokémon (F2-12); sin modelo se queda el plano', async () => {
    await open(Promise.resolve(view));
    expect(loadModel).toHaveBeenCalledWith(25, false);
    const world = createStage.mock.calls[0][1];
    expect(world.model).not.toBeNull();
    createStage.mockClear();
    loadModel.mockResolvedValueOnce(null);
    await open(Promise.resolve(view));
    expect(createStage.mock.calls[0][1].model).toBeNull();
  });

  it('arrastrar el dedo en horizontal gira al Pokémon', async () => {
    const f = await open(Promise.resolve(view));
    const world = createStage.mock.calls[0][1];
    const spin = vi.spyOn(world, 'spin');
    const el = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('.stage')!;
    // jsdom no tiene PointerEvent: un MouseEvent con el nombre del evento de puntero trae lo que se lee (clientX).
    const ev = (type: string, x: number) =>
      el.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 400, bubbles: true }));
    ev('pointerdown', 100);
    ev('pointermove', 160);
    ev('pointerup', 160);
    ev('pointermove', 300); // ya soltado: no gira
    expect(spin).toHaveBeenCalledTimes(1);
    expect(spin.mock.calls[0][0]).toBeGreaterThan(0);
  });
});
