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
});
