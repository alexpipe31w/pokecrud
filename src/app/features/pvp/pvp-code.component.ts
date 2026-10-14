import { Component, computed, input, output, signal } from '@angular/core';
import { PVP_INVITE_TTL_MS } from '@shared/protocol/pvp';

/**
 * El código de invitación (F5-03): 6 letras grandes en fichas (para dictarlo en voz alta en clase), copiar, y el
 * tiempo que le queda como una mecha que se consume. El lector de pantalla lo lee letra a letra.
 */
@Component({
  selector: 'app-pvp-code',
  template: `
    <p class="lead">Dile este código a tu rival</p>
    <div class="tiles" role="text" [attr.aria-label]="spoken()">
      @for (c of letters(); track $index) {
        <span class="tile" [style.--i]="$index" aria-hidden="true">{{ c }}</span>
      }
    </div>
    <button type="button" class="copy" (click)="copy()">
      {{ copied() ? 'Copiado' : 'Copiar código' }}
    </button>
    <div class="fuse" aria-hidden="true"><span [style.scale]="fuse() + ' 1'"></span></div>
    <p class="time" aria-live="off">Caduca en {{ clock() }}</p>
    <button type="button" class="cancel" (click)="cancelled.emit()">Cancelar invitación</button>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--s-3);
      text-align: center;
    }
    .lead {
      margin: 0;
      color: color-mix(in srgb, var(--paper), transparent 25%);
    }
    .tiles {
      display: flex;
      gap: var(--s-2);
    }
    .tile {
      display: grid;
      place-items: center;
      width: 46px;
      height: 60px;
      border-radius: 12px;
      background: var(--paper);
      color: var(--ink);
      font: 700 2rem/1 var(--font-display);
      box-shadow:
        0 6px 0 var(--paper-2),
        0 10px 18px rgb(0 0 0 / 0.35);
      animation: flip 420ms var(--ease-out) both;
      animation-delay: calc(var(--i) * 45ms);
    }
    .copy,
    .cancel {
      min-height: 44px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
      transition: transform var(--dur-press) var(--ease-out);
    }
    .copy {
      background: var(--gold);
      color: var(--ink);
    }
    .cancel {
      background: transparent;
      color: var(--paper);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .copy:active,
    .cancel:active {
      transform: scale(0.97);
    }
    .fuse {
      width: min(280px, 80%);
      height: 6px;
      border-radius: var(--r-chip);
      background: color-mix(in srgb, var(--paper), transparent 82%);
      overflow: hidden;
    }
    .fuse span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      transform-origin: left;
      transition: scale 1s linear;
    }
    .time {
      margin: 0;
      font-variant-numeric: tabular-nums;
      color: color-mix(in srgb, var(--paper), transparent 25%);
    }
    @keyframes flip {
      from {
        opacity: 0;
        transform: translateY(12px) rotateX(70deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .tile {
        animation-name: fade;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
    }
  `,
})
export class PvpCodeComponent {
  readonly code = input.required<string>();
  readonly remainingS = input.required<number>();
  readonly cancelled = output<void>();

  protected readonly copied = signal(false);
  protected readonly letters = computed(() => [...this.code()]);
  protected readonly spoken = computed(() => `Código ${this.letters().join(' ')}`);
  protected readonly fuse = computed(() =>
    Math.max(0, Math.min(1, (this.remainingS() * 1000) / PVP_INVITE_TTL_MS)),
  );
  protected readonly clock = computed(() => {
    const s = this.remainingS();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1800);
    } catch (err) {
      // Sin permiso de portapapeles: el código sigue a la vista para dictarlo.
      console.warn('[pvp] no se pudo copiar el código', err);
    }
  }
}
