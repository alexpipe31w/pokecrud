import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { PagePlaceholderComponent } from '../../shared/components/page-placeholder/page-placeholder.component';

@Component({
  selector: 'app-my-pokemon',
  templateUrl: 'my-pokemon.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, PagePlaceholderComponent],
})
export class MyPokemonPage {}
