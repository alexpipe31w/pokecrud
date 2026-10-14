import { Component, computed, input } from '@angular/core';

/** Barra de una estadística base. Se anima con transform (scaleX), nunca con width. */
@Component({
  selector: 'app-stat-bar',
  template: `
    <span class="sb__label">{{ label() }}</span>
    <span class="sb__track" aria-hidden="true">
      <span
        class="sb__fill"
        [style.transform]="'scaleX(' + ratio() + ')'"
        [style.background]="color()"
      ></span>
    </span>
    <span class="sb__value">{{ value() }}</span>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 5.5rem 1fr 2.5rem;
      align-items: center;
      gap: var(--s-3);
      min-height: 24px;
      font-size: 0.875rem;
    }
    .sb__label {
      opacity: 0.8;
    }
    .sb__track {
      height: 8px;
      border-radius: var(--r-chip);
      background: var(--track);
      overflow: hidden;
    }
    .sb__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      transform-origin: left center;
      transition: transform var(--dur-panel) var(--ease-out);
    }
    .sb__value {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class StatBarComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly max = input(255);
  readonly color = input('var(--accent)');

  protected readonly ratio = computed(() => Math.min(1, Math.max(0, this.value() / this.max())));
}
