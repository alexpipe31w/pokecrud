import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ThreeJSOverlayView } from '@googlemaps/three';
import { IonContent, ViewDidEnter, ViewWillLeave } from '@ionic/angular';
import { fromLocalM, toLocalM, type LatLng } from '@shared/engine/geo';
import type { Weather } from '@shared/engine/spawns';
import type { NearbySpawns } from '@shared/protocol/spawns';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { MAPS_MAP_ID, loadMapsLibrary, mapsAuthFailed } from '../../core/maps/google-maps.loader';
import { joystickVelocity } from '../../game/geo/joystick-math';
import { AvatarMotion } from '../../game/map-scene/avatar-motion';
import { isNightLocal } from '../../game/map-scene/day-night';
import { MapScene, REANCHOR_M } from '../../game/map-scene/map-scene';
import { BagService } from '../../services/game/bag.service';
import { CompassService } from '../../services/location/compass.service';
import { DEFAULT_CENTER, LocationService } from '../../services/location/location.service';
import { JoystickComponent, type JoystickVector } from '../../shared/ui/joystick.component';
import { PlayerHudComponent } from '../../shared/ui/player-hud.component';
import { BallMenuComponent } from './ball-menu.component';
import { LocationGateComponent } from './location-gate.component';
import { MapCompassComponent } from './map-compass.component';
import { WeatherChipComponent } from './weather-chip.component';

/** Zoom 19 como el spike medido (D-035): a 18 el avatar provisional casi no se veía. El pellizco deja 17-20. */
const ZOOM = 19;
const TILT = 67.5;
/** Cada cuánto se mira si se ha cruzado las 19:00 o las 6:00 (el esquema de color solo se fija al crear el mapa). */
const NIGHT_CHECK_MS = 60_000;
/** Google avisa de una clave rechazada llamando a `gm_authFailure` poco después de cargar: se mira pasado este tiempo. */
const AUTH_CHECK_MS = 3000;
/** Tras perder el contexto WebGL con la app visible, se espera un poco antes de rehacer el mapa. */
const GL_RECOVER_DELAY_MS = 500;
/** El clima del HUD sale de `GET /spawns` (F1-07 lo cambia por el feed de spawns): sin respuesta en este tiempo, sin chip. */
const WEATHER_TIMEOUT_MS = 8000;

/**
 * Pantalla principal del juego (F1-04): Google Maps vectorial inclinado que sigue al jugador (GPS filtrado o
 * joystick) y gira con su brújula, con la escena three.js encima (plan A, D-035). Pantalla completa: anula la zona
 * segura global (D-022) y coloca sus controles con `--ion-safe-area-*`.
 *
 * Con `ion-router-outlet` la página NO se destruye al abrir otra encima (p. ej. la Pokédex): al salir se pausan el
 * bucle, el GPS y la brújula (`ionViewWillLeave`) y al volver se reanudan (`ionViewDidEnter`).
 */
