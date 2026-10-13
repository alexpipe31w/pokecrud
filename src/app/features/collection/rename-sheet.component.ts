import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { NICKNAME_MAX, normalizeNickname } from '@shared/engine/nickname';

/**
 * Hoja para poner o quitar el mote (F3-03). Valida en vivo con `normalizeNickname` (shared/): la misma regla y el
 * mismo mensaje que el servidor. Vacío = quitar el mote (se ve el nombre de la especie).
 */
@Component({
  selector: 'app-rename-sheet',
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" [class.is-open]="open()" (click)="closed.emit()" aria-hidden="true"></div>
    <form
      class="sheet"
      role="dialog"
      aria-label="Cambiar mote"
      [class.is-open]="open()"
      [attr.inert]="open() ? null : ''"
      (submit)="$event.preventDefault(); save()"
    >
      <label for="nick">Mote</label>
      <input
        #field
        id="nick"
        [value]="value()"
        [placeholder]="speciesName()"
        [attr.maxlength]="max + 4"
        autocomplete="off"
        (input)="value.set(field.value)"
        [attr.aria-invalid]="!!error()"
        aria-describedby="nick-help"
      />
      <p id="nick-help" class="help" [class.err]="!!error()">
        {{ error() ?? [...value().trim()].length + ' / ' + max }}
      </p>
      <div class="row">
        <button type="button" class="plain" (click)="clear()">Quitar mote</button>
        <button type="submit" class="ok" [disabled]="!!error() || busy()">Guardar</button>
      </div>
    </form>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 30;
      background: color-mix(in srgb, var(--ink) 45%, transparent);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--dur-panel) var(--ease-drawer);
    }
    .sheet {
      position: fixed;
      z-index: 31;
      inset: auto 0 0;
      display: grid;
      gap: var(--s-2);
      padding: var(--s-4) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      border-radius: var(--r-sheet) var(--r-sheet) 0 0;
      background: var(--surface-opaque);
      color: var(--surface-text);
      box-shadow: var(--shadow-lg);
      transform: translateY(100%);
      transition: transform var(--dur-panel) var(--ease-drawer);
    }
    .is-open {
      opacity: 1;
      pointer-events: auto;
    }
    .sheet.is-open {
      transform: none;
    }
    label {
      font: 600 1rem/1 var(--font-display);
    }
    input {
      min-height: 48px;
      padding: 0 var(--s-3);
      border: 1px solid var(--field-border);
      border-radius: 12px;
      background: var(--field-bg);
      color: inherit;
      font-size: 1.1rem;
    }
    .help {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.8;
    }
    .err {
      color: var(--danger-ink);
      opacity: 1;
    }
    .row {
      display: flex;
      justify-content: space-between;
    }
    button {
      min-height: 44px;
      padding: 0 var(--s-4);
      border: 0;
      border-radius: var(--r-chip);
      background: none;
      color: inherit;
      font: 600 1rem/1 system-ui;
    }
    .ok {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .ok:disabled {
      opacity: 0.5;
    }
  `,
})
export class RenameSheetComponent {
  readonly open = input(false);
  readonly nickname = input<string | null>(null);
  readonly speciesName = input('');
  readonly busy = input(false);
  readonly saved = output<string | null>();
  readonly closed = output<void>();
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly max = NICKNAME_MAX;
  protected readonly value = signal('');

  constructor() {
    // Al abrir: el mote actual y el foco en el campo.
    effect(() => {
      if (!this.open()) return;
      this.value.set(this.nickname() ?? '');
      queueMicrotask(() => this.field().nativeElement.focus());
    });
  }

  protected error(): string | null {
    try {
      normalizeNickname(this.value());
      return null;
    } catch (err) {
      return err instanceof RangeError ? err.message : 'Mote no válido';
    }
  }

  protected save(): void {
    if (this.error()) return;
    this.saved.emit(normalizeNickname(this.value()));
  }

  protected clear(): void {
    this.saved.emit(null);
  }
}
