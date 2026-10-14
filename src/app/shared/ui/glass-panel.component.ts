import { Component, input } from '@angular/core';

/** Panel de vidrio esmerilado (DISENO §1): capa flotante translúcida con borde superior claro. */
@Component({
  selector: 'app-glass-panel',
  host: { '[class]': "'gp gp--' + size()" },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: var(--s-4);
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: var(--glass-filter);
      -webkit-backdrop-filter: var(--glass-filter);
      border-top: 1px solid var(--glass-edge);
      border-radius: var(--r-card);
    }
    :host(.gp--sm) {
      box-shadow: var(--shadow-sm);
    }
    :host(.gp--lg) {
      padding: var(--s-6);
      box-shadow: var(--shadow-lg);
    }
  `,
})
export class GlassPanelComponent {
  readonly size = input<'sm' | 'lg'>('sm');
}
