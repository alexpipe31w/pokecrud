import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MAPS_MAP_ID, loadMapsLibrary } from '../../core/maps/google-maps.loader';

const BALL_NAME: Record<string, string> = {
  POKE_BALL: 'Poké Ball',
  GREAT_BALL: 'Super Ball',
  ULTRA_BALL: 'Ultra Ball',
};
const DATE = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Dónde y cuándo se capturó (F3-03): fecha, bola y un mapa mini con un pin. El mapa solo se carga al verse
 * (IntersectionObserver): cada mapa cuenta como una carga de Maps. Si Maps falla → las coordenadas, nunca un hueco gris.
 */
@Component({
  selector: 'app-detail-origin',
  template: `
    <h2>Captura</h2>
    <p>{{ when() }} · {{ ballName() }}</p>
    <div #mapEl class="map" [class.hidden]="failed()" aria-hidden="true"></div>
    @if (failed()) {
      <p class="coords">Cerca de {{ coords() }}</p>
    }
  `,
  styles: `
    h2 {
      margin: var(--s-4) 0 var(--s-2);
      font: 600 1.05rem/1 var(--font-display);
    }
    p {
      margin: 0 0 var(--s-2);
    }
    .map {
      height: 160px;
      border-radius: var(--r-card);
      overflow: hidden;
      background: var(--paper-2);
    }
    .hidden {
      display: none;
    }
    .coords {
      font-variant-numeric: tabular-nums;
      opacity: 0.8;
    }
  `,
})
export class DetailOriginComponent implements OnDestroy {
  readonly caughtAt = input.required<string>();
  readonly ball = input.required<string>();
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  protected readonly when = computed(() => DATE.format(new Date(this.caughtAt())));
  protected readonly ballName = computed(() => BALL_NAME[this.ball()] ?? this.ball());
  protected readonly coords = computed(() => `${this.lat().toFixed(3)}, ${this.lng().toFixed(3)}`);
  protected readonly failed = signal(false);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return void this.showMap();
      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.observer?.disconnect();
        void this.showMap();
      });
      this.observer.observe(this.mapEl().nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private async showMap(): Promise<void> {
    try {
      const { Map } = await loadMapsLibrary('maps');
      const { AdvancedMarkerElement } = await loadMapsLibrary('marker');
      const position = { lat: this.lat(), lng: this.lng() };
      const map = new Map(this.mapEl().nativeElement, {
        center: position,
        zoom: 16,
        mapId: MAPS_MAP_ID,
        disableDefaultUI: true,
        gestureHandling: 'none',
        clickableIcons: false,
        keyboardShortcuts: false,
      });
      new AdvancedMarkerElement({ map, position });
    } catch (err) {
      console.warn('[coleccion] mapa mini no disponible', err);
      this.failed.set(true);
    }
  }
}
