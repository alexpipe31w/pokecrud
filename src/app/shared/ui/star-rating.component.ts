import { Component, computed, input, output } from '@angular/core';
import { RATING_MAX } from '@shared/protocol/course';

/**
 * Valoración de 1 a 5 estrellas (F3-06c). Editable: un `radiogroup` de 5 botones de 44 px (DISENO: objetivo táctil);
 * solo lectura: estrellas pequeñas con "N de 5" para el lector de pantalla.
 */
@Component({
  selector: 'app-star-rating',
  template: `
    @if (readonly()) {
      <span class="ro" role="img" [attr.aria-label]="value() + ' de ' + max">
        @for (s of stars(); track s.n) {
          <span class="star" [class.on]="s.on" aria-hidden="true">★</span>
        }
      </span>
    } @else {
      <div class="edit" role="radiogroup" aria-label="Valoración">
        @for (s of stars(); track s.n) {
          <button
            type="button"
            role="radio"
            class="star"
            [class.on]="s.on"
            [attr.aria-checked]="s.n === value()"
            [attr.aria-label]="s.n + ' de ' + max"
            (click)="changed.emit(s.n)"
          >
            ★
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .edit {
      display: flex;
      gap: var(--s-1);
    }
    .star {
      color: color-mix(in srgb, currentColor 22%, transparent);
    }
    .on {
      color: var(--gold);
      text-shadow: 0 1px 2px rgb(15 26 43 / 0.25);
    }
    button.star {
      width: 44px;
      height: 44px;
      border: 0;
      background: none;
      font-size: 2rem;
      line-height: 1;
      transition: transform var(--dur-press) var(--ease-out);
    }
    button.star:active {
      transform: scale(0.85);
    }
    .ro .star {
      font-size: 0.95rem;
    }
  `,
})
export class StarRatingComponent {
  readonly value = input(0);
  readonly readonly = input(false);
  readonly changed = output<number>();
  protected readonly max = RATING_MAX;
  protected readonly stars = computed(() =>
    Array.from({ length: RATING_MAX }, (_, i) => ({ n: i + 1, on: i < this.value() })),
  );
}
