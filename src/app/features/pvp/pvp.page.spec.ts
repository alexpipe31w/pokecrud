import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import type { Team } from '@shared/protocol/teams';

import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { TeamsService } from '../../services/game/teams.service';
import { type LobbyPhase, type PvpMatch, PvpLobbyStore } from './pvp-lobby.store';
import { PvpPage } from './pvp.page';

const team = (id: number, name: string, caughtIds: string[]): Team => ({
  id,
  name,
  description: '',
  pokemonIds: [],
  caughtIds,
  createdAt: '',
  updatedAt: '',
});

describe('PvpPage', () => {
  let fixture: ComponentFixture<PvpPage>;
  const teams = signal<Team[] | null>(null);
  const store = {
    phase: signal<LobbyPhase>('menu'),
    teamId: signal<number | null>(null),
    code: signal<string | null>(null),
    match: signal<PvpMatch | null>(null),
    notice: signal<string | null>(null),
    busy: signal(false),
    rejections: signal(0),
    remainingS: signal(300),
    enter: vi.fn(async () => undefined),
    leave: vi.fn(async () => undefined),
    invite: vi.fn(async () => undefined),
    openJoin: vi.fn(),
    join: vi.fn(async () => undefined),
    searchRival: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    forfeit: vi.fn(async () => undefined),
  };
  const load = vi.fn(async () => undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    teams.set(null);
    store.phase.set('menu');
    store.teamId.set(null);
    store.notice.set(null);
    await TestBed.configureTestingModule({
      imports: [PvpPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        {
          provide: TeamsService,
          useValue: { teams, error: signal(null), load, member: () => undefined },
        },
        { provide: AuthService, useValue: { player: signal({ nickname: 'alexdemo' }) } },
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
    })
      .overrideComponent(PvpPage, {
        set: { providers: [{ provide: PvpLobbyStore, useValue: store }] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(PvpPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  });
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el().querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === text,
    ) as HTMLButtonElement;

  it('al entrar carga los equipos y entra en la sala; al salir la deja', () => {
    expect(load).toHaveBeenCalled();
    expect(store.enter).toHaveBeenCalled();
    fixture.componentInstance.ionViewWillLeave();
    expect(store.leave).toHaveBeenCalled();
  });

  it('sin equipos con Pokémon: invita a crear uno', () => {
    teams.set([team(1, 'Vacío', [])]);
    fixture.detectChanges();
    expect(el().textContent).toContain('Necesitas un equipo');
    expect(el().querySelector('a[href="/equipos/nuevo"]')).not.toBeNull();
  });

  it('elige solo el primer equipo válido y deja cambiarlo; los botones llaman al store', () => {
    teams.set([team(1, 'Vacío', []), team(2, 'Fuego', ['a']), team(3, 'Agua', ['b'])]);
    fixture.detectChanges();
    expect(store.teamId()).toBe(2);
    const radios = el().querySelectorAll<HTMLButtonElement>('[role="radio"]');
    expect([...radios].map((r) => r.textContent?.trim())).toEqual(['Fuego', 'Agua']);
    radios[1].click();
    fixture.detectChanges();
    expect(store.teamId()).toBe(3);
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
  });

  it('cada fase pinta lo suyo: conectando, código, teclado, cola, cara a cara y error', () => {
    const text = (phase: LobbyPhase) => {
      store.phase.set(phase);
      fixture.detectChanges();
      return el().textContent ?? '';
    };
    expect(text('connecting')).toContain('Entrando en la arena');
    store.code.set('ABC234');
    expect(text('inviting')).toContain('Caduca en 5:00');
    expect(el().querySelector('app-pvp-code [role="text"]')?.getAttribute('aria-label')).toBe(
      'Código A B C 2 3 4',
    );
    expect(text('joining')).toContain('Escribe el código de tu rival');
    expect(text('queue')).toContain('Buscando rival');
    store.match.set({ battleId: 'b', opponent: 'ash', myLead: 25, foeLead: 6, foeTeamSize: 3 });
    const vs = text('matched');
    expect(vs).toContain('¡Rival encontrado!');
    expect(el().querySelector('app-pvp-versus [role="img"]')?.getAttribute('aria-label')).toBe(
      'alexdemo con Pikachu contra ash con Charizard',
    );
    store.notice.set('Sin conexión con el servidor. Inténtalo otra vez.');
    expect(text('error')).toContain('Sin conexión');
  });

  it('rendirse pide confirmación antes de llamar al store', () => {
    store.match.set({ battleId: 'b', opponent: 'ash', myLead: 25, foeLead: 6, foeTeamSize: 3 });
    store.phase.set('matched');
    fixture.detectChanges();
    button('Rendirse').click();
    fixture.detectChanges();
    expect(store.forfeit).not.toHaveBeenCalled();
    button('Rendirme').click();
    expect(store.forfeit).toHaveBeenCalled();
  });
});
