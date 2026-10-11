import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { DatasetService } from './services/game/dataset.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // El dataset de las 1025 especies se carga una vez al arrancar (assets → IndexedDB).
    void inject(DatasetService).load();
  }
}
