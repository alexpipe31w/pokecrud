import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { TypeName } from '@shared/data/dataset.types';
import type { CollectionSort } from '@shared/protocol/collection';
import { POKEMON_TYPES, POKEMON_TYPE_KEYS } from '../../core/constants/pokemon-types';
import { CollectionService } from '../../services/game/collection.service';
import { HapticsService } from '../../services/game/haptics.service';

/** Arrastrar la hoja más de esto hacia abajo la cierra (como el menú de la Poké Ball). */
const DRAG_CLOSE_PX = 80;

const SORTS: { key: CollectionSort; label: string }[] = [
  { key: 'caughtAt', label: 'Recientes' },
  { key: 'cp', label: 'PC' },
  { key: 'speciesId', label: 'Nº' },
];

/**
 * Hoja de orden y filtros de "Mis Pokémon" (F3-02b). Cada cambio se aplica al momento (`CollectionService.setQuery`),
 * sin botón "Aplicar". Se cierra tocando fuera, arrastrando hacia abajo, con Escape o con "Listo".
 */
@Component({
  selector: 'app-collection-filters',
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" [class.is-open]="open()" (click)="closed.emit()" aria-hidden="true"></div>
    <div
      class="sheet"
      role="dialog"
      aria-label="Orden y filtros"
      [class.is-open]="open()"
      [class.is-dragging]="dragY() > 0"
      [style.transform]="open() && dragY() > 0 ? 'translateY(' + dragY() + 'px)' : null"
      [attr.inert]="open() ? null : ''"
    >
      <div
        class="grip"
        aria-hidden="true"
        (pointerdown)="dragStart($event)"
        (pointermove)="dragMove($event)"
        (pointerup)="dragEnd()"
        (pointercancel)="dragEnd()"
      ></div>
      <h2>Ordenar</h2>
      <div class="row" role="radiogroup" aria-label="Ordenar por">
        @for (s of sorts; track s.key) {
          <button
            #first
            type="button"
            role="radio"
            [attr.aria-checked]="filters().sort === s.key"
            (click)="set({ sort: s.key })"
          >
            {{ s.label }}
          </button>
        }
        <button
          type="button"
          class="dir"
          [attr.aria-label]="filters().order === 'desc' ? 'De mayor a menor' : 'De menor a mayor'"
          (click)="set({ order: filters().order === 'desc' ? 'asc' : 'desc' })"
        >
          {{ filters().order === 'desc' ? '↓' : '↑' }}
        </button>
      </div>
      <h2>Tipo</h2>
      <div class="types" role="radiogroup" aria-label="Tipo">
        @for (t of types; track t) {
          <button
            type="button"
            role="radio"
            class="type"
            [attr.aria-checked]="filters().type === t"
            [style.--c]="typeColor(t)"
            [style.--t]="typeText(t)"
            (click)="set({ type: filters().type === t ? undefined : t })"
          >
            {{ typeLabel(t) }}
          </button>
        }
      </div>
      <div class="row">
        <button
          type="button"
          role="switch"
          [attr.aria-checked]="filters().shiny === true"
          (click)="set({ shiny: filters().shiny ? undefined : true })"
        >
          ✦ Shiny
        </button>
        <button
          type="button"
          role="switch"
          [attr.aria-checked]="filters().favorite === true"
          (click)="set({ favorite: filters().favorite ? undefined : true })"
        >
          ★ Favoritos
        </button>
      </div>
      <div class="row end">
        <button type="button" class="plain" [disabled]="!collection.filtered()" (click)="clear()">
          Quitar filtros
        </button>
        <button type="button" class="done" (click)="closed.emit()">Listo</button>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      background: color-mix(in srgb, var(--ink) 45%, transparent);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--dur-panel) var(--ease-drawer);
    }
    .sheet {
      position: fixed;
      z-index: 31;
      inset: auto 0 0;
      display: grid;
      gap: var(--s-2);
      padding: var(--s-2) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      border-radius: var(--r-sheet) var(--r-sheet) 0 0;
      background: var(--surface-opaque);
      color: var(--surface-text);
      box-shadow: var(--shadow-lg);
      transform: translateY(100%);
      transition: transform var(--dur-panel) var(--ease-drawer);
    }
    .is-open {
      opacity: 1;
      pointer-events: auto;
    }
    .sheet.is-open {
      transform: none;
    }
    .is-dragging {
      transition: none;
    }
    .grip {
      justify-self: center;
      width: 64px;
      height: 24px;
      touch-action: none;
      background: linear-gradient(currentColor, currentColor) center / 40px 5px no-repeat;
      opacity: 0.35;
    }
    h2 {
      margin: var(--s-1) 0 0;
      font: 600 0.85rem/1 var(--font-display);
    }
    .row,
    .types {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s-2);
    }
    .end {
      justify-content: space-between;
    }
    button {
      min-height: 44px;
      padding: 0 var(--s-4);
      border: 0;
      border-radius: var(--r-chip);
      background: color-mix(in srgb, var(--surface-text) 10%, transparent);
      color: inherit;
      font: 600 0.9rem/1 system-ui;
      transition: transform var(--dur-press) var(--ease-out);
    }
    button:active {
      transform: scale(0.97);
    }
    [aria-checked='true'] {
      background: var(--ink);
      color: var(--paper);
    }
    .type {
      min-height: 36px;
      background: color-mix(in srgb, var(--c), transparent 70%);
    }
    .type[aria-checked='true'] {
      background: var(--c);
      color: var(--t);
    }
    .done {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .plain {
      background: none;
    }
  `,
})
export class CollectionFiltersComponent {
  protected readonly collection = inject(CollectionService);
  private readonly haptics = inject(HapticsService);
  readonly open = input(false);
  readonly closed = output<void>();
  private readonly first = viewChild<ElementRef<HTMLButtonElement>>('first');

  protected readonly sorts = SORTS;
  protected readonly types = POKEMON_TYPE_KEYS as TypeName[];
  protected readonly filters = this.collection.filters;
  protected readonly dragY = signal(0);
  private dragFrom: number | null = null;

  constructor() {
    // Al abrir, el foco entra en la hoja (teclado y lector de pantalla).
    effect(() => {
      if (this.open()) this.first()?.nativeElement.focus();
    });
  }

  protected set(patch: Parameters<CollectionService['setQuery']>[0]): void {
    this.haptics.tap();
    void this.collection.setQuery(patch);
  }

  protected clear(): void {
    this.haptics.tap();
    void this.collection.clearFilters();
  }

  protected typeLabel = (t: string): string => POKEMON_TYPES[t]?.label ?? t;
  protected typeColor = (t: string): string => POKEMON_TYPES[t]?.color ?? 'var(--ink-2)';
  protected typeText = (t: string): string => POKEMON_TYPES[t]?.text ?? 'var(--ink)';

  protected dragStart(e: PointerEvent): void {
    this.dragFrom = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  protected dragMove(e: PointerEvent): void {
    if (this.dragFrom === null) return;
    this.dragY.set(Math.max(0, e.clientY - this.dragFrom));
  }

  protected dragEnd(): void {
    if (this.dragY() > DRAG_CLOSE_PX) this.closed.emit();
    this.dragFrom = null;
    this.dragY.set(0);
  }
}
