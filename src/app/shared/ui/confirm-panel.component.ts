import { Component, input, output } from '@angular/core';

/**
 * Confirmación del juego en la propia pantalla (F3-06a), en vez del `alert` de Ionic: el mensaje, "Cancelar" y la
 * acción (roja si es destructiva). Se anuncia como `alertdialog`.
 */
@Component({
  selector: 'app-confirm-panel',
  template: `
    <div class="confirm" role="alertdialog" [attr.aria-label]="label()">
      <p>{{ message() }}</p>
      <div class="row">
        <button type="button" class="plain" (click)="cancelled.emit()">Cancelar</button>
        <button
          type="button"
          [class]="danger() ? 'danger' : 'ok'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .confirm {
      padding: var(--s-4);
      border-radius: var(--r-card);
      background: var(--surface-opaque);
      color: var(--surface-text);
      box-shadow: var(--shadow-lg);
      animation: in 200ms var(--ease-out) both;
    }
    p {
      margin: 0 0 var(--s-3);
      font-weight: 600;
    }
    .row {
      display: flex;
      gap: var(--s-2);
    }
    button {
      flex: 1;
      min-height: 48px;
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
      transition: transform var(--dur-press) var(--ease-out);
    }
    button:active:not(:disabled) {
      transform: scale(0.97);
    }
    .plain {
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
    }
    .danger {
      background: var(--danger);
      color: var(--accent-ink);
    }
    .ok {
      background: var(--accent);
      color: var(--accent-ink);
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
    }
  `,
})
export class ConfirmPanelComponent {
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  /** Nombre accesible del diálogo. */
  readonly label = input('Confirmar');
  readonly danger = input(false);
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
