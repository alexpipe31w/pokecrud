import { signal } from '@angular/core';

/** Tiempo para deshacer una transferencia antes de que llegue al servidor (F3-03). */
export const UNDO_MS = 5_000;
export type TransferState = 'pending' | 'committing' | 'done' | 'undone' | 'failed';

/**
 * Transferir con deshacer (F3-03): se espera UNDO_MS antes de llamar al servidor; deshacer = no llamarlo nunca (no
 * hace falta "des-transferir" en el servidor). `flush()` confirma ya (al salir de la app o empezar otra).
 */
export class PendingTransfer {
  readonly state = signal<TransferState>('pending');
  private readonly timer: ReturnType<typeof setTimeout>;

  constructor(
    readonly id: string,
    private readonly commit: (id: string) => Promise<unknown> | unknown,
  ) {
    this.timer = setTimeout(() => void this.run(), UNDO_MS);
  }

  undo(): boolean {
    if (this.state() !== 'pending') return false;
    clearTimeout(this.timer);
    this.state.set('undone');
    return true;
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    return this.run();
  }

  private async run(): Promise<void> {
    if (this.state() !== 'pending') return;
    this.state.set('committing');
    try {
      await this.commit(this.id);
      this.state.set('done');
    } catch {
      this.state.set('failed');
    }
  }
}
