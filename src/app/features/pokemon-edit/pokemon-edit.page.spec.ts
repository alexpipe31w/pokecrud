import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { Pokemon, PokemonDraft } from '../../models/pokemon.model';
import { UiService } from '../../services/ui.service';
import { PokemonEditPage } from './pokemon-edit.page';

const PIKACHU: Pokemon = {
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
  stock: 30,
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z',
};

describe('PokemonEditPage (HU-03 · UPDATE)', () => {
  let fixture: ComponentFixture<PokemonEditPage>;
  let http: HttpTestingController;
  const ui = { toast: vi.fn() };
  const nav = { navigateBack: vi.fn() };
  const url = `${environment.apiUrl}/pokemon/25`;
  const save = (draft: PokemonDraft) =>
    (fixture.componentInstance as unknown as { save(d: PokemonDraft): void }).save(draft);

  beforeEach(async () => {
    ui.toast.mockReset();
    nav.navigateBack.mockReset();
    await TestBed.configureTestingModule({
      imports: [PokemonEditPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UiService, useValue: ui },
        { provide: NavController, useValue: nav },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonEditPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', '25');
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the pokemon into the form', async () => {
    http.expectOne(url).flush(PIKACHU);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-pokemon-form')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Editar Pikachu');
  });

  it('saves the changes with PUT, keeping createdAt, and goes back to the detail', async () => {
    http.expectOne(url).flush(PIKACHU);
    await fixture.whenStable();

    save({ ...PIKACHU, price: 99000, stock: 2 });
    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({
      id: 25,
      price: 99000,
      stock: 2,
      createdAt: PIKACHU.createdAt,
    });
    expect(req.request.body.updatedAt).not.toBe(PIKACHU.updatedAt);
    req.flush({ ...PIKACHU, price: 99000, stock: 2 });

    expect(ui.toast).toHaveBeenCalledWith('Pikachu actualizado');
    expect(nav.navigateBack).toHaveBeenCalledWith(['/pokemon', 25]);
  });

  it('stays on the form and re-enables saving when the backend fails', async () => {
    http.expectOne(url).flush(PIKACHU);
    await fixture.whenStable();

    save({ ...PIKACHU, price: 1 });
    const saving = (fixture.componentInstance as unknown as { saving(): boolean }).saving;
    expect(saving()).toBe(true);
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    // El mensaje de error lo muestra el interceptor (ver error.interceptor.spec.ts).
    expect(saving()).toBe(false);
    expect(ui.toast).not.toHaveBeenCalled();
    expect(nav.navigateBack).not.toHaveBeenCalled();
  });

  it('says so when the pokemon is not in the database', async () => {
    http.expectOne(url).flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no está en la base de datos');
  });
});
