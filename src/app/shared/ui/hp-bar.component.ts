import { Component, computed, input } from '@angular/core';

/** Barra de PS: verde > 50 %, amarillo 20–50 %, rojo < 20 %. Se anima con transform en 400 ms. */
@Component({
  selector: 'app-hp-bar',
  host: {
    role: 'meter',
    '[attr.aria-valuenow]': 'current()',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    'aria-label': 'Puntos de salud',
  },
  template: `
    <span
      class="hp__fill"
      [style.transform]="'scaleX(' + ratio() + ')'"
      [style.background]="color()"
    ></span>
  `,
  styles: `
    :host {
      display: block;
      height: 10px;
      border-radius: var(--r-chip);
      background: var(--track);
      overflow: hidden;
    }
    .hp__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      transform-origin: left center;
      transition: transform 400ms var(--ease-out);
    }
  `,
})
export class HpBarComponent {
  readonly current = input.required<number>();
  readonly max = input.required<number>();

  protected readonly ratio = computed(() =>
    Math.min(1, Math.max(0, this.max() > 0 ? this.current() / this.max() : 0)),
  );

  protected readonly color = computed(() => {
    const pct = this.ratio() * 100;
    if (pct > 50) return 'var(--success)';
    if (pct >= 20) return 'var(--gold)';
    return 'var(--danger)';
  });
}
