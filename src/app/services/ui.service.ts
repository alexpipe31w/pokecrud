import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Tiempo durante el que no se repite el mismo toast de error. */
const ERROR_DEDUPE_MS = 3000;

/** Atajos para toasts y confirmaciones usados por las páginas del CRUD. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private lastError = '';
  private lastErrorAt = 0;

  async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
  }

  /**
   * Toast de error para el interceptor HTTP. Si varias peticiones fallan a la vez
   * (por ejemplo, con el backend apagado) el mismo mensaje se muestra una sola vez.
   */
  errorToast(message: string): void {
    const now = Date.now();
    if (message === this.lastError && now - this.lastErrorAt < ERROR_DEDUPE_MS) return;
    this.lastError = message;
    this.lastErrorAt = now;
    void this.toast(message, 'danger');
  }

  /** Muestra un diálogo de confirmación y resuelve `true` si el usuario acepta. */
  async confirm(header: string, message: string, confirmText = 'Eliminar'): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: confirmText, role: 'confirm', cssClass: 'alert-button-danger' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }
}
