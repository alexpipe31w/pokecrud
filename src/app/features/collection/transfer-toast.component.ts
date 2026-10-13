import { Component, inject } from '@angular/core';
import { TransferService } from './transfer.service';

/** Aviso flotante "Chispa transferido · Deshacer" mientras corre el `UNDO_MS` (F3-03), y el error si falla. */
@Component({
  selector: 'app-transfer-toast',
  template: `
    @if (transfers.current(); as c) {
      <div class="toast" role="status">
        <span>{{ c.name }} transferido · +1 caramelo</span>
        <button type="button" (click)="transfers.undo()">Deshacer</button>
      </div>
    } @else if (transfers.error(); as e) {
      <div class="toast err" role="alert">{{ e }}</div>
    }
  `,
  styles: `
    .toast {
      position: fixed;
      z-index: 40;
      left: var(--s-4);
      right: var(--s-4);
      bottom: calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--s-3);
      min-height: 52px;
      padding: 0 var(--s-2) 0 var(--s-4);
      border-radius: var(--r-card);
      background: var(--ink);
      color: var(--paper);
      box-shadow: var(--shadow-lg);
      animation: up var(--dur-panel) var(--ease-drawer) both;
    }
    .err {
      padding: var(--s-3) var(--s-4);
    }
    button {
      min-height: 44px;
      padding: 0 var(--s-4);
      border: 0;
      border-radius: var(--r-chip);
      background: var(--gold);
      color: var(--ink);
      font: 700 1rem/1 var(--font-display);
    }
    @keyframes up {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
    }
  `,
})
export class TransferToastComponent {
  protected readonly transfers = inject(TransferService);
}
