import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { SettingsService } from '../../services/game/settings.service';

/** Se van turnando mientras el servidor despierta (DISENO §6: "mensaje simpático"). */
export const WAKING_MESSAGES = [
  'Despertando al servidor…',
  'El Profesor se está poniendo la bata…',
  'Los Pokémon salvajes se están desperezando…',
  'El servidor gratis duerme cuando nadie juega. Ya casi está.',
];
const MESSAGE_MS = 3500;

/**
 * Pantalla "servidor despertando" (F1-09, DISENO §6): mientras `AuthService` recupera la sesión y el servidor tarda
 * (Render gratis se duerme a los 15 min), en vez de una pantalla en blanco, una Poké Ball que se tambalea como en
 * una captura, un mensaje que cambia y el intento en curso. Los reintentos los hace `AuthService` (con espera creciente).
 */
@Component({
  selector: 'app-server-waking',
  template: `
    @if (auth.waking()) {
      <div class="veil" role="status" aria-live="polite">
        <div class="ball" [class.still]="still()" aria-hidden="true"></div>
        <p class="msg">{{ message() }}</p>
        @if (auth.wakeAttempt() > 1) {
          <p class="attempt">Intento {{ auth.wakeAttempt() }}</p>
        }
      </div>
    }
  `,
  styles: `
    .veil {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--s-4);
      padding: var(--s-6);
      text-align: center;
      color: var(--paper);
      background: radial-gradient(
        circle at 50% 40%,
        color-mix(in srgb, var(--t-grass) 55%, var(--ink)),
        var(--ink)
      );
    }
    .ball {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 4px solid var(--ink);
      background: linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
      box-shadow: var(--shadow-lg);
      transform-origin: 50% 100%;
      animation: wobble 1.6s var(--ease-out, ease-out) infinite;
    }
    .ball.still {
      animation: none;
    }
    /* Como la bola al capturar: dos sacudidas y una pausa. */
    @keyframes wobble {
      0%,
      40%,
      100% {
        transform: rotate(0deg);
      }
      10% {
        transform: rotate(-16deg);
      }
      20% {
        transform: rotate(14deg);
      }
      30% {
        transform: rotate(-6deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ball {
        animation: none;
      }
    }
    .msg {
      margin: 0;
      max-width: 22ch;
      font: 600 1.2rem/1.3 var(--font-display);
    }
    .attempt {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.75;
    }
  `,
})
export class ServerWakingComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly index = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly message = computed(
    () => WAKING_MESSAGES[this.index() % WAKING_MESSAGES.length],
  );
  protected readonly still = computed(() => this.settings.settings().reduceEffects);

  constructor() {
    effect(() => {
      clearInterval(this.timer);
      if (!this.auth.waking()) return;
      this.index.set(0);
      this.timer = setInterval(() => this.index.update((i) => i + 1), MESSAGE_MS);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
