import { Component, input, output } from '@angular/core';

/** Botón del juego: respuesta en pointer-down (scale 0.97), variantes y tamaño táctil ≥ 44 px. */
@Component({
  selector: 'app-game-button',
  template: `
    <button
      type="button"
      [class]="'gb gb--' + variant()"
      [disabled]="disabled()"
      (click)="pressed.emit()"
      [attr.aria-label]="ariaLabel() || null"
    >
      <ng-content select="[slot=icon]" />
      <span>{{ label() }}</span>
    </button>
  `,
  styles: `
    .gb {
      min-height: 48px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
      display: inline-flex;
      align-items: center;
      gap: var(--s-2);
      transition:
        transform var(--dur-press) var(--ease-out),
        opacity var(--dur-small) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .gb:active:not(:disabled) {
      transform: scale(0.97);
    }
    .gb:disabled {
      opacity: 0.45;
    }
    .gb--primary {
      background: var(--accent);
      color: var(--accent-ink);
      box-shadow: var(--shadow-accent);
    }
    .gb--glass {
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
    }
    .gb--gold {
      background: var(--gold);
      color: var(--ink);
    }
  `,
})
export class GameButtonComponent {
  readonly label = input.required<string>();
  readonly variant = input<'primary' | 'glass' | 'gold'>('primary');
  readonly disabled = input(false);
  readonly ariaLabel = input<string>('');
  readonly pressed = output<void>();
}
