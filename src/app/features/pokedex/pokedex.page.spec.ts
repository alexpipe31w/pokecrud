import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IonItemSliding, provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { UiService } from '../../services/ui.service';
import { PokedexPage, filterByType } from './pokedex.page';

const LIST = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], price: 6400, stock: 12 },
  { id: 4, name: 'charmander', types: ['fire'], price: 6200, stock: 33 },
  { id: 6, name: 'charizard', types: ['fire', 'flying'], price: 26700, stock: 47 },
  { id: 25, name: 'pikachu', types: ['electric'], price: 11200, stock: 30 },
];

/** Acceso a los miembros protegidos de la página desde la prueba. */
interface PageApi {
  selectType(type: string | null): void;
  onSearch(e: Event): void;
  availableTypes(): string[];
  remove(p: { id: number; name: string }, sliding: IonItemSliding): Promise<void>;
}

describe('PokedexPage', () => {
  let fixture: ComponentFixture<PokedexPage>;
  let http: HttpTestingController;
  const ui = { confirm: vi.fn(), toast: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokedexPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UiService, useValue: ui },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokedexPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('lists the pokemon from the database', async () => {
    http.expectOne(`${environment.apiUrl}/pokemon?_sort=id&_order=asc`).flush([
      { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], price: 6400, stock: 12 },
      { id: 150, name: 'mewtwo', types: ['psychic'], price: 30600, stock: 5 },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('#001');
    expect(text).toContain('Mewtwo');
    expect(text).toContain('2 de 2 Pokémon');
  });

  it('shows 20 at first and 20 more on infinite scroll', async () => {
    const all = Array.from({ length: 45 }, (_, i) => ({
      id: i + 1,
      name: `poke${i + 1}`,
      types: ['normal'],
      price: 100,
      stock: 1,
    }));
    http.expectOne(`${environment.apiUrl}/pokemon?_sort=id&_order=asc`).flush(all);
    await fixture.whenStable();
    fixture.detectChanges();
    const items = () => fixture.nativeElement.querySelectorAll('ion-item-sliding').length;
    expect(items()).toBe(20);

    const page = fixture.componentInstance as unknown as {
      loadMore(e: { target: { complete(): void } }): void;
    };
    page.loadMore({ target: { complete: () => undefined } });
    fixture.detectChanges();
    expect(items()).toBe(40);
  });

  describe('filtro por tipo (HU-14)', () => {
    const page = () => fixture.componentInstance as unknown as PageApi;
    const names = () =>
      Array.from(fixture.nativeElement.querySelectorAll('ion-item-sliding h2') as NodeList).map(
        (h) => h.textContent?.trim(),
      );

    beforeEach(async () => {
      http.expectOne(`${environment.apiUrl}/pokemon?_sort=id&_order=asc`).flush(LIST);
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('only offers the types that the saved pokemon have', () => {
      expect(page().availableTypes()).toEqual(['fire', 'electric', 'grass', 'poison', 'flying']);
      const chips = fixture.nativeElement.querySelectorAll('.type-filter__chip');
      expect(chips[0].textContent.trim()).toBe('Todos');
      expect(chips).toHaveLength(6);
    });

    it('shows only the pokemon of the chosen type, including dual types', () => {
      page().selectType('fire');
      fixture.detectChanges();
      expect(names()).toEqual(['Charmander', 'Charizard']);
      const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
      expect(text).toContain('2 de 4 Pokémon de tipo Fuego');
    });

    it('clears the filter when the active type or "Todos" is tapped', () => {
      page().selectType('fire');
      page().selectType('fire');
      fixture.detectChanges();
      expect(names()).toHaveLength(4);

      page().selectType('grass');
      page().selectType(null);
      fixture.detectChanges();
      expect(names()).toHaveLength(4);
    });

    it('combines with the search box', () => {
      page().selectType('fire');
      page().onSearch(new CustomEvent('ionInput', { detail: { value: 'izard' } }));
      fixture.detectChanges();
      expect(names()).toEqual(['Charizard']);
    });

    it('says so when no pokemon matches the type and the search', () => {
      page().selectType('electric');
      page().onSearch(new CustomEvent('ionInput', { detail: { value: 'char' } }));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No se encontró ningún Pokémon');
    });
  });

  describe('eliminar (HU-03 · DELETE)', () => {
    const sliding = { close: () => Promise.resolve(true) } as unknown as IonItemSliding;
    const page = () => fixture.componentInstance as unknown as PageApi;

    beforeEach(async () => {
      ui.confirm.mockReset();
      ui.toast.mockReset();
      http.expectOne(`${environment.apiUrl}/pokemon?_sort=id&_order=asc`).flush(LIST);
      await fixture.whenStable();
    });

    it('deletes the pokemon after the user confirms', async () => {
      ui.confirm.mockResolvedValue(true);
      await page().remove(LIST[3], sliding);

      const req = http.expectOne(`${environment.apiUrl}/pokemon/25`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      expect(ui.toast).toHaveBeenCalledWith('Pikachu eliminado');
    });

    it('does nothing when the user cancels', async () => {
      ui.confirm.mockResolvedValue(false);
      await page().remove(LIST[3], sliding);

      http.expectNone(`${environment.apiUrl}/pokemon/25`);
      expect(ui.toast).not.toHaveBeenCalled();
    });
  });
});

describe('filterByType', () => {
  it('returns every pokemon when no type is chosen', () => {
    expect(filterByType(LIST, null)).toBe(LIST);
  });

  it('keeps the pokemon that have the type in any slot', () => {
    expect(filterByType(LIST, 'flying').map((p) => p.id)).toEqual([6]);
    expect(filterByType(LIST, 'poison').map((p) => p.id)).toEqual([1]);
    expect(filterByType(LIST, 'water')).toEqual([]);
  });
});
