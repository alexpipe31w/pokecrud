import { Component, input, output } from '@angular/core';

/**
 * Buscador del juego (F3-06a): píldora de vidrio con lupa dibujada en CSS, 48 px de alto y 16 px de letra (sin zoom
 * al enfocar en el móvil). Emite lo escrito en cada tecla; quien lo usa decide si filtra al momento o espera.
 */
@Component({
  selector: 'app-search-field',
  template: `
    <label class="search">
      <span class="visually-hidden">{{ label() }}</span>
      <span class="icon" aria-hidden="true"></span>
      <input
        #q
        type="search"
        [placeholder]="placeholder()"
        autocomplete="off"
        enterkeyhint="search"
        (input)="query.emit(q.value)"
      />
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    .search {
      display: flex;
      align-items: center;
      gap: var(--s-2);
      min-height: 48px;
      padding: 0 var(--s-4);
      border: 1px solid var(--field-border);
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      box-shadow: var(--shadow-sm);
    }
    .search:focus-within {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    input {
      flex: 1;
      min-width: 0;
      min-height: 46px;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 1rem;
      outline: none;
    }
    .icon {
      position: relative;
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-radius: 50%;
      opacity: 0.6;
    }
    .icon::after {
      content: '';
      position: absolute;
      right: -6px;
      bottom: -5px;
      width: 7px;
      height: 2px;
      background: currentColor;
      rotate: 45deg;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class SearchFieldComponent {
  /** Nombre accesible (no se ve). */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly query = output<string>();
}
