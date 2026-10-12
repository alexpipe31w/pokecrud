import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import type { Weather } from '@shared/engine/spawns';
import { addIcons } from 'ionicons';
import {
  cloudOutline,
  cloudyOutline,
  flagOutline,
  moonOutline,
  rainyOutline,
  snowOutline,
  sunnyOutline,
} from 'ionicons/icons';

/** Texto e icono de cada clima de juego (ARQUITECTURA §5). Despejado de noche = luna. */
const WEATHER: Record<Weather, { label: string; icon: string }> = {
  clear: { label: 'Despejado', icon: 'sunny-outline' },
  cloudy: { label: 'Nublado', icon: 'cloudy-outline' },
  rain: { label: 'Lluvia', icon: 'rainy-outline' },
  snow: { label: 'Nieve', icon: 'snow-outline' },
  fog: { label: 'Niebla', icon: 'cloud-outline' },
  windy: { label: 'Viento', icon: 'flag-outline' },
};

/** Clima del HUD del mapa (DISENO §1, arriba a la derecha). Sin datos no se muestra: nunca "undefined". */
@Component({
  selector: 'app-weather-chip',
  imports: [IonIcon],
  template: `
    @if (view(); as v) {
      <div class="chip" role="status" [attr.aria-label]="'Clima: ' + v.label">
        <ion-icon [name]="v.icon" aria-hidden="true" />
        <span>{{ v.label }}</span>
      </div>
    }
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--s-1);
      min-height: 32px;
      padding: 0 var(--s-3);
      border-radius: var(--r-chip);
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
      font: 600 0.8rem/1 var(--font-display);
    }
    ion-icon {
      font-size: 1.1rem;
    }
  `,
})
export class WeatherChipComponent {
  readonly weather = input<Weather | null>(null);
  readonly night = input(false);

  protected readonly view = computed(() => {
    const w = this.weather();
    if (!w || !(w in WEATHER)) return null;
    const v = WEATHER[w];
    return w === 'clear' && this.night() ? { ...v, icon: 'moon-outline' } : v;
  });

  constructor() {
    addIcons({
      cloudOutline,
      cloudyOutline,
      flagOutline,
      moonOutline,
      rainyOutline,
      snowOutline,
      sunnyOutline,
    });
  }
}
