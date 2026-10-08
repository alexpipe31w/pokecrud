import { Component } from '@angular/core';
import { IonTabs } from '@ionic/angular';

/**
 * Contenedor de pestañas de la app.
 * El diseño final de la barra (íconos, colores, cabecera) corresponde a IS-14 · HU-06.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  imports: [IonTabs],
})
export class TabsPage {}
