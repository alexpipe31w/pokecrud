import { Component } from '@angular/core';

/** Poké Ball de CSS que se tambalea como en una captura (estados de espera y vacíos de la arena). */
@Component({
  selector: 'app-pvp-ball',
  template: '',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: block;
      width: 64px;
      height: 64px;
      border: 4px solid var(--paper-2);
      border-radius: 50%;
      background:
        radial-gradient(circle, white 0 7px, var(--ink) 7px 11px, transparent 11px),
        linear-gradient(var(--accent) 0 46%, var(--ink) 46% 54%, white 54%);
      animation: wobble 1.8s var(--ease-in-out) infinite;
    }
    @keyframes wobble {
      0%,
      60%,
      100% {
        rotate: 0deg;
      }
      75% {
        rotate: -14deg;
      }
      90% {
        rotate: 10deg;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class PvpBallComponent {}
