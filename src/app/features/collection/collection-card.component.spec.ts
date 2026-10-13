import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CollectionItem } from '@shared/protocol/collection';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';
import { CollectionCardComponent } from './collection-card.component';

const item = (over: Partial<CollectionItem> = {}): CollectionItem => ({
  id: 'c1',
  speciesId: 25,
  nickname: null,
  level: 12,
  cp: 412,
  gender: 'M',
  shiny: false,
  favorite: false,
  caughtAt: '2026-10-13T12:00:00.000Z',
  ...over,
});

describe('CollectionCardComponent', () => {
  const render = (it: CollectionItem) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: DatasetService,
          useValue: {
            species: signal(
              new Map([[25, { names: { es: 'Pikachu', en: 'Pikachu' }, types: ['electric'] }]]),
            ),
          },
        },
      ],
    });
    const f = TestBed.createComponent(CollectionCardComponent);
    f.componentRef.setInput('item', it);
    f.componentRef.setInput('index', 0);
    f.detectChanges();
    return { el: f.nativeElement as HTMLElement, f };
  };

  it('enlaza a su ficha y se anuncia con nombre, PC y nivel (sin "shiny" si no lo es)', () => {
    const a = render(item()).el.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/coleccion/c1');
    const label = a.getAttribute('aria-label')!;
    expect(label).toContain('Pikachu');
    expect(label).toContain('PC 412');
    expect(label).toContain('nivel 12');
    expect(label).not.toContain('shiny');
    expect(label).not.toContain('favorito');
  });

  it('con mote, shiny y favorito: lo dice y usa el arte variocolor', () => {
    const { el } = render(item({ nickname: 'Chispa', shiny: true, favorite: true }));
    const label = el.querySelector('a')!.getAttribute('aria-label')!;
    expect(label).toContain('Chispa (Pikachu)');
    expect(label).toContain('shiny');
    expect(label).toContain('favorito');
    expect(el.querySelector('img')!.getAttribute('src')).toBe(spriteUrls(25, true)[0]);
  });

  it('si el arte no carga, prueba el siguiente de la lista', () => {
    const { el, f } = render(item());
    const img = el.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(img.getAttribute('src')).toBe(spriteUrls(25)[1]);
  });
  it('modo selección (F3-06b): es un botón con aria-pressed que emite al pulsarlo, sin enlace', () => {
    const { el, f } = render(item());
    f.componentRef.setInput('selectable', true);
    f.componentRef.setInput('selected', true);
    f.detectChanges();
    const toggled: string[] = [];
    f.componentInstance.toggled.subscribe((id: string) => toggled.push(id));
    expect(el.querySelector('a')).toBeNull();
    const btn = el.querySelector('button')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toContain('Pikachu');
    btn.click();
    expect(toggled).toEqual(['c1']);
    f.componentRef.setInput('selected', false);
    f.componentRef.setInput('disabled', true);
    f.detectChanges();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.disabled).toBe(true);
  });
});
