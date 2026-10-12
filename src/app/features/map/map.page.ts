import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';

/** Pantalla principal del juego: el mapa (F1-04). Esqueleto: mapa, overlay, bucle y HUD llegan en los pasos 5-7. */
@Component({
  selector: 'app-map',
  imports: [IonContent],
  template: `<ion-content [scrollY]="false"></ion-content>`,
})
export class MapPage {}
