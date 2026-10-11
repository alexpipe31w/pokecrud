import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { PokemonDetailPage } from './pokemon-detail.page';

describe('PokemonDetailPage', () => {
  let fixture: ComponentFixture<PokemonDetailPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonDetailPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonDetailPage);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', '25');
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('shows the pokemon data loaded from the database', async () => {
    http.expectOne(`${environment.apiUrl}/pokemon/25`).flush({
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
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('#025');
    expect(text).toContain('Pikachu');
    expect(text).toContain('0 uds.');
  });

  it('says so when the pokemon is not in the database', async () => {
    http
      .expectOne(`${environment.apiUrl}/pokemon/25`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no está en la base de datos');
  });
});
