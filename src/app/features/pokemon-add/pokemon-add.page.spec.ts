import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { PokemonDraft, PokemonRef } from '../../models/pokemon.model';
import { UiService } from '../../services/ui.service';
import { PokemonAddPage } from './pokemon-add.page';

const LIST_URL = `${environment.pokeApiUrl}/pokemon?limit=2000`;
const POKEAPI_LIST = {
  results: [
    { name: 'pikachu', url: `${environment.pokeApiUrl}/pokemon/25/` },
    { name: 'raichu', url: `${environment.pokeApiUrl}/pokemon/26/` },
    { name: 'lucario', url: `${environment.pokeApiUrl}/pokemon/448/` },
  ],
};
const LUCARIO_RAW = {
  id: 448,
  name: 'lucario',
  height: 12,
  weight: 540,
  base_experience: 184,
  types: [
    { slot: 2, type: { name: 'steel' } },
    { slot: 1, type: { name: 'fighting' } },
  ],
  abilities: [{ ability: { name: 'steadfast' } }],
  stats: [
    { base_stat: 70, stat: { name: 'hp' } },
    { base_stat: 110, stat: { name: 'attack' } },
    { base_stat: 70, stat: { name: 'defense' } },
    { base_stat: 115, stat: { name: 'special-attack' } },
    { base_stat: 70, stat: { name: 'special-defense' } },
    { base_stat: 90, stat: { name: 'speed' } },
  ],
  sprites: {
    front_default: 'front.png',
    other: { 'official-artwork': { front_default: 'art.png' } },
  },
};

/** Acceso a los miembros protegidos de la página desde la prueba. */
interface PageApi {
  onSearch(e: Event): void;
  pick(ref: PokemonRef): void;
  save(draft: PokemonDraft): void;
  selected(): PokemonDraft | null;
  alreadySaved(): boolean;
}

describe('PokemonAddPage (HU-03 · CREATE)', () => {
  let fixture: ComponentFixture<PokemonAddPage>;
  let http: HttpTestingController;
  const ui = { toast: vi.fn() };
  const nav = { navigateBack: vi.fn() };
  const page = () => fixture.componentInstance as unknown as PageApi;
  const search = (value: string) => {
    page().onSearch(new CustomEvent('ionInput', { detail: { value } }));
    fixture.detectChanges();
  };

  /** Elige a Lucario y responde a las dos peticiones (¿ya existe? y datos de PokéAPI). */
  const pickLucario = (existsInDb: boolean) => {
    page().pick({ id: 448, name: 'lucario' });
    const exists = http.expectOne(`${environment.apiUrl}/pokemon/448`);
    if (existsInDb) exists.flush({ id: 448 });
    else exists.flush(null, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${environment.pokeApiUrl}/pokemon/448`).flush(LUCARIO_RAW);
  };

  beforeEach(async () => {
    ui.toast.mockReset();
    nav.navigateBack.mockReset();
    await TestBed.configureTestingModule({
      imports: [PokemonAddPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UiService, useValue: ui },
        { provide: NavController, useValue: nav },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonAddPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(LIST_URL).flush(POKEAPI_LIST);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('finds pokemon of any generation by name or number', () => {
    search('chu');
    expect(fixture.nativeElement.textContent).toContain('Pikachu');
    expect(fixture.nativeElement.textContent).toContain('Raichu');

    search('448');
    expect(fixture.nativeElement.textContent).toContain('Lucario');
    expect(fixture.nativeElement.textContent).not.toContain('Pikachu');

    search('missingno');
    expect(fixture.nativeElement.textContent).toContain('No se encontró ningún Pokémon');
  });

  it('prefills the form with the PokéAPI data', () => {
    pickLucario(false);
    expect(page().selected()).toMatchObject({
      id: 448,
      name: 'lucario',
      types: ['fighting', 'steel'],
      height: 1.2,
      weight: 54,
      price: 18400,
      stats: { hp: 70, specialAttack: 115 },
    });
  });

  it('saves the new pokemon with POST and goes back to the Pokédex', () => {
    pickLucario(false);
    page().save(page().selected()!);

    const req = http.expectOne(`${environment.apiUrl}/pokemon`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ id: 448, name: 'lucario' });
    expect(req.request.body.createdAt).toBeTruthy();
    req.flush(req.request.body);

    expect(ui.toast).toHaveBeenCalledWith('Lucario agregado a la Pokédex');
    expect(nav.navigateBack).toHaveBeenCalledWith('/tabs/pokedex');
  });

  it('warns instead of saving when the pokemon is already in the database', () => {
    pickLucario(true);
    fixture.detectChanges();
    expect(page().alreadySaved()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('ya está en la base de datos');

    page().save(page().selected()!);
    http.expectNone(`${environment.apiUrl}/pokemon`);
    expect(ui.toast).toHaveBeenCalledWith(expect.stringContaining('#448 ya está'), 'warning');
  });
});
