import { Component, inject } from '@angular/core';
import { BattleController } from './battle.controller';

/**
 * Barra del combate PvP (F5-04) encima del panel: la cuenta atrás de la decisión (el servidor juega por ti al llegar a
 * 0; roja en los últimos 10 s) y el aviso si el rival se desconectó con lo que le queda. "Esperando a <rival>…" va en
 * el mensaje del panel.
 */
@Component({
  selector: 'app-battle-pvp-bar',
  template: `
    @if (ctrl.phase() !== 'ended') {
      <span class="timer" [class.urgent]="ctrl.remainingS() <= 10" aria-hidden="true">
        ⏱ {{ ctrl.remainingS() }} s
      </span>
    }
    @if (ctrl.opponentAwayS(); as s) {
      <span class="away" role="status">
        {{ ctrl.opponent() }} se desconectó · {{ s }} s para volver
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--s-2);
      padding: var(--s-2) var(--s-4) 0;
      background: var(--ink);
      color: var(--paper);
      font-weight: 600;
    }
    .timer {
      padding: 2px var(--s-3);
      border-radius: var(--r-chip);
      background: rgb(251 247 238 / 0.12);
      font-variant-numeric: tabular-nums;
    }
    .urgent {
      background: var(--danger);
      animation: pulse 1s ease-in-out infinite;
    }
    .away {
      flex-basis: 100%;
      padding: var(--s-1) var(--s-3);
      border-radius: 12px;
      background: color-mix(in srgb, var(--gold) 25%, transparent);
    }
    @keyframes pulse {
      50% {
        opacity: 0.7;
      }
    }
  `,
})
export class BattlePvpBarComponent {
  protected readonly ctrl = inject(BattleController);
}
