import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

/** Atajos para toasts y confirmaciones usados por las páginas del CRUD. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  async toast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });
    await toast.present();
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
