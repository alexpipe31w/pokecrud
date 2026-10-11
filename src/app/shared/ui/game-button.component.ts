import { Component, computed, inject, input, output } from '@angular/core';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';

/**
 * Botón del juego: respuesta en pointer-down (scale 0.97 + háptico + clic, en el mismo frame),
 * variantes y tamaño táctil ≥ 44 px. `type="submit"` para formularios y `loading` mientras espera.
 */
@Component({
  selector: 'app-game-button',
  template: `
    <button
      [type]="type()"
      [class]="
        'gb gb--' + variant() + (block() ? ' gb--block' : '') + (loading() ? ' is-loading' : '')
      "
      [disabled]="blocked()"
      [attr.aria-busy]="loading() || null"
      (pointerdown)="feedback()"
      (click)="pressed.emit()"
      [attr.aria-label]="ariaLabel() || null"
    >
      @if (loading()) {
        <span class="gb__spinner" aria-hidden="true"></span>
      } @else {
        <ng-content select="[slot=icon]" />
      }
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
      justify-content: center;
      gap: var(--s-2);
      transition:
        transform var(--dur-press) var(--ease-out),
        opacity var(--dur-small) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .gb--block {
      width: 100%;
    }
    .gb:active:not(:disabled) {
      transform: scale(0.97);
    }
    .gb:disabled:not(.is-loading) {
      opacity: 0.45;
      box-shadow: none;
    }
    .gb.is-loading {
      cursor: progress;
    }
    .gb__spinner {
      width: 1.1em;
      height: 1.1em;
      border-radius: 50%;
      border: 2.5px solid currentColor;
      border-right-color: transparent;
      animation: gb-spin 700ms linear infinite;
    }
    @keyframes gb-spin {
      to {
        transform: rotate(360deg);
      }
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
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  /** Ocupa todo el ancho disponible (formularios). */
  readonly block = input(false);
  readonly ariaLabel = input<string>('');
  readonly pressed = output<void>();

  protected readonly blocked = computed(() => this.disabled() || this.loading());

  private readonly haptics = inject(HapticsService);
  private readonly audio = inject(AudioService);

  protected feedback(): void {
    if (this.blocked()) return;
    this.haptics.tap();
    void this.audio.playSfx('tap');
  }
}
