import { Component, OnDestroy, computed, output, signal } from '@angular/core';

/**
 * Esperando rival en la cola (F5-03): una Poké Ball que late con ondas de radar y cuánto llevas esperando (si nadie
 * más busca, que se note que sigue viva y que se puede cancelar).
 */
@Component({
  selector: 'app-pvp-searching',
  template: `
    <div class="radar" aria-hidden="true">
      <span class="wave"></span>
      <span class="wave late"></span>
      <span class="ball"></span>
    </div>
    <p class="msg" role="status">Buscando rival…</p>
    <p class="time">{{ waited() }}</p>
    <p class="hint">Pide a un compañero que pulse «Buscar rival» a la vez.</p>
    <button type="button" class="cancel" (click)="cancelled.emit()">Dejar de buscar</button>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--s-2);
      text-align: center;
      color: var(--paper);
    }
    .radar {
      position: relative;
      display: grid;
      place-items: center;
      width: 180px;
      height: 180px;
      margin-bottom: var(--s-4);
    }
    .wave {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--accent), transparent 30%);
      animation: ping 2.4s var(--ease-out) infinite;
    }
    .late {
      animation-delay: 1.2s;
    }
    .ball {
      width: 76px;
      height: 76px;
      border: 4px solid var(--ink);
      border-radius: 50%;
      background:
        radial-gradient(circle, white 0 8px, var(--ink) 8px 12px, transparent 12px),
        linear-gradient(var(--accent) 0 46%, var(--ink) 46% 54%, white 54%);
      box-shadow: 0 10px 24px rgb(0 0 0 / 0.45);
      animation: beat 1.2s var(--ease-in-out) infinite;
    }
    .msg {
      margin: 0;
      font: 700 1.5rem/1.1 var(--font-display);
    }
    .time {
      margin: 0;
      font-variant-numeric: tabular-nums;
      color: color-mix(in srgb, var(--paper), transparent 30%);
    }
    .hint {
      max-width: 28ch;
      margin: var(--s-2) 0 0;
      color: color-mix(in srgb, var(--paper), transparent 30%);
    }
    .cancel {
      min-height: 44px;
      margin-top: var(--s-2);
      padding: 0 var(--s-6);
      border: 0;
      background: transparent;
      color: var(--paper);
      font: 600 1rem/1 var(--font-display);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    @keyframes ping {
      from {
        scale: 0.4;
        opacity: 1;
      }
      to {
        scale: 1;
        opacity: 0;
      }
    }
    @keyframes beat {
      0%,
      100% {
        scale: 1;
      }
      50% {
        scale: 1.06;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .wave,
      .ball {
        animation: none;
      }
      .wave {
        opacity: 0.4;
      }
    }
  `,
})
export class PvpSearchingComponent implements OnDestroy {
  readonly cancelled = output<void>();

  private readonly started = Date.now();
  private readonly seconds = signal(0);
  private readonly timer = setInterval(
    () => this.seconds.set(Math.floor((Date.now() - this.started) / 1000)),
    1000,
  );
  protected readonly waited = computed(() => {
    const s = this.seconds();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
