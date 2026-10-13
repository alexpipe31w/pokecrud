import { Component, input, output } from '@angular/core';
import { POKEMON_TYPE_KEYS, POKEMON_TYPES } from '../../core/constants/pokemon-types';

/**
 * Elegir 1-2 tipos con chips táctiles (F3-06a/F3-06c): pulsar uno lo añade si queda hueco o lo quita; lleno, el resto
 * se deshabilita. Emite la lista nueva; quien lo usa la guarda (formulario reactivo o signal).
 */
@Component({
  selector: 'app-type-picker',
  template: `
    @for (key of keys; track key) {
      <button
        type="button"
        class="type"
        [style.--chip]="types[key].color"
        [style.--chip-text]="types[key].text"
        [attr.aria-pressed]="value().includes(key)"
        [disabled]="!value().includes(key) && value().length >= max()"
        (click)="toggle(key)"
      >
        {{ types[key].label }}
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s-2);
    }
    .type {
      min-height: 44px;
      padding: 0 var(--s-3);
      border: 2px solid var(--chip);
      border-radius: var(--r-chip);
      background: transparent;
      color: inherit;
      font-weight: 700;
      font-size: 0.85rem;
      transition:
        transform var(--dur-press) var(--ease-out),
        background var(--dur-small) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
    }
    .type[aria-pressed='true'] {
      background: var(--chip);
      color: var(--chip-text);
    }
    .type:active:not(:disabled) {
      transform: scale(0.95);
    }
    .type:disabled {
      opacity: 0.35;
    }
  `,
})
export class TypePickerComponent {
  readonly value = input<string[]>([]);
  readonly max = input(2);
  readonly changed = output<string[]>();

  protected readonly keys = POKEMON_TYPE_KEYS;
  protected readonly types = POKEMON_TYPES;

  protected toggle(key: string): void {
    const v = this.value();
    if (v.includes(key)) this.changed.emit(v.filter((t) => t !== key));
    else if (v.length < this.max()) this.changed.emit([...v, key]);
  }
}
