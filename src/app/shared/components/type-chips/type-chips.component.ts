import { Component, input } from '@angular/core';

import { POKEMON_TYPES } from '../../../core/constants/pokemon-types';

/** Chips de color con los tipos de un Pokémon (en español). */
@Component({
  selector: 'app-type-chips',
  template: `
    @for (type of types(); track type) {
      <span class="type-chip" [style.background]="color(type)">{{ label(type) }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .type-chip {
      color: #fff;
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
  `,
})
export class TypeChipsComponent {
  readonly types = input.required<string[]>();

  label(type: string): string {
    return POKEMON_TYPES[type]?.label ?? type;
  }

  color(type: string): string {
    return POKEMON_TYPES[type]?.color ?? '#777';
  }
}
