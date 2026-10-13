import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import type { CollectionItem } from '@shared/protocol/collection';
import type { Team } from '@shared/protocol/teams';

import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { TeamsService } from '../../services/game/teams.service';
import { TeamsPage } from './teams.page';

const team = (id: number, name: string, caughtIds: string[]): Team => ({
  id,
  name,
  description: '',
  pokemonIds: [],
  caughtIds,
  createdAt: '',
  updatedAt: '',
});
const item = (id: string, speciesId: number, cp: number): CollectionItem => ({
  id,
  speciesId,
  nickname: null,
  level: 10,
  cp,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '',
});

describe('TeamsPage', () => {
  let fixture: ComponentFixture<TeamsPage>;
  const teams = signal<Team[] | null>(null);
  const members = new Map([
    ['a', item('a', 6, 900)],
    ['b', item('b', 25, 300)],
  ]);
  const load = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    teams.set(null);
    load.mockClear();
    await TestBed.configureTestingModule({
      imports: [TeamsPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        {
          provide: TeamsService,
          useValue: {
            teams,
            loading: signal(false),
            error: signal(null),
            load,
            member: (id: string) => members.get(id),
          },
        },
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
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TeamsPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });
  const el = () => fixture.nativeElement as HTMLElement;

  it('carga los equipos al entrar', () => {
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('sin equipos: la vacía diseñada invita a crear el primero', () => {
    teams.set([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('Arma tu primer equipo');
    expect(el().querySelector('a[href="/equipos/nuevo"]')).not.toBeNull();
  });

  it('cada equipo enseña sus 6 huecos (arte y PC de los ocupados), cuántos lleva y el PC total', () => {
    teams.set([team(1, 'Fuego', ['a', 'b'])]);
    fixture.detectChanges();
    const card = el().querySelector<HTMLAnchorElement>('a.team')!;
    expect(card.getAttribute('href')).toBe('/equipos/1');
    expect(card.textContent).toContain('Fuego');
    expect(card.textContent).toContain('2/6');
    expect(card.textContent).toContain('PC 1200');
    expect(card.querySelectorAll('.slot')).toHaveLength(6);
    expect(card.querySelectorAll('.slot img')).toHaveLength(2);
    expect(card.getAttribute('aria-label')).toContain('Charizard');
  });
});
