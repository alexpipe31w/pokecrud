import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { PokedexPage } from './pokedex.page';

describe('PokedexPage', () => {
  let fixture: ComponentFixture<PokedexPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokedexPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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
});
