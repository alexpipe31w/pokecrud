import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SettingsService } from '../../services/game/settings.service';
import {
  DEFAULT_CENTER,
  LocationService,
  type LocationStatus,
} from '../../services/location/location.service';
import { BallMenuComponent } from './ball-menu.component';

describe('BallMenuComponent', () => {
  let fixture: ComponentFixture<BallMenuComponent>;
  const router = { navigateByUrl: vi.fn(async () => true) };
  const auth = { logout: vi.fn(async () => undefined) };
  const haptics = { tap: vi.fn() };
  const location = {
    status: signal<LocationStatus>('ok'),
    position: signal<{ lat: number; lng: number } | null>(null),
    stop: vi.fn(async () => undefined),
    useGps: vi.fn(async () => undefined),
    useJoystickAt: vi.fn(),
  };
  const el = (): HTMLElement => fixture.nativeElement;
  const ball = (): HTMLButtonElement => el().querySelector('.ball')!;
  const sheet = (): HTMLElement => el().querySelector('.sheet')!;
  const item = (label: string): HTMLButtonElement =>
    [...el().querySelectorAll<HTMLButtonElement>('.sheet button')].find((b) =>
      b.textContent?.includes(label),
    )!;
  const openMenu = () => {
    ball().click();
    fixture.detectChanges();
  };
  /** jsdom no tiene PointerEvent: un Event con las propiedades que se leen. */
  const pointer = (type: string, clientY: number) =>
    sheet().dispatchEvent(Object.assign(new Event(type), { clientY }));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    location.status.set('ok');
    location.position.set(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
        { provide: LocationService, useValue: location },
        { provide: HapticsService, useValue: haptics },
        { provide: AudioService, useValue: { playSfx: vi.fn(() => Promise.resolve()) } },
      ],
    });
    fixture = TestBed.createComponent(BallMenuComponent);
    fixture.detectChanges();
  });

  it('cerrado: la hoja no se puede usar (inert) y la Poké Ball dice que no está abierta', () => {
    expect(sheet().hasAttribute('inert')).toBe(true);
    expect(ball().getAttribute('aria-expanded')).toBe('false');
  });

  it('la Poké Ball da háptico al pulsar y abre la hoja', () => {
    ball().dispatchEvent(new Event('pointerdown'));
    expect(haptics.tap).toHaveBeenCalled();
    openMenu();
    expect(sheet().classList).toContain('is-open');
    expect(sheet().hasAttribute('inert')).toBe(false);
    expect(ball().getAttribute('aria-expanded')).toBe('true');
  });

  it('Pokédex, Inventario, Combate de prueba, Equipos, Favoritos y Personalizados navegan y cierran el menú', () => {
    openMenu();
    item('Pokédex').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/pokedex');
    fixture.detectChanges();
    expect(sheet().classList).not.toContain('is-open');
    openMenu();
    item('Inventario').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inventario');
    fixture.detectChanges();
    openMenu();
    item('Combate de prueba').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/combate/prueba');
    fixture.detectChanges();
    openMenu();
    item('Equipos').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/equipos');
    fixture.detectChanges();
    openMenu();
    item('Favoritos').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/favoritos');
    fixture.detectChanges();
    openMenu();
    item('Personalizados').click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/personalizados');
  });

  it('Joystick: con GPS lo activa en la posición actual; en joystick vuelve al GPS', () => {
    location.position.set({ lat: 1, lng: 2 });
    openMenu();
    expect(item('Joystick').getAttribute('aria-checked')).toBe('false');
    item('Joystick').click();
    expect(location.useJoystickAt).toHaveBeenCalledWith({ lat: 1, lng: 2 });
    location.status.set('joystick');
    fixture.detectChanges();
    expect(item('Joystick').getAttribute('aria-checked')).toBe('true');
    item('Joystick').click();
    expect(location.useGps).toHaveBeenCalled();
  });

  it('Joystick sin posición conocida: empieza en el centro por defecto', () => {
    openMenu();
    item('Joystick').click();
    expect(location.useJoystickAt).toHaveBeenCalledWith(DEFAULT_CENTER);
  });

  it('Reducir efectos se guarda en los ajustes', () => {
    openMenu();
    item('Reducir efectos').click();
    expect(TestBed.inject(SettingsService).settings().reduceEffects).toBe(true);
  });

  it('Cerrar sesión: cierra la sesión y va al login', async () => {
    openMenu();
    item('Cerrar sesión').click();
    await fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('se cierra con Escape, tocando fuera y arrastrando hacia abajo (no con un arrastre corto)', () => {
    openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(sheet().classList).not.toContain('is-open');

    openMenu();
    el().querySelector<HTMLElement>('.backdrop')!.click();
    fixture.detectChanges();
    expect(sheet().classList).not.toContain('is-open');

    openMenu();
    pointer('pointerdown', 500);
    pointer('pointermove', 530);
    pointer('pointerup', 530);
    fixture.detectChanges();
    expect(sheet().classList).toContain('is-open');
    pointer('pointerdown', 500);
    pointer('pointermove', 620);
    pointer('pointerup', 620);
    fixture.detectChanges();
    expect(sheet().classList).not.toContain('is-open');
  });
});
