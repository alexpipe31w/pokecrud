import { Component, inject, input, output } from '@angular/core';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';

/**
 * Botón del juego: respuesta en pointer-down (scale 0.97 + háptico + clic, en el mismo frame),
 * variantes y tamaño táctil ≥ 44 px.
 */
@Component({
  selector: 'app-game-button',
  template: `
    <button
      type="button"
      [class]="'gb gb--' + variant()"
      [disabled]="disabled()"
      (pointerdown)="feedback()"
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
      box-shadow: none;
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
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
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

  private readonly haptics = inject(HapticsService);
  private readonly audio = inject(AudioService);

  protected feedback(): void {
    if (this.disabled()) return;
    this.haptics.tap();
    void this.audio.playSfx('tap');
  }
}
