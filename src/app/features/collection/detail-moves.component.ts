import { Component, computed, inject, input } from '@angular/core';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { DatasetService } from '../../services/game/dataset.service';

const CATEGORY: Record<string, string> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Estado',
};

/** Los movimientos del individuo (F3-03): nombre, tipo, categoría, potencia, precisión y PP, del dataset. */
@Component({
  selector: 'app-detail-moves',
  imports: [TypeChipsComponent],
  template: `
    <h2>Movimientos</h2>
    <ul>
      @for (m of rows(); track m.id) {
        <li>
          <span class="name">{{ m.name }}</span>
          <app-type-chips [types]="[m.type]" />
          <span class="facts">
            {{ m.category }} · Pot. {{ m.power ?? '—' }} · Prec. {{ m.accuracy ?? '—' }} · PP
            {{ m.pp }}
          </span>
        </li>
      }
    </ul>
  `,
  styles: `
    h2 {
      margin: var(--s-4) 0 var(--s-2);
      font: 600 1.05rem/1 var(--font-display);
    }
    ul {
      display: grid;
      gap: var(--s-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--s-1) var(--s-2);
      padding: var(--s-3);
      border-radius: var(--r-card);
      background: color-mix(in srgb, currentColor 8%, transparent);
    }
    .name {
      font-weight: 700;
    }
    .facts {
      grid-column: 1 / -1;
      font-size: 0.85rem;
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class DetailMovesComponent {
  private readonly dataset = inject(DatasetService);
  readonly moves = input.required<number[]>();

  protected readonly rows = computed(() =>
    this.moves().map((id) => {
      const m = this.dataset.moves().get(id);
      return {
        id,
        name: m?.names.es ?? `#${id}`,
        type: m?.type ?? 'normal',
        category: CATEGORY[m?.category ?? ''] ?? '—',
        power: m?.power ?? null,
        accuracy: m?.accuracy ?? null,
        pp: m?.pp ?? 0,
      };
    }),
  );
}
