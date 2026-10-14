import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ThreeJSOverlayView } from '@googlemaps/three';
import { IonContent } from '@ionic/angular';
import { fromLocalM, toLocalM, type LatLng } from '@shared/engine/geo';
import { MAPS_MAP_ID, loadMapsLibrary, mapsAuthFailed } from '../../core/maps/google-maps.loader';
import { joystickVelocity } from '../../game/geo/joystick-math';
import { AvatarMotion, type Gait } from '../../game/map-scene/avatar-motion';
import { CompassService } from '../../services/location/compass.service';
import { DEFAULT_CENTER, LocationService } from '../../services/location/location.service';
import { JoystickComponent, type JoystickVector } from '../../shared/ui/joystick.component';
import { LocationGateComponent } from '../map/location-gate.component';
import { FpsMeter, FpsSummary } from './fps-meter';
import { MAX_SPAWNS, SpikeScene, artworkUrl, spawnSpots } from './spike-scene';

/** Plan A = overlay three.js; plan B = markers HTML con CSS; `none` = solo el mapa (la línea base). */
type Mode = 'none' | 'three' | 'markers';

interface BenchResult extends FpsSummary {
  mode: Mode;
  count: number;
}

/** Parque Santander, Neiva (cerca de la FET): calles y edificios con volumen en el mapa vectorial. */
const CENTER = DEFAULT_CENTER;
/** Modo "Sígueme": si el jugador se aleja más de esto del origen se re-ancla la escena (precisión de float32). */
const REANCHOR_M = 1000;
const SEED = 20261011;
const ZOOM = 19;
const TILT = 67.5;
const WARMUP_MS = 2_000;
const MEASURE_MS = 10_000;
const BATTERY: { mode: Mode; count: number }[] = [
  { mode: 'none', count: 0 },
  { mode: 'three', count: 10 },
  { mode: 'three', count: 30 },
  { mode: 'three', count: MAX_SPAWNS },
  { mode: 'markers', count: 10 },
  { mode: 'markers', count: 30 },
  { mode: 'markers', count: MAX_SPAWNS },
];
const M_PER_DEG_LAT = 111_320;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * SPIKE F1-01 (solo desarrollo, /dev/mapa): Google Maps vectorial con inclinación + la escena que tendrá el juego,
 * dibujada como overlay three.js (plan A) o como markers HTML (plan B), con medidor de fps y una batería de
 * mediciones con la cámara girando (lo que hará la brújula). Los resultados salen en pantalla y en la consola con
 * el prefijo `[F1-01]` (en el móvil: chrome://inspect). No es la pantalla del juego: eso es F1-04.
 *
 * F1-03 añade el modo "Sígueme": GPS filtrado (o joystick) + brújula + `AvatarMotion`, para probar la ubicación en
 * un Android real antes de que exista `/mapa`.
 */
@Component({
  selector: 'app-dev-map',
  imports: [IonContent, JoystickComponent, LocationGateComponent],
  template: `
    <!-- Pantalla completa: anula la zona segura global (D-022) y coloca los controles con --ion-safe-area-*. -->
    <ion-content
      [scrollY]="false"
      style="--padding-top: 0; --padding-bottom: 0; --padding-start: 0; --padding-end: 0"
    >
      <div #mapEl class="map"></div>

      <div class="hud top">
        <div class="fps" [class.bad]="fps() < 45">{{ fps() }} <small>fps</small></div>
        <div class="meta">{{ modeLabel(mode()) }} · {{ count() }} Pokémon · {{ renderInfo() }}</div>
        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
        @if (status()) {
          <div class="status">{{ status() }}</div>
        }
        @if (following()) {
          <div class="status">
            {{ location.status() }} · {{ gait() }} · {{ speed() }} m/s
            @if (location.position(); as p) {
              · ±{{ round(p.accuracy) }} m
            }
            · rumbo {{ compass.heading() === null ? '—' : round(compass.heading()!) + '°' }}
          </div>
          <div class="row">
            @if (location.status() === 'joystick') {
              <button (click)="useGps()">Usar GPS</button>
            }
            <button (click)="stopFollowing()">Dejar de seguir</button>
          </div>
        }
      </div>

      @if (following()) {
        <app-location-gate />
        @if (location.status() === 'joystick') {
          <app-joystick (vector)="joy = $event" />
        }
      }

      <div class="hud bottom" [hidden]="following()">
        <div class="row">
          @for (m of modes; track m) {
            <button [class.on]="mode() === m" [disabled]="running()" (click)="setMode(m)">
              {{ modeLabel(m) }}
            </button>
          }
        </div>
        <div class="row">
          @for (n of counts; track n) {
            <button [class.on]="count() === n" [disabled]="running()" (click)="setCount(n)">
              {{ n }}
            </button>
          }
          <button
            [class.on]="spinning()"
            [disabled]="running()"
            (click)="spinning.set(!spinning())"
          >
            Girar
          </button>
        </div>
        <div class="row">
          <button class="primary" [disabled]="running() || !ready()" (click)="runBattery()">
            Medir batería ({{ batteryMinutes }} min)
          </button>
          <button [disabled]="running() || !ready()" (click)="follow()">Sígueme</button>
        </div>
        @if (results().length) {
          <table>
            <tr>
              <th>Modo</th>
              <th>N</th>
              <th>fps</th>
              <th>p95 ms</th>
              <th>tirones</th>
            </tr>
            @for (r of results(); track $index) {
              <tr [class.bad]="r.avgFps < 45">
                <td>{{ modeLabel(r.mode) }}</td>
                <td>{{ r.count }}</td>
                <td>{{ r.avgFps }}</td>
                <td>{{ r.p95Ms }}</td>
                <td>{{ r.jankPct }} %</td>
              </tr>
            }
          </table>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .map {
      position: absolute;
      inset: 0;
      background: #1b2a2f;
    }
    .hud {
      position: absolute;
      left: calc(var(--ion-safe-area-left, 0px) + 12px);
      right: calc(var(--ion-safe-area-right, 0px) + 12px);
      color: #fff;
      font:
        600 13px/1.3 system-ui,
        sans-serif;
      pointer-events: none;
    }
    .hud > * {
      pointer-events: auto;
    }
    .hud[hidden] {
      display: none;
    }
    .top {
      top: calc(var(--ion-safe-area-top, 0px) + 12px);
    }
    .bottom {
      bottom: calc(var(--ion-safe-area-bottom, 0px) + 12px);
      display: grid;
      gap: 8px;
    }
    .fps {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.6);
      font-size: 28px;
      font-variant-numeric: tabular-nums;
    }
    .fps.bad,
    tr.bad td {
      color: #ff8a80;
    }
    .meta,
    .status,
    .error {
      margin-top: 6px;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.55);
      width: fit-content;
    }
    .error {
      background: rgba(183, 28, 28, 0.85);
    }
    .row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    button {
      flex: 1;
      min-height: 40px;
      border: 0;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font: inherit;
    }
    button.on {
      background: #26a69a;
    }
    button.primary {
      background: #ef5350;
    }
    button:disabled {
      opacity: 0.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(0, 0, 0, 0.65);
      border-radius: 10px;
      font-variant-numeric: tabular-nums;
    }
    th,
    td {
      padding: 3px 6px;
      text-align: right;
    }
    th:first-child,
    td:first-child {
      text-align: left;
    }
  `,
})
export class DevMapPage implements OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');

  protected readonly modes: Mode[] = ['none', 'three', 'markers'];
  protected readonly counts = [10, 30, MAX_SPAWNS];
  protected readonly batteryMinutes = Math.ceil(
    (BATTERY.length * (WARMUP_MS + MEASURE_MS)) / 60_000,
  );

  protected readonly fps = signal(0);
  protected readonly mode = signal<Mode>('three');
  protected readonly count = signal(30);
  protected readonly spinning = signal(false);
  protected readonly running = signal(false);
  protected readonly ready = signal(false);
  protected readonly error = signal('');
  protected readonly status = signal('Cargando Google Maps…');
  protected readonly renderInfo = signal('');
  protected readonly results = signal<BenchResult[]>([]);

  private map?: google.maps.Map;
  private overlay?: ThreeJSOverlayView;
  private spike?: SpikeScene;
  private markers: google.maps.marker.AdvancedMarkerElement[] = [];
  private AdvancedMarker?: typeof google.maps.marker.AdvancedMarkerElement;
  private readonly meter = new FpsMeter();
  private raf = 0;
  private heading = 0;
  private lastFrame = 0;
  private destroyed = false;

  // Modo "Sígueme" (F1-03).
  protected readonly location = inject(LocationService);
  protected readonly compass = inject(CompassService);
  protected readonly following = signal(false);
  protected readonly gait = signal<Gait>('idle');
  protected readonly speed = signal('0.0');
  protected readonly round = Math.round;
  /** Último vector del joystick (se lee en cada fotograma; no hace falta que sea signal). */
  protected joy: JoystickVector = { dx: 0, dy: 0 };
  private motion = new AvatarMotion();
  /** Origen de la escena (= ancla del overlay) en modo "Sígueme"; null hasta el primer fix. */
  private origin: LatLng | null = null;

  constructor() {
    afterNextRender(() => void this.init());
  }

  protected modeLabel(m: Mode): string {
    return m === 'none' ? 'Solo mapa' : m === 'three' ? 'three.js' : 'Markers';
  }

  protected setMode(m: Mode): void {
    this.mode.set(m);
    this.apply();
  }

  protected setCount(n: number): void {
    this.count.set(n);
    this.apply();
  }

  /** Cada configuración: 2 s de calentamiento y 10 s midiendo con la cámara dando una vuelta completa. */
  protected async runBattery(): Promise<void> {
    this.running.set(true);
    this.results.set([]);
    const prev = { mode: this.mode(), count: this.count(), spinning: this.spinning() };
    this.spinning.set(true);
    try {
      for (const [i, cfg] of BATTERY.entries()) {
        if (this.destroyed) return;
        this.mode.set(cfg.mode);
        this.count.set(cfg.count);
        this.apply();
        this.status.set(
          `Midiendo ${i + 1}/${BATTERY.length}: ${this.modeLabel(cfg.mode)} × ${cfg.count}`,
        );
        await sleep(WARMUP_MS);
        this.meter.reset();
        await sleep(MEASURE_MS);
        const result: BenchResult = { ...cfg, ...this.meter.summary() };
        this.results.update((r) => [...r, result]);
        console.log('[F1-01] resultado', JSON.stringify(result));
      }
      console.log(
        '[F1-01] batería',
        JSON.stringify({ device: this.deviceInfo(), results: this.results() }),
      );
      this.status.set('Batería terminada: resultados abajo y en la consola ([F1-01]).');
    } finally {
      this.mode.set(prev.mode);
      this.count.set(prev.count);
      this.spinning.set(prev.spinning);
      this.apply();
      this.running.set(false);
    }
  }

  /** Modo "Sígueme": el avatar va a la posición del GPS filtrado (o del joystick) y la cámara gira con la brújula. */
  protected async follow(): Promise<void> {
    this.following.set(true);
    this.spinning.set(false);
    this.setMode('three');
    this.compass.start();
    await this.location.start();
    // Joystick guardado en ajustes de otra sesión: arranca sin posición → se le da el centro por defecto.
    if (this.location.status() === 'joystick' && !this.location.position()) {
      this.location.useJoystickAt(CENTER);
    }
  }

  protected async useGps(): Promise<void> {
    this.joy = { dx: 0, dy: 0 };
    await this.location.useGps();
  }

  protected stopFollowing(): void {
    void this.location.stop();
    this.compass.stop();
    this.following.set(false);
    this.joy = { dx: 0, dy: 0 };
    this.origin = null;
    this.spike?.setPlayer(null);
    this.overlay?.setAnchor({ ...CENTER, altitude: 0 });
    this.map?.moveCamera({ center: CENTER, heading: 0 });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    void this.location.stop();
    this.compass.stop();
    cancelAnimationFrame(this.raf);
    this.clearMarkers();
    this.overlay?.setMap(null);
    this.spike?.dispose();
  }

  private async init(): Promise<void> {
    try {
      const { Map, RenderingType } = await loadMapsLibrary('maps');
      const { AdvancedMarkerElement } = await loadMapsLibrary('marker');
      if (this.destroyed) return;
      this.AdvancedMarker = AdvancedMarkerElement;

      this.map = new Map(this.mapEl().nativeElement, {
        center: CENTER,
        zoom: ZOOM,
        tilt: TILT,
        heading: 0,
        mapId: MAPS_MAP_ID,
        renderingType: RenderingType.VECTOR,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      this.map.addListener('renderingtype_changed', () => this.updateRenderInfo());

      this.spike = new SpikeScene(SEED);
      this.overlay = new ThreeJSOverlayView({
        anchor: { ...CENTER, altitude: 0 },
        upAxis: 'Y',
        scene: this.spike.scene,
        animationMode: 'always',
        addDefaultLighting: true,
      });
      // ThreeJSOverlayView llama a onBeforeDraw antes de cada fotograma del mapa: ahí se anima la escena.
      this.overlay.onBeforeDraw = () => this.spike?.update(performance.now());

      this.apply();
      this.ready.set(true);
      this.status.set('');
      this.updateRenderInfo();
      this.raf = requestAnimationFrame((t) => this.tick(t));
      setTimeout(() => {
        if (mapsAuthFailed())
          this.error.set('Google rechazó la clave de Maps (restricciones de referrer).');
      }, 3000);
    } catch (err) {
      this.status.set('');
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar Google Maps.');
      console.error('[F1-01] carga del mapa', err);
    }
  }

  private tick(now: number): void {
    if (this.destroyed) return;
    this.meter.frame(now);
    const dt = this.lastFrame ? now - this.lastFrame : 0;
    this.lastFrame = now;
    if (this.spinning() && this.map) {
      // Una vuelta cada MEASURE_MS, como si el jugador girara sobre sí mismo con la brújula.
      this.heading = (this.heading + (dt * 360) / MEASURE_MS) % 360;
      this.map.moveCamera({ heading: this.heading });
    }
    if (this.following()) this.followStep(Math.min(dt / 1000, 0.1));
    if (Math.floor(now / 250) !== Math.floor((now - dt) / 250))
      this.fps.set(this.meter.recentFps());
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  /** Un fotograma del modo "Sígueme" (`dts` en segundos, con tope para no saltar al volver de segundo plano). */
  private followStep(dts: number): void {
    if (!this.map || !this.overlay || !this.spike) return;
    const camHeading = this.compass.heading() ?? 0;
    if (this.location.status() === 'joystick') {
      const v = joystickVelocity(this.joy.dx, this.joy.dy, camHeading);
      if (v.east || v.north) this.location.nudge(v.east * dts, v.north * dts);
    }
    const pos = this.location.position();
    if (!pos) return;
    let local = this.origin ? toLocalM(this.origin, pos) : null;
    if (!this.origin || !local || Math.hypot(local.east, local.north) > REANCHOR_M) {
      // Primer fix (o muy lejos del origen): la escena se ancla aquí y el avatar aparece sin animar.
      this.origin = { lat: pos.lat, lng: pos.lng };
      this.overlay.setAnchor({ ...this.origin, altitude: 0 });
      this.motion = new AvatarMotion();
      local = { east: 0, north: 0 };
    }
    this.motion.setTarget(local.east, local.north);
    const f = this.motion.step(dts);
    this.spike.setPlayer(f);
    this.map.moveCamera({ center: fromLocalM(this.origin, f.east, f.north), heading: camHeading });
    if (f.gait !== this.gait()) this.gait.set(f.gait);
    const speed = f.speed.toFixed(1);
    if (speed !== this.speed()) this.speed.set(speed);
  }

  /** Aplica modo y cantidad: el overlay solo se monta en modo three.js; los markers solo en modo markers. */
  private apply(): void {
    if (!this.map || !this.overlay || !this.spike) return;
    const mode = this.mode();
    this.spike.setCount(this.count());
    this.overlay.setMap(mode === 'three' ? this.map : null);
    this.clearMarkers();
    if (mode === 'markers') this.addMarkers(this.count());
  }

  /** Plan B: cada Pokémon es un <img> con animación CSS (rebote) y sombra, como AdvancedMarkerElement. */
  private addMarkers(n: number): void {
    if (!this.AdvancedMarker || !this.map) return;
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((CENTER.lat * Math.PI) / 180);
    for (const spot of spawnSpots(SEED, n)) {
      const el = document.createElement('div');
      el.style.cssText = 'display:grid;justify-items:center;';
      const img = document.createElement('img');
      img.src = artworkUrl(spot.dexId);
      img.alt = '';
      img.width = 56;
      img.height = 56;
      img.style.cssText = `animation: f101-bob 1.6s ease-in-out ${-spot.phase}s infinite alternate; will-change: transform;`;
      const shadow = document.createElement('div');
      shadow.style.cssText =
        'width:28px;height:8px;margin-top:-6px;border-radius:50%;background:rgba(0,0,0,.25);';
      el.append(img, shadow);
      this.markers.push(
        new this.AdvancedMarker({
          map: this.map,
          position: {
            lat: CENTER.lat - spot.z / M_PER_DEG_LAT,
            lng: CENTER.lng + spot.x / mPerDegLng,
          },
          content: el,
        }),
      );
    }
    ensureBobKeyframes();
  }

  private clearMarkers(): void {
    for (const m of this.markers) m.map = null;
    this.markers = [];
  }

  private updateRenderInfo(): void {
    const type = this.map?.getRenderingType();
    this.renderInfo.set(
      type === 'VECTOR' ? 'vectorial' : type === 'RASTER' ? 'RASTER (sin 3D)' : '…',
    );
  }

  private deviceInfo(): Record<string, unknown> {
    const gl = document.createElement('canvas').getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent,
      dpr: window.devicePixelRatio,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      gpu: dbg ? gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocida',
      renderingType: this.map?.getRenderingType(),
    };
  }
}

/** Los keyframes van al documento: el contenido de los markers vive fuera del componente (sin encapsulación). */
function ensureBobKeyframes(): void {
  if (document.getElementById('f101-bob')) return;
  const style = document.createElement('style');
  style.id = 'f101-bob';
  style.textContent =
    '@keyframes f101-bob { from { transform: translateY(0); } to { transform: translateY(-8px); } }';
  document.head.append(style);
}
