import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Favorite } from '@shared/protocol/course';
import { AudioService } from '../../services/game/audio.service';
import { FavoritesService } from '../../services/game/favorites.service';
import { HapticsService } from '../../services/game/haptics.service';
import { FavoriteToggleComponent } from './favorite-toggle.component';

describe('FavoriteToggleComponent', () => {
  const list = signal<Favorite[] | null>([]);
  const save = vi.fn();
  const remove = vi.fn();
  const byId = computed(() => new Map((list() ?? []).map((f) => [f.pokemonId, f])));

  const render = async (existing?: Favorite) => {
    list.set(existing ? [existing] : []);
    save.mockReset().mockResolvedValue(undefined);
    remove.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FavoritesService,
          useValue: {
            favorites: list,
            load: vi.fn().mockResolvedValue(undefined),
            of: (id: number) => byId().get(id),
            save,
            remove,
          },
        },
        { provide: HapticsService, useValue: { tap: vi.fn(), success: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    });
    const f = TestBed.createComponent(FavoriteToggleComponent);
    f.componentRef.setInput('speciesId', 6);
    f.componentRef.setInput('name', 'charizard');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const btn = (text: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes(text),
      );
    return { f, el, btn };
  };
  afterEach(() => TestBed.resetTestingModule());

  it('sin favorito: "♡ Favorito"; la hoja guarda las estrellas y la nota elegidas', async () => {
    const { f, el, btn } = await render();
    expect(btn('Favorito')!.getAttribute('aria-pressed')).toBe('false');
    btn('Favorito')!.click();
    f.detectChanges();
    expect(el.querySelector('[role="dialog"]')?.classList).toContain('is-open');
    el.querySelectorAll<HTMLButtonElement>('button[role="radio"]')[3].click();
    f.detectChanges();
    const note = el.querySelector<HTMLTextAreaElement>('textarea')!;
    note.value = 'Mi primero';
    note.dispatchEvent(new Event('input'));
    btn('Guardar')!.click();
    await f.whenStable();
    expect(save).toHaveBeenCalledWith({
      pokemonId: 6,
      pokemonName: 'charizard',
      rating: 4,
      note: 'Mi primero',
    });
  });

  it('ya favorito: lo dice con sus estrellas y se puede quitar', async () => {
    const { f, btn } = await render({
      id: 3,
      pokemonId: 6,
      pokemonName: 'charizard',
      note: 'Hola',
      rating: 5,
      createdAt: '',
    });
    expect(btn('Favorito')!.getAttribute('aria-pressed')).toBe('true');
    btn('Favorito')!.click();
    f.detectChanges();
    btn('Quitar de favoritos')!.click();
    await f.whenStable();
    expect(remove).toHaveBeenCalledWith(3);
  });
});
