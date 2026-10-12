import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import {
  DEFAULT_CENTER,
  LocationService,
  type LocationStatus,
} from '../../services/location/location.service';
import { LocationGateComponent, SEARCHING_NOTICE_MS } from './location-gate.component';

describe('LocationGateComponent', () => {
  let fixture: ComponentFixture<LocationGateComponent>;
  const location = {
    status: signal<LocationStatus>('idle'),
    position: signal<{ lat: number; lng: number } | null>(null),
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    useGps: vi.fn(async () => undefined),
    useJoystickAt: vi.fn(),
  };
  const text = (): string => fixture.nativeElement.textContent;
  const buttons = (): HTMLButtonElement[] => [...fixture.nativeElement.querySelectorAll('button')];
  const press = (label: string) => buttons().find((b) => b.textContent?.includes(label))!.click();

  function show(status: LocationStatus) {
    location.status.set(status);
    TestBed.tick();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    location.status.set('idle');
    location.position.set(null);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: LocationService, useValue: location },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn(() => Promise.resolve()) } },
      ],
    });
    fixture = TestBed.createComponent(LocationGateComponent);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('idle: pide la ubicación y "Permitir ubicación" arranca el GPS', () => {
    expect(text()).toContain('Necesitamos tu ubicación');
    press('Permitir ubicación');
    expect(location.start).toHaveBeenCalled();
  });

  it(`searching: no tapa el mapa hasta pasados ${SEARCHING_NOTICE_MS} ms sin señal`, () => {
    show('searching');
    expect(fixture.nativeElement.querySelector('.veil')).toBeNull();
    vi.advanceTimersByTime(SEARCHING_NOTICE_MS);
    TestBed.tick();
    expect(text()).toContain('Buscando señal GPS');
    expect(text()).toContain('Usar joystick mientras tanto');
  });

  it('denied: "Jugar con joystick" arranca el joystick en el centro por defecto', () => {
    show('denied');
    expect(text()).toContain('Sin permiso de ubicación');
    press('Jugar con joystick');
    expect(location.useJoystickAt).toHaveBeenCalledWith(DEFAULT_CENTER);
  });

  it('denied: "Reintentar" vuelve a probar con el GPS', () => {
    show('denied');
    press('Reintentar');
    expect(location.useGps).toHaveBeenCalled();
  });

  it('weak: solo un aviso pequeño, sin tapar el mapa', () => {
    show('weak');
    expect(fixture.nativeElement.querySelector('.veil')).toBeNull();
    expect(text()).toContain('GPS débil');
  });

  it('ok y joystick: no muestra nada', () => {
    show('ok');
    expect(text().trim()).toBe('');
    show('joystick');
    expect(text().trim()).toBe('');
  });
});
