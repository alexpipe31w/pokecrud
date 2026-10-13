import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController, NavController, provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { PokemonDetailPage } from './pokemon-detail.page';

const PIKACHU = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  abilities: ['static'],
  imageUrl: '',
  height: 0.4,
  weight: 6,
  baseExperience: 112,
  stats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  price: 11200,
  stock: 0,
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z',
};

describe('PokemonDetailPage', () => {
  let fixture: ComponentFixture<PokemonDetailPage>;
  let http: HttpTestingController;
  const navigateBack = vi.fn();
  const alertCreate = vi.fn();

  const setup = async (admin = false) => {
    navigateBack.mockReset();
    alertCreate.mockReset();
    await TestBed.configureTestingModule({
      imports: [PokemonDetailPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAdmin: signal(admin) } },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
        { provide: NavController, useValue: { navigateBack } },
        { provide: AlertController, useValue: { create: alertCreate } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonDetailPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', '25');
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  };
  const flushPikachu = async (over: object = {}) => {
    http.expectOne(`${environment.serverUrl}/pokemon/25`).flush({ ...PIKACHU, ...over });
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.includes(text));

  afterEach(() => TestBed.resetTestingModule());

  it('shows the pokemon data loaded from the database, with the game stat bars', async () => {
    await setup();
    await flushPikachu();

    const text = el().textContent as string;
    expect(text).toContain('#025');
    expect(text).toContain('Pikachu');
    expect(text).toContain('Agotado');
    expect(el().querySelectorAll('app-stat-bar')).toHaveLength(6);
    expect(button('Editar')).toBeUndefined();
    expect(button('Eliminar')).toBeUndefined();
  });

  it('shows the units in stock when there are some', async () => {
    await setup();
    await flushPikachu({ stock: 12 });
    expect(el().textContent).toContain('12 uds.');
  });

  it('says so when the pokemon is not in the database', async () => {
    await setup();
    http
      .expectOne(`${environment.serverUrl}/pokemon/25`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el().textContent).toContain('no está en la base de datos');
  });

  it('an admin deletes after a designed confirmation (no Ionic alert) and goes back to the list', async () => {
    await setup(true);
    await flushPikachu();

    button('Eliminar')!.click();
    fixture.detectChanges();
    const dialog = el().querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('¿Eliminar a Pikachu (#025) del inventario?');
    http.expectNone(`${environment.serverUrl}/pokemon/25`);

    button('Cancelar')!.click();
    fixture.detectChanges();
    expect(el().querySelector('[role="alertdialog"]')).toBeNull();

    button('Eliminar')!.click();
    fixture.detectChanges();
    (el().querySelector('[role="alertdialog"] button.danger') as HTMLButtonElement).click();
    const del = http.expectOne(`${environment.serverUrl}/pokemon/25`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await fixture.whenStable();
    expect(navigateBack).toHaveBeenCalledWith('/inventario');
    expect(alertCreate).not.toHaveBeenCalled();
  });
});
