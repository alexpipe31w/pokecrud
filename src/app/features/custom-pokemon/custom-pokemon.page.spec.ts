import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import type { CustomPokemon } from '@shared/protocol/course';

import { CustomPokemonService } from '../../services/game/custom-pokemon.service';
import { CustomPokemonPage } from './custom-pokemon.page';

const mon = (id: number, name: string, imageUrl = ''): CustomPokemon => ({
  id,
  name,
  types: ['fire', 'flying'],
  stats: { hp: 50, attack: 60, defense: 40, speed: 70 },
  imageUrl,
  description: '',
  createdAt: '',
});

describe('CustomPokemonPage', () => {
  let fixture: ComponentFixture<CustomPokemonPage>;
  const list = signal<CustomPokemon[] | null>(null);
  const load = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    list.set(null);
    load.mockClear();
    await TestBed.configureTestingModule({
      imports: [CustomPokemonPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: CustomPokemonService, useValue: { list, error: signal(null), load } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CustomPokemonPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });
  const el = () => fixture.nativeElement as HTMLElement;

  it('carga al entrar y cada tarjeta abre su editor, con tipos y total de stats', () => {
    expect(load).toHaveBeenCalledTimes(1);
    list.set([mon(2, 'Flamita', 'https://example.com/f.png'), mon(1, 'Sin foto')]);
    fixture.detectChanges();
    const cards = [...el().querySelectorAll<HTMLAnchorElement>('a.mon')];
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('href')).toBe('/personalizados/2');
    expect(cards[0].textContent).toContain('Flamita');
    expect(cards[0].textContent).toContain('Fuego');
    expect(cards[0].textContent).toContain('Total 220');
    expect(cards[1].querySelector('.silhouette')).not.toBeNull();
  });

  it('vacía diseñada con "Crear Pokémon"', () => {
    list.set([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('Inventa tu propio Pokémon');
    expect(el().querySelector('a[href="/personalizados/nuevo"]')).not.toBeNull();
  });
});
