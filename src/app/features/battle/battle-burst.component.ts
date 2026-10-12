import { Component, input } from '@angular/core';

const PARTICLES = Array.from({ length: 12 }, (_, i) => i);

/** Golpe (F4-05): partículas del color del tipo del movimiento y el número de daño (o de curación) subiendo. */
@Component({
  selector: 'app-battle-burst',
  host: { 'aria-hidden': 'true', '[style.--c]': 'color()' },
  template: `
    @for (p of particles; track p) {
      <span class="dot" [style.--a]="p * 30 + 'deg'"></span>
    }
    @if (amount()) {
      <span class="num" [class.num--crit]="crit()" [class.num--heal]="heal()">
        {{ heal() ? '+' : '−' }}{{ amount() }}
      </span>
    }
  `,
  styles: `
    :host {
      position: absolute;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    .burst--foe {
      right: 112px;
      top: calc(var(--safe-top) + 130px);
    }
    .burst--me {
      left: 118px;
      bottom: 120px;
    }
    .dot {
      position: absolute;
      width: 10px;
      height: 10px;
      margin: -5px;
      border-radius: 50%;
      background: var(--c);
      box-shadow: 0 0 8px var(--c);
      animation: fly 620ms var(--ease-out) forwards;
    }
    @keyframes fly {
      from {
        transform: rotate(var(--a)) translateX(0) scale(1);
        opacity: 1;
      }
      to {
        transform: rotate(var(--a)) translateX(64px) scale(0.3);
        opacity: 0;
      }
    }
    .num {
      position: absolute;
      transform: translate(-50%, -50%);
      font: 700 1.6rem/1 var(--font-display);
      color: var(--paper);
      text-shadow:
        0 2px 0 var(--ink),
        0 0 12px rgb(15 26 43 / 0.6);
      animation: rise 860ms var(--ease-out) forwards;
    }
    .num--crit {
      color: var(--gold);
      font-size: 2rem;
    }
    .num--heal {
      color: var(--success);
    }
    @keyframes rise {
      from {
        transform: translate(-50%, -30%) scale(0.95);
        opacity: 0;
      }
      20% {
        opacity: 1;
      }
      to {
        transform: translate(-50%, -160%) scale(1);
        opacity: 0;
      }
    }
  `,
})
export class BattleBurstComponent {
  readonly color = input.required<string>();
  readonly amount = input<number | undefined>(undefined);
  readonly crit = input(false);
  readonly heal = input(false);
  protected readonly particles = PARTICLES;
}
