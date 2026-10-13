import { Component, computed, inject, input, output, signal } from '@angular/core';
import { type EvolutionOption, evolutionOptions } from '@shared/engine/evolution';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';

interface OptionView extends EvolutionOption {
  name: string;
  art: string;
  missing: number;
}

/**
 * Botones de evolucionar en la ficha (F3-05, D-053): uno por evolución posible con el arte del destino y su coste en
 * caramelos de la familia; sin caramelos suficientes, deshabilitado con lo que falta. Pide confirmación antes de
 * emitir. La regla es la de shared/ (la misma que aplica el servidor, que es quien decide).
 */
@Component({
  selector: 'app-evolve-panel',
  template: `
    @if (options().length) {
      <section aria-label="Evolucionar">
        <h2>Evolucionar</h2>
        @if (confirmingOption(); as c) {
          <div class="confirm" role="alertdialog" aria-label="Confirmar evolución">
            <p>¿Evolucionar a {{ c.name }} por {{ c.cost }} caramelos?</p>
            <div class="row">
              <button type="button" class="plain" (click)="confirming.set(null)">Cancelar</button>
              <button type="button" class="go" [disabled]="busy()" (click)="go(c)">
                Evolucionar
              </button>
            </div>
          </div>
        } @else {
          <div class="list">
            @for (o of options(); track o.to) {
              <button
                type="button"
                class="option"
                [disabled]="o.missing > 0 || busy()"
                (click)="confirming.set(o.to)"
              >
                <img [src]="o.art" alt="" width="56" height="56" loading="lazy" />
                <span class="text">
                  <strong>Evolucionar a {{ o.name }}</strong>
                  <span class="cost">
                    <span class="candy" aria-hidden="true"></span>
                    {{ o.cost }}
                    @if (o.missing > 0) {
                      · <span class="missing">Te faltan {{ o.missing }}</span>
                    }
                  </span>
                </span>
              </button>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    section {
      margin: var(--s-6) 0 var(--s-4);
    }
    h2 {
      margin: 0 0 var(--s-2);
      font: 700 1.1rem/1.2 var(--font-display);
    }
    .list {
      display: grid;
      gap: var(--s-2);
    }
    .option {
      display: flex;
      align-items: center;
      gap: var(--s-3);
      width: 100%;
      min-height: 64px;
      padding: var(--s-1) var(--s-3);
      border: 2px solid var(--tint, var(--accent));
      border-radius: var(--r-card);
      background: color-mix(in srgb, var(--tint, var(--accent)) 22%, var(--surface-opaque));
      color: inherit;
      text-align: left;
      box-shadow: var(--shadow-sm);
      transition:
        transform 120ms var(--ease-out),
        background 120ms var(--ease-out);
    }
    .option::after {
      content: '›';
      margin-left: auto;
      font: 700 1.6rem/1 var(--font-display);
      color: var(--tint, var(--accent));
    }
    .option:active:not(:disabled) {
      transform: scale(0.97);
      background: color-mix(in srgb, var(--tint, var(--accent)) 34%, var(--surface-opaque));
    }
    .option:disabled {
      border-style: dashed;
      border-color: color-mix(in srgb, currentColor 30%, transparent);
      background: color-mix(in srgb, currentColor 6%, transparent);
      box-shadow: none;
    }
    .option:disabled::after {
      content: none;
    }
    .option:disabled img {
      filter: grayscale(1) opacity(0.55);
    }
    .missing {
      font-weight: 700;
    }
    img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgb(15 26 43 / 0.35));
    }
    .text {
      display: grid;
      gap: 2px;
    }
    strong {
      font: 700 1rem/1.15 var(--font-display);
    }
    .cost {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    .candy {
      width: 14px;
      height: 10px;
      border-radius: 5px;
      background: linear-gradient(90deg, var(--gold) 50%, white 50%);
      box-shadow: 0 0 0 1.5px currentColor;
    }
    .confirm p {
      margin: 0 0 var(--s-2);
      font-weight: 600;
    }
    .row {
      display: flex;
      gap: var(--s-2);
    }
    .plain,
    .go {
      flex: 1;
      min-height: 48px;
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
    }
    .plain {
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
    }
    .go {
      background: var(--accent);
      color: var(--accent-ink);
    }
  `,
})
export class EvolvePanelComponent {
  private readonly dataset = inject(DatasetService);

  readonly speciesId = input.required<number>();
  readonly shiny = input(false);
  /** Caramelos de la familia que tiene el jugador. */
  readonly candy = input.required<number>();
  /** Hay una evolución en marcha: todo deshabilitado. */
  readonly busy = input(false);
  /** Especie elegida, ya confirmada. */
  readonly evolve = output<number>();

  protected readonly confirming = signal<number | null>(null);

  protected readonly options = computed<OptionView[]>(() => {
    const dex = this.dataset.species();
    return evolutionOptions(dex, this.speciesId()).map((o) => ({
      ...o,
      name: dex.get(o.to)?.names.es ?? `#${o.to}`,
      art: spriteUrls(o.to, this.shiny())[0],
      missing: Math.max(0, o.cost - this.candy()),
    }));
  });
  protected readonly confirmingOption = computed(
    () => this.options().find((o) => o.to === this.confirming()) ?? null,
  );

  protected go(o: OptionView): void {
    this.confirming.set(null);
    this.evolve.emit(o.to);
  }
}
