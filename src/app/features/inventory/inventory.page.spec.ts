import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { InventoryPage } from './inventory.page';

const LIST_URL = `${environment.serverUrl}/pokemon?_sort=id&_order=asc`;

describe('InventoryPage', () => {
  let fixture: ComponentFixture<InventoryPage>;
  let http: HttpTestingController;

  const setup = async (admin = false) => {
    await TestBed.configureTestingModule({
      imports: [InventoryPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAdmin: signal(admin) } },
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  };
  const flush = async (list: unknown[]) => {
    http.expectOne(LIST_URL).flush(list);
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () => [...el().querySelectorAll<HTMLAnchorElement>('a.inv-card')];

  it('lists the pokemon from the database as cards that open their detail', async () => {
    await setup();
    await flush([
      { id: 1, name: 'bulbasaur', types: ['grass', 'poison'], price: 6400, stock: 12 },
      { id: 150, name: 'mewtwo', types: ['psychic'], price: 30600, stock: 5 },
    ]);

    const text = el().textContent as string;
    expect(text).toContain('#001');
    expect(text).toContain('Mewtwo');
    expect(text).toContain('2 de 2 Pokémon');
    expect(cards()).toHaveLength(2);
    expect(cards()[1].getAttribute('href')).toBe('/pokemon/150');
    expect(cards()[1].getAttribute('aria-label')).toContain('Mewtwo');
  });

  it('marks the ones without stock as "Agotado"', async () => {
    await setup();
    await flush([
      { id: 25, name: 'pikachu', types: ['electric'], price: 11200, stock: 0 },
      { id: 4, name: 'charmander', types: ['fire'], price: 6200, stock: 3 },
    ]);
    expect(cards()[0].textContent).toContain('Agotado');
    expect(cards()[1].textContent).not.toContain('Agotado');
    expect(cards()[1].textContent).toContain('3 en stock');
  });

  it('shows 20 at first and 20 more on infinite scroll', async () => {
    await setup();
    await flush(
      Array.from({ length: 45 }, (_, i) => ({
        id: i + 1,
        name: `poke${i + 1}`,
        types: ['normal'],
        price: 100,
        stock: 1,
      })),
    );
    expect(cards()).toHaveLength(20);

    const page = fixture.componentInstance as unknown as {
      loadMore(e: { target: { complete(): void } }): void;
    };
    page.loadMore({ target: { complete: () => undefined } });
    fixture.detectChanges();
    expect(cards()).toHaveLength(40);
  });

  it('only an admin sees "Agregar"', async () => {
    await setup(false);
    await flush([]);
    expect(el().querySelector('.add')).toBeNull();
    TestBed.resetTestingModule();

    await setup(true);
    await flush([]);
    expect(el().querySelector('.add')?.textContent).toContain('Agregar');
  });
});
