import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Avisos breves (toasts) de las páginas del CRUD. Las confirmaciones son `app-confirm-panel` (F3-06a). */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly toastCtrl = inject(ToastController);

  async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }
}
