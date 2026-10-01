import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartOutline, listOutline, peopleOutline, sparklesOutline } from 'ionicons/icons';

/**
 * Contenedor de pestañas de la app.
 * El diseño final de la barra (íconos, colores, cabecera) corresponde a IS-14 · HU-06.
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({ listOutline, peopleOutline, heartOutline, sparklesOutline });
  }
}
