import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './core/auth/auth.service';
import { DatasetService } from './services/game/dataset.service';
import { ServerWakingComponent } from './shared/ui/server-waking.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, ServerWakingComponent],
})
export class AppComponent {
  constructor() {
    // El dataset de las 1025 especies se carga una vez al arrancar (assets → IndexedDB).
    void inject(DatasetService).load();
    // Si había sesión guardada, se recupera (refresh + /auth/me) sin esperar a que nadie la pida.
    void inject(AuthService).restore();
  }
}