@Component({
  selector: 'app-map',
  imports: [
    IonContent,
    BallMenuComponent,
    JoystickComponent,
    LocationGateComponent,
    MapCompassComponent,
    PlayerHudComponent,
    WeatherChipComponent,
  ],
  template: `
    <ion-content
      [scrollY]="false"
      style="--padding-top: 0; --padding-bottom: 0; --padding-start: 0; --padding-end: 0"
    >
      <div #mapEl class="map" [class.is-night]="night()"></div>

      <!-- HUD (DISENO §1): placa del jugador arriba a la izquierda; brújula y clima arriba a la derecha. -->
      <div class="hud">
        @if (auth.player(); as p) {
          <app-player-hud [nickname]="p.nickname" [xp]="p.xp" [balls]="bag.balls()" />
        }
        <div class="hud__right">
          <app-map-compass
            [heading]="cameraHeading()"
            [northUp]="northUp()"
            (modeToggle)="northUp.set(!northUp())"
          />
          <app-weather-chip [weather]="weather()" [night]="night()" />
        </div>
      </div>
      <app-ball-menu />

      <app-location-gate [mapsError]="mapsError()" (retryMaps)="retryMaps()" />
      @if (location.status() === 'joystick') {
        <app-joystick (vector)="joy = $event" />
      }
    </ion-content>
  `,
  styles: `
    .map {
      position: absolute;
      inset: 0;
      background: var(--paper-2);
    }
    .map.is-night {
      background: var(--ink);
    }
    .hud {
      position: absolute;
      z-index: 10;
      top: calc(var(--ion-safe-area-top, 0px) + var(--s-3));
      left: var(--s-3);
      right: var(--s-3);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--s-2);
      pointer-events: none;
    }
    .hud > *,
    .hud__right > * {
      pointer-events: auto;
    }
    .hud__right {
      margin-left: auto;
      display: grid;
      justify-items: end;
      gap: var(--s-2);
      pointer-events: none;
    }
  `,
})
export class MapPage implements ViewDidEnter, ViewWillLeave, OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  protected readonly location = inject(LocationService);
  private readonly compass = inject(CompassService);
  private readonly http = inject(HttpClient);
  protected readonly auth = inject(AuthService);
  protected readonly bag = inject(BagService);

  protected readonly night = signal(isNightLocal(new Date()));
  /** Por qué no se pudo cargar Google Maps (la pantalla de estados lo muestra con "Reintentar"). */
  protected readonly mapsError = signal<string | null>(null);
  /** `true` = norte siempre arriba; `false` = el mapa gira con la brújula (lo alterna la brújula del HUD). */
  protected readonly northUp = signal(false);
  /** Rumbo de la cámara redondeado a grados (para la aguja del HUD; no cambia en cada fotograma). */
  protected readonly cameraHeading = signal(0);
  /** Clima de la celda del jugador (GET /spawns); null = sin datos todavía o el servidor no respondió. */
  protected readonly weather = signal<Weather | null>(null);
  /** Último vector del joystick (se lee en cada fotograma; no hace falta que sea signal). */
  protected joy: JoystickVector = { dx: 0, dy: 0 };

  private readonly mapScene = new MapScene();
  private motion = new AvatarMotion();
  private map?: google.maps.Map;
  private overlay?: ThreeJSOverlayView;
  /** Origen de la escena (= ancla del overlay): la primera posición conocida; null hasta tenerla. */
  private origin: LatLng | null = null;
  private raf = 0;
  private lastFrame = 0;
  private nightTimer?: ReturnType<typeof setInterval>;
  private active = false;
  /** El clima se pide una vez por visita, en cuanto hay posición. */
  private weatherAsked = false;
  private destroyed = false;
  private rebuilding = false;
  /** Android quitó el contexto WebGL del mapa (app en segundo plano, pantalla bloqueada…): hay que rehacerlo. */
  private glLost = false;
  private readonly onContextLost = (): void => {
    console.warn('[mapa] contexto WebGL perdido');
    this.glLost = true;
    if (!document.hidden) setTimeout(() => this.recoverIfLost(), GL_RECOVER_DELAY_MS);
  };
  private readonly onVisibility = (): void => {
    if (!document.hidden) this.recoverIfLost();
  };

  constructor() {
    afterNextRender(() => void this.init());
  }

  ionViewDidEnter(): void {
    if (this.active || this.destroyed) return;
    this.active = true;
    this.weatherAsked = false;
    this.recoverIfLost();
    void this.bag.load();
    this.compass.start();
    void this.startLocation();
    this.lastFrame = 0;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  ionViewWillLeave(): void {
    this.active = false;
    cancelAnimationFrame(this.raf);
    void this.location.stop();
    this.compass.stop();
    this.joy = { dx: 0, dy: 0 };
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ionViewWillLeave();
    clearInterval(this.nightTimer);
    this.mapEl().nativeElement.removeEventListener('webglcontextlost', this.onContextLost, true);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.overlay?.setMap(null);
    this.mapScene.dispose();
  }

  /** Carga Google Maps y monta el overlay. Los errores los muestra la pantalla de estados (paso 6). */
  private async init(): Promise<void> {
    this.mapsError.set(null);
    try {
      await this.createMap();
    } catch (err) {
      console.error('[mapa] no se pudo cargar Google Maps', err);
      this.mapsError.set(err instanceof Error ? err.message : 'Revisa tu conexión a internet.');
      return;
    }
    if (this.destroyed) return;
    setTimeout(() => {
      if (mapsAuthFailed()) this.mapsError.set('Google rechazó la clave del mapa.');
    }, AUTH_CHECK_MS);
    // El evento llega al canvas que crea Google dentro del div: se escucha en fase de captura.
    this.mapEl().nativeElement.addEventListener('webglcontextlost', this.onContextLost, true);
    document.addEventListener('visibilitychange', this.onVisibility);
    clearInterval(this.nightTimer);
    this.nightTimer = setInterval(() => {
      if (isNightLocal(new Date()) !== this.night()) void this.rebuildMap('cambio de día/noche');
      else this.recoverIfLost();
    }, NIGHT_CHECK_MS);
    // Por si Ionic disparó ionViewDidEnter antes de que el mapa existiera (primera carga).
    this.ionViewDidEnter();
  }

  protected retryMaps(): void {
    void this.init();
  }

  /** Si el canvas del mapa perdió su contexto WebGL (visto en el Samsung A36 al volver de segundo plano), lo rehace. */
  private recoverIfLost(): void {
    const canvas = this.mapEl().nativeElement.querySelector('canvas');
    const gl = canvas ? (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) : null;
    if (this.glLost || gl?.isContextLost()) void this.rebuildMap('contexto WebGL perdido');
  }

  /**
   * Rehace mapa y overlay desde cero (div vacío, overlay nuevo: su renderer va atado al contexto WebGL del mapa). Al
   * cruzar las 19:00/6:00 (el esquema de color solo se fija al crear el mapa) o si Android quitó el contexto WebGL.
   */
  private async rebuildMap(reason: string): Promise<void> {
    if (this.rebuilding || this.destroyed) return;
    this.rebuilding = true;
    console.warn(`[mapa] se rehace el mapa (${reason})`);
    try {
      this.glLost = false;
      this.overlay?.setMap(null);
      this.overlay = undefined;
      this.mapEl().nativeElement.replaceChildren();
      await this.createMap();
    } catch (err) {
      console.error('[mapa] no se pudo rehacer el mapa', err);
      this.mapsError.set(err instanceof Error ? err.message : 'Revisa tu conexión a internet.');
    } finally {
      this.rebuilding = false;
    }
  }

  /** (Re)crea el mapa: el esquema de color de día o de noche solo se puede fijar al crearlo. */
  private async createMap(): Promise<void> {
    const { Map, RenderingType } = await loadMapsLibrary('maps');
    const { ColorScheme } = await loadMapsLibrary('core');
    if (this.destroyed) return;
    const night = isNightLocal(new Date());
    this.night.set(night);
    this.mapScene.setNight(night);
    const center = this.cameraCenter();
    this.map = new Map(this.mapEl().nativeElement, {
      center,
      zoom: this.map?.getZoom() ?? ZOOM,
      minZoom: 17,
      maxZoom: 20,
      tilt: TILT,
      heading: 0,
      mapId: MAPS_MAP_ID,
      renderingType: RenderingType.VECTOR,
      colorScheme: night ? ColorScheme.DARK : ColorScheme.LIGHT,
      disableDefaultUI: true,
      clickableIcons: false,
      keyboardShortcuts: false,
      gestureHandling: 'greedy',
      headingInteractionEnabled: false,
      tiltInteractionEnabled: false,
    });
    if (!this.overlay) {
      this.overlay = new ThreeJSOverlayView({
        anchor: { ...(this.origin ?? center), altitude: 0 },
        upAxis: 'Y',
        scene: this.mapScene.scene,
        animationMode: 'always',
        // Las luces las pone MapScene (cambian de día a noche).
        addDefaultLighting: false,
      });
    }
    this.overlay.setMap(this.map);
  }

  /** GPS (o joystick si está activado en ajustes). Sin posición previa, el joystick empieza en el centro por defecto. */
  private async startLocation(): Promise<void> {
    await this.location.start();
    if (this.location.status() === 'joystick' && !this.location.position()) {
      this.location.useJoystickAt(DEFAULT_CENTER);
    }
  }

  private tick(now: number): void {
    if (!this.active) return;
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = now;
    this.step(dt, now);
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  /** Un fotograma: joystick → posición → `AvatarMotion` → escena y cámara. */
  private step(dt: number, now: number): void {
    if (!this.map || !this.overlay) return;
    const heading = this.northUp() ? 0 : (this.compass.heading() ?? 0);
    if (this.location.status() === 'joystick') {
      const v = joystickVelocity(this.joy.dx, this.joy.dy, heading);
      if (v.east || v.north) this.location.nudge(v.east * dt, v.north * dt);
    }
    const rounded = Math.round(heading);
    if (rounded !== this.cameraHeading()) this.cameraHeading.set(rounded);
    const pos = this.location.position();
    if (!pos) return;
    if (!this.weatherAsked) {
      this.weatherAsked = true;
      void this.loadWeather(pos);
    }
    if (!this.origin) {
      // Primera posición: la escena se ancla aquí y el avatar aparece sin animar.
      this.origin = { lat: pos.lat, lng: pos.lng };
      this.overlay.setAnchor({ ...this.origin, altitude: 0 });
      this.motion = new AvatarMotion();
    }
    const target = toLocalM(this.origin, pos);
    this.motion.setTarget(target.east, target.north);
    let f = this.motion.step(dt);
    if (Math.hypot(f.east, f.north) > REANCHOR_M) {
      // Lejos del origen: se re-ancla en el avatar para no perder precisión (float32) y se desplaza todo sin animar.
      this.origin = fromLocalM(this.origin, f.east, f.north);
      this.overlay.setAnchor({ ...this.origin, altitude: 0 });
      this.motion.shift(f.east, f.north);
      f = { ...f, east: 0, north: 0 };
    }
    this.mapScene.setPlayer(f, now);
    this.map.moveCamera({ center: fromLocalM(this.origin, f.east, f.north), heading });
  }

  /** Clima para el HUD. Si falla (sin red, servidor durmiendo, sin SPAWN_SALT → 503), simplemente no hay chip. */
  private async loadWeather(at: LatLng): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http
          .get<NearbySpawns>(`${environment.serverUrl}/spawns`, {
            params: { lat: at.lat, lng: at.lng },
          })
          .pipe(timeout(WEATHER_TIMEOUT_MS)),
      );
      this.weather.set(res.weather ?? null);
    } catch (err) {
      console.warn('[mapa] sin clima', err);
    }
  }

  /** Dónde poner la cámara al crear el mapa: el avatar si ya hay posición, si no el centro por defecto. */
  private cameraCenter(): LatLng {
    const p = this.location.position();
    return p ? { lat: p.lat, lng: p.lng } : DEFAULT_CENTER;
  }
}
