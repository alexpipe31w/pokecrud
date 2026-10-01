import { Component, input } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { PagePlaceholderComponent } from '../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-pokemon-detail',
  templateUrl: 'pokemon-detail.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    PagePlaceholderComponent,
  ],
})
export class PokemonDetailPage {
  /** Parámetro `:id` de la ruta `/pokemon/:id` (llega por `withComponentInputBinding`). */
  readonly id = input<string>();
}
