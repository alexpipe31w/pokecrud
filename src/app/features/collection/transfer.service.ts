import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import type { CollectionItem } from '@shared/protocol/collection';
import { CollectionService } from '../../services/game/collection.service';
import { PendingTransfer } from './pending-transfer';

/** Cuánto se ve el aviso de error. */
const ERROR_MS = 4_000;

interface Current {
  name: string;
  transfer: PendingTransfer;
  item: CollectionItem;
  index: number;
}

/**
 * Transferir con deshacer (F3-03): quita el Pokémon de "Mis Pokémon" al momento, espera `UNDO_MS` y entonces llama al
 * servidor. A nivel de app (`root`) para que la cuenta atrás siga aunque se cambie de pantalla. Solo hay una a la vez:
 * empezar otra confirma la anterior. Al ir la app a segundo plano se confirma ya (si no, se perdería).
 */
@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly collection = inject(CollectionService);
  readonly current = signal<Current | null>(null);
  readonly error = signal<string | null>(null);
  private errorTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const c = this.current();
      if (!c) return;
      const state = c.transfer.state();
      if (state === 'done') this.current.set(null);
      if (state === 'failed') {
        this.collection.restoreItem(c.item, c.index);
        this.current.set(null);
        this.showError(`No se pudo transferir a ${c.name}. Sigue en tu colección.`);
      }
    });
    const doc = inject(DOCUMENT);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) void this.current()?.transfer.flush();
    });
  }

  start(item: CollectionItem, name: string): void {
    const previous = this.current();
    if (previous) void previous.transfer.flush();
    const removed = this.collection.removeItem(item.id) ?? { item, index: 0 };
    const transfer = new PendingTransfer(item.id, (id) => this.collection.transfer(id));
    this.current.set({ name, transfer, ...removed });
  }

  undo(): void {
    const c = this.current();
    if (!c || !c.transfer.undo()) return;
    this.collection.restoreItem(c.item, c.index);
    this.current.set(null);
  }

  private showError(text: string): void {
    clearTimeout(this.errorTimer);
    this.error.set(text);
    this.errorTimer = setTimeout(() => this.error.set(null), ERROR_MS);
  }
}
