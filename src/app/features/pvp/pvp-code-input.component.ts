import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PVP_INVITE_ALPHABET, PVP_INVITE_LENGTH } from '@shared/protocol/pvp';

/** Lo que se puede teclear: el alfabeto del código (sin 0/O/1/I/L), en mayúsculas. */
export function cleanCode(raw: string): string {
  return Array.from(raw.toUpperCase())
    .filter((c) => PVP_INVITE_ALPHABET.includes(c))
    .join('')
    .slice(0, PVP_INVITE_LENGTH);
}

/**
 * Escribir el código del rival (F5-03): UN input real (pegar, teclado del móvil, lector de pantalla y autocompletar
 * funcionan solos) dibujado como 6 fichas. Mayúsculas solas; lo que no es del alfabeto no entra. Con 6, se envía.
 */
@Component({
  selector: 'app-pvp-code-input',
  template: `
    <label class="lead" for="pvp-code">Escribe el código de tu rival</label>
    <div class="field" [class.shake]="shaking()">
      <input
        #box
        id="pvp-code"
        inputmode="text"
        autocapitalize="characters"
        autocomplete="one-time-code"
        spellcheck="false"
        [attr.maxlength]="length"
        [value]="value()"
        [disabled]="busy()"
        (input)="typed(box.value)"
        (keydown.enter)="submit()"
      />
      @for (c of tiles(); track $index) {
        <span class="tile" [class.on]="$index === value().length" aria-hidden="true">{{ c }}</span>
      }
    </div>
    <button
      type="button"
      class="go"
      [disabled]="value().length < length || busy()"
      (click)="submit()"
    >
      {{ busy() ? 'Buscando…' : 'Unirme' }}
    </button>
    <button type="button" class="back" (click)="cancelled.emit()">Volver</button>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--s-4);
    }
    .lead {
      color: color-mix(in srgb, var(--paper), transparent 25%);
    }
    .field {
      position: relative;
      display: flex;
      gap: var(--s-2);
    }
    input {
      position: absolute;
      inset: 0;
      opacity: 0;
      font-size: 16px; /* sin zoom de iOS al enfocar */
      caret-color: transparent;
    }
    .tile {
      display: grid;
      place-items: center;
      width: 44px;
      height: 56px;
      border-radius: 12px;
      border: 2px solid color-mix(in srgb, var(--paper), transparent 70%);
      color: var(--paper);
      font: 700 1.8rem/1 var(--font-display);
      pointer-events: none;
    }
    .tile.on {
      border-color: var(--gold);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold), transparent 75%);
    }
    .shake {
      animation: no 360ms var(--ease-out);
    }
    .go,
    .back {
      min-height: 48px;
      padding: 0 var(--s-8);
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
    }
    .go {
      background: var(--accent);
      color: var(--accent-ink);
      box-shadow: var(--shadow-accent);
      transition:
        transform var(--dur-press) var(--ease-out),
        opacity var(--dur-small) var(--ease-out);
    }
    .go:active {
      transform: scale(0.97);
    }
    .go:disabled {
      opacity: 0.45;
      box-shadow: none;
    }
    .back {
      min-height: 44px;
      background: transparent;
      color: var(--paper);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    @keyframes no {
      25% {
        transform: translateX(-8px);
      }
      50% {
        transform: translateX(6px);
      }
      75% {
        transform: translateX(-3px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .shake {
        animation: none;
      }
    }
  `,
})
export class PvpCodeInputComponent {
  readonly busy = input(false);
  /** Cambia (p. ej. un contador) cuando el servidor rechaza el código: las fichas tiemblan. */
  readonly rejected = input(0);
  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  protected readonly length = PVP_INVITE_LENGTH;
  protected readonly value = signal('');
  protected readonly tiles = computed(() =>
    Array.from({ length: PVP_INVITE_LENGTH }, (_, i) => this.value()[i] ?? ''),
  );
  protected readonly shaking = signal(false);
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  constructor() {
    afterNextRender(() => this.box().nativeElement.focus());
    // Cada rechazo del servidor: tiemblan las fichas (y la vibración la pone el store).
    effect(() => {
      if (this.rejected() === 0) return;
      this.shaking.set(true);
      setTimeout(() => this.shaking.set(false), 380);
    });
  }

  protected typed(raw: string): void {
    const code = cleanCode(raw);
    this.value.set(code);
    this.box().nativeElement.value = code;
    if (code.length === PVP_INVITE_LENGTH) this.submit();
  }

  protected submit(): void {
    if (this.value().length === PVP_INVITE_LENGTH && !this.busy())
      this.submitted.emit(this.value());
  }
}
