import { Component, input } from '@angular/core';

const PARTICLES = Array.from({ length: 12 }, (_, i) => i);

/** Golpe (F4-05): partículas del color del tipo del movimiento y el número de daño (o de curación) subiendo. */
@Component({
  selector: 'app-battle-burst',
  host: { 'aria-hidden': 'true', '[style.--c]': 'color()' },
  template: `
    <span class="ring"></span>
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
    .ring {
      position: absolute;
      width: 120px;
      height: 120px;
      margin: -60px;
      border-radius: 50%;
      border: 6px solid var(--c);
      box-shadow:
        0 0 0 2px rgb(15 26 43 / 0.35),
        0 0 24px var(--c);
      animation: ring 420ms var(--ease-out) forwards;
    }
    @keyframes ring {
      from {
        transform: scale(0.3);
        opacity: 1;
      }
      to {
        transform: scale(1.15);
        opacity: 0;
      }
    }
    .dot {
      position: absolute;
      width: 16px;
      height: 16px;
      margin: -8px;
      border-radius: 50%;
      background: radial-gradient(circle, #fff 0 30%, var(--c) 45%);
      box-shadow:
        0 0 0 2px rgb(15 26 43 / 0.45),
        0 0 10px var(--c);
      animation: fly 640ms var(--ease-out) forwards;
    }
    @keyframes fly {
      from {
        transform: rotate(var(--a)) translateX(10px) scale(1);
        opacity: 1;
      }
      to {
        transform: rotate(var(--a)) translateX(96px) scale(0.35);
        opacity: 0;
      }
    }
    .num {
      position: absolute;
      transform: translate(-50%, -50%);
      font: 700 2.1rem/1 var(--font-display);
      color: var(--paper);
      -webkit-text-stroke: 1.5px var(--ink);
      text-shadow: 0 3px 0 var(--ink);
      animation: rise 900ms var(--ease-out) forwards;
    }
    .num--crit {
      color: var(--gold);
      font-size: 2.6rem;
    }
    .num--heal {
      color: var(--success);
    }
    @keyframes rise {
      from {
        transform: translate(-50%, -20%) scale(1.3);
      }
      25% {
        transform: translate(-50%, -70%) scale(1);
        opacity: 1;
      }
      to {
        transform: translate(-50%, -170%) scale(1);
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
