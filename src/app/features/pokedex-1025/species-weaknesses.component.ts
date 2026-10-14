import { Component, computed, inject, input } from '@angular/core';
import type { TypeName } from '@shared/data/dataset.types';
import { buildTypeChart } from '@shared/engine/battle/type-chart';
import { defenseProfile } from '@shared/engine/weaknesses';
import { DatasetService } from '../../services/game/dataset.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';

const GROUPS = [
  { key: 'x4', label: 'Muy débil ×4' },
  { key: 'x2', label: 'Débil ×2' },
  { key: 'x05', label: 'Resiste ×½' },
  { key: 'x025', label: 'Resiste mucho ×¼' },
  { key: 'x0', label: 'Inmune ×0' },
] as const;

/** Debilidades y resistencias calculadas con la tabla de tipos (F3-04). Siempre texto + color (DISENO §7). */
@Component({
  selector: 'app-species-weaknesses',
  imports: [TypeChipsComponent],
  template: `
    <h2>Debilidades y resistencias</h2>
    @for (g of rows(); track g.label) {
      <div class="row">
        <span class="label">{{ g.label }}</span>
        <app-type-chips [types]="g.types" />
      </div>
    }
  `,
  styles: `
    h2 {
      margin: var(--s-4) 0 var(--s-2);
      font: 600 1.05rem/1 var(--font-display);
    }
    .row {
      display: grid;
      grid-template-columns: 9rem 1fr;
      align-items: center;
      gap: var(--s-2);
      margin-bottom: var(--s-2);
    }
    .label {
      font-size: 0.9rem;
      font-weight: 600;
    }
  `,
})
export class SpeciesWeaknessesComponent {
  private readonly dataset = inject(DatasetService);
  readonly types = input.required<TypeName[]>();

  private readonly chart = computed(() => {
    const types = this.dataset.types();
    return types.length ? buildTypeChart(types) : null;
  });
  protected readonly rows = computed(() => {
    const chart = this.chart();
    if (!chart) return [];
    const p = defenseProfile(this.types(), chart);
    return GROUPS.map((g) => ({ label: g.label, types: p[g.key] as string[] })).filter(
      (g) => g.types.length > 0,
    );
  });
}
