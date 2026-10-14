import { Component, computed, inject, input, output } from '@angular/core';
import type { CollectionItem } from '@shared/protocol/collection';
import { TEAM_MAX } from '@shared/protocol/teams';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';

interface Slot {
  key: string;
  item: CollectionItem | null;
  art: string;
  tint: string;
  name: string;
}

/**
 * Los 6 huecos de un equipo (F3-06b): arte del Pokémon sobre un círculo con el color de su tipo y su PC; los libres,
 * círculos discontinuos. Con `removable` (editor) cada hueco ocupado es un botón que lo quita.
 */
@Component({
  selector: 'app-team-slots',
  template: `
    @for (s of slots(); track s.key) {
      @if (s.item && removable()) {
        <button
          type="button"
          class="slot filled"
          [style.--tint]="s.tint"
          [attr.aria-label]="'Quitar a ' + s.name"
          (click)="removed.emit(s.item.id)"
        >
          <img [src]="s.art" alt="" width="48" height="48" loading="lazy" />
          <span class="cp">{{ s.item.cp }}</span>
        </button>
      } @else if (s.item) {
        <span class="slot filled" [style.--tint]="s.tint">
          <img [src]="s.art" alt="" width="48" height="48" loading="lazy" />
          <span class="cp">{{ s.item.cp }}</span>
        </span>
      } @else {
        <span class="slot empty" aria-hidden="true"></span>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: var(--s-2);
    }
    .slot {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      border-radius: 50%;
      padding: 0;
    }
    .filled {
      border: 0;
      background: radial-gradient(
        circle at 50% 40%,
        color-mix(in srgb, var(--tint), white 40%),
        color-mix(in srgb, var(--tint), transparent 20%)
      );
      box-shadow: var(--shadow-sm);
    }
    button.filled:active {
      transform: scale(0.94);
    }
    .empty {
      border: 2px dashed color-mix(in srgb, currentColor 30%, transparent);
    }
    img {
      width: 88%;
      height: 88%;
      object-fit: contain;
      filter: drop-shadow(0 2px 3px rgb(15 26 43 / 0.3));
    }
    .cp {
      position: absolute;
      bottom: -6px;
      padding: 1px 5px;
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font: 700 0.65rem/1.2 var(--font-display);
      box-shadow: var(--shadow-sm);
    }
  `,
})
export class TeamSlotsComponent {
  private readonly dataset = inject(DatasetService);
  /** Los Pokémon del equipo en orden (`null` = aún sin datos). */
  readonly members = input.required<(CollectionItem | null)[]>();
  readonly removable = input(false);
  readonly removed = output<string>();

  protected readonly slots = computed<Slot[]>(() => {
    const list = this.members();
    return Array.from({ length: TEAM_MAX }, (_, i) => {
      const item = list[i] ?? null;
      const species = item ? this.dataset.species().get(item.speciesId) : undefined;
      return {
        key: item?.id ?? `empty-${i}`,
        item,
        art: item ? spriteUrls(item.speciesId, item.shiny)[0] : '',
        tint: POKEMON_TYPES[species?.types[0] ?? '']?.color ?? 'var(--ink-2)',
        name: item?.nickname ?? species?.names.es ?? '',
      };
    });
  });
}
