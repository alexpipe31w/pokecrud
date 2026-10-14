import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import type { Favorite } from '@shared/protocol/course';

import { DatasetService } from '../../services/game/dataset.service';
import { FavoritesService } from '../../services/game/favorites.service';
import { FavoritesPage } from './favorites.page';

const fav = (id: number, pokemonId: number, rating: number, note = ''): Favorite => ({
  id,
  pokemonId,
  pokemonName: 'x',
  note,
  rating,
  createdAt: '',
});

describe('FavoritesPage', () => {
  let fixture: ComponentFixture<FavoritesPage>;
  const favorites = signal<Favorite[] | null>(null);
  const load = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    favorites.set(null);
    load.mockClear();
    await TestBed.configureTestingModule({
      imports: [FavoritesPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: FavoritesService, useValue: { favorites, error: signal(null), load } },
        {
          provide: DatasetService,
          useValue: {
            species: signal(
              new Map([
                [6, { names: { es: 'Charizard' }, types: ['fire'] }],
                [25, { names: { es: 'Pikachu' }, types: ['electric'] }],
              ]),
            ),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FavoritesPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });
  const el = () => fixture.nativeElement as HTMLElement;

  it('carga los favoritos al entrar', () => {
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('cada favorito: nombre en español, estrellas, nota, y abre la ficha de la Pokédex', () => {
    favorites.set([fav(1, 6, 5, 'El mejor'), fav(2, 25, 3)]);
    fixture.detectChanges();
    const cards = [...el().querySelectorAll<HTMLAnchorElement>('a.fav')];
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('href')).toBe('/pokedex/6');
    expect(cards[0].textContent).toContain('Charizard');
    expect(cards[0].textContent).toContain('El mejor');
    expect(cards[0].querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('5 de 5');
    expect(el().textContent).toContain('2 favoritos');
  });

  it('sin favoritos: vacía que manda a la Pokédex', () => {
    favorites.set([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('Aún no tienes favoritos');
    expect(el().querySelector('a[href="/pokedex"]')).not.toBeNull();
  });
});
