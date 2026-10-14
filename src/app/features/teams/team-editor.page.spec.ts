import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import type { CollectionItem } from '@shared/protocol/collection';
import type { Team } from '@shared/protocol/teams';

import { AudioService } from '../../services/game/audio.service';
import { CollectionService } from '../../services/game/collection.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { TeamsService } from '../../services/game/teams.service';
import { TeamEditorPage } from './team-editor.page';

const item = (id: string): CollectionItem => ({
  id,
  speciesId: 25,
  nickname: null,
  level: 10,
  cp: 100,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '',
});
const ITEMS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map(item);
const team = (caughtIds: string[]): Team => ({
  id: 4,
  name: 'Viejo',
  description: '',
  pokemonIds: [],
  caughtIds,
  createdAt: '',
  updatedAt: '',
});

describe('TeamEditorPage', () => {
  let fixture: ComponentFixture<TeamEditorPage>;
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const navigateBack = vi.fn();
  const teams = signal<Team[] | null>(null);

  const setup = async (id: string | undefined) => {
    for (const f of [create, update, remove, navigateBack]) f.mockReset();
    create.mockResolvedValue(team([]));
    update.mockResolvedValue(team([]));
    remove.mockResolvedValue(undefined);
    teams.set([team(['p2', 'p3'])]);
    await TestBed.configureTestingModule({
      imports: [TeamEditorPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        {
          provide: TeamsService,
          useValue: {
            teams,
            load: vi.fn().mockResolvedValue(undefined),
            member: (i: string) => ITEMS.find((x) => x.id === i),
            create,
            update,
            remove,
          },
        },
        {
          provide: CollectionService,
          useValue: {
            items: signal(ITEMS),
            loading: signal(false),
            hasMore: computed(() => false),
            load: vi.fn().mockResolvedValue(undefined),
            loadMore: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DatasetService,
          useValue: {
            species: signal(new Map([[25, { names: { es: 'Pikachu' }, types: ['electric'] }]])),
          },
        },
        { provide: NavController, useValue: { navigateBack } },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TeamEditorPage);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  afterEach(() => TestBed.resetTestingModule());
  const el = () => fixture.nativeElement as HTMLElement;
  const pick = (id: string) => {
    [...el().querySelectorAll<HTMLButtonElement>('app-collection-card button')][
      ITEMS.findIndex((i) => i.id === id)
    ].click();
    fixture.detectChanges();
  };
  const name = (v: string) => {
    const input = el().querySelector<HTMLInputElement>('#team-name')!;
    input.value = v;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const saveBtn = () =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Guardar'),
    )!;

  it('nuevo: elige hasta 6 (el 7º queda deshabilitado), quita al volver a pulsar, y crea con nombre e ids', async () => {
    await setup(undefined);
    expect(saveBtn().disabled).toBe(true);
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) pick(id);
    expect(el().textContent).toContain('6/6');
    const seventh = el().querySelectorAll<HTMLButtonElement>('app-collection-card button')[6];
    expect(seventh.disabled).toBe(true);
    pick('p2');
    expect(el().textContent).toContain('5/6');
    name('  Mi equipo  ');
    saveBtn().click();
    await fixture.whenStable();
    expect(create).toHaveBeenCalledWith(
      'Mi equipo',
      ['p1', 'p3', 'p4', 'p5', 'p6'],
      expect.any(Array),
    );
    expect(navigateBack).toHaveBeenCalledWith('/equipos');
  });

  it('editar: arranca con su nombre y sus Pokémon, guarda con PATCH', async () => {
    await setup('4');
    expect(el().querySelector<HTMLInputElement>('#team-name')!.value).toBe('Viejo');
    expect(el().textContent).toContain('2/6');
    pick('p1');
    saveBtn().click();
    await fixture.whenStable();
    expect(update).toHaveBeenCalledWith(
      4,
      { name: 'Viejo', caughtIds: ['p2', 'p3', 'p1'] },
      expect.any(Array),
    );
  });

  it('borrar el equipo pide confirmación propia', async () => {
    await setup('4');
    [...el().querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('Borrar equipo'))!
      .click();
    fixture.detectChanges();
    expect(el().querySelector('[role="alertdialog"]')?.textContent).toContain(
      '¿Borrar el equipo «Viejo»?',
    );
    expect(remove).not.toHaveBeenCalled();
    el().querySelector<HTMLButtonElement>('[role="alertdialog"] button.danger')!.click();
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledWith(4);
    expect(navigateBack).toHaveBeenCalledWith('/equipos');
  });
});
