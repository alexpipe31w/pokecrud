import { Component, computed, input } from '@angular/core';

import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

const num = (n: number, decimals: number): string =>
  n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Ficha del Pokémon en el encuentro (F2-13, D-048): tipos, nivel, PC, altura y peso de ESTE individuo (los de la
 * especie × su XS/XL), categoría y descripción de Pokédex. Solo pinta: la página la abre, la cierra y la coloca al
 * lado del Pokémon.
 */
@Component({
  selector: 'app-encounter-card',
  imports: [GlassPanelComponent, TypeChipsComponent],
  template: `
    <app-glass-panel class="card">
      <p class="genus">{{ genus() }}</p>
      <app-type-chips [types]="types()" />
      <dl class="facts">
        <div>
          <dt>Nivel</dt>
          <dd>Nv. {{ level() }}</dd>
        </div>
        <div>
          <dt>Poder</dt>
          <dd class="cp">PC {{ cp() }}</dd>
        </div>
        <div>
          <dt>Altura</dt>
          <dd>{{ height() }}</dd>
        </div>
        <div>
          <dt>Peso</dt>
          <dd>{{ weight() }}</dd>
        </div>
      </dl>
      <p class="flavor">{{ flavor() }}</p>
    </app-glass-panel>
  `,
  styles: `
    .card {
      display: grid;
      gap: var(--s-2);
      padding: var(--s-3);
    }
    .genus {
      margin: 0;
      font: 700 0.95rem/1.2 var(--font-display);
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--s-1) var(--s-3);
      margin: 0;
    }
    dt {
      font-size: 0.68rem;
      opacity: 0.7;
    }
    dd {
      margin: 0;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .cp {
      color: var(--accent);
    }
    .flavor {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.35;
    }
  `,
})
export class EncounterCardComponent {
  readonly genus = input('');
  readonly flavor = input('');
  readonly types = input<string[]>([]);
  readonly level = input.required<number>();
  readonly cp = input.required<number>();
  /** De la especie (PokéAPI): decímetros y hectogramos. */
  readonly heightDm = input(0);
  readonly weightHg = input(0);
  /** XS/XL del individuo (0,5..1,5): escala su altura y su peso. */
  readonly heightScale = input(1);

  protected readonly height = computed(
    () => `${num((this.heightDm() / 10) * this.heightScale(), 2)} m`,
  );
  protected readonly weight = computed(
    () => `${num((this.weightHg() / 10) * this.heightScale(), 1)} kg`,
  );
}
