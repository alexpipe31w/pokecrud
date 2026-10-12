import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ThreeJSOverlayView } from '@googlemaps/three';
import { IonContent, ViewDidEnter, ViewWillLeave } from '@ionic/angular';
import { distanceM, fromLocalM, toLocalM, type LatLng } from '@shared/engine/geo';
import * as THREE from 'three';

import { AuthService } from '../../core/auth/auth.service';
import { MAPS_MAP_ID, loadMapsLibrary, mapsAuthFailed } from '../../core/maps/google-maps.loader';
import { joystickVelocity } from '../../game/geo/joystick-math';
import { AvatarMotion } from '../../game/map-scene/avatar-motion';
import { isNightLocal } from '../../game/map-scene/day-night';
import {
  CryThrottle,
  cryGain,
  isTap,
  toNdc,
  type PointerMark,
} from '../../game/map-scene/map-input';
import { MapScene, REACH_RADIUS_M, REANCHOR_M } from '../../game/map-scene/map-scene';
import { nearestN } from '../../game/map-scene/spawn-diff';
import { AudioService } from '../../services/game/audio.service';
import { BagService } from '../../services/game/bag.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SpawnFeedService } from '../../services/game/spawn-feed.service';
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
/**
 * Al volver a la pantalla (o perder el contexto WebGL con ella a la vista) se espera esto antes de comprobar el mapa:
 * Google suele recuperar solo el contexto que soltó al ocultarse, y así no se rehace sin necesidad.
 */
const GL_RECOVER_DELAY_MS = 1500;
/** Tope de reconstrucciones del mapa en REBUILD_WINDOW_MS (si WebGL no vuelve, no se entra en bucle). */
const MAX_REBUILDS = 3;
const REBUILD_WINDOW_MS = 60_000;
/** Cada cuánto se mira si toca pedir `/spawns` y se recolocan los Pokémon dibujados (F1-07). */
const SPAWN_SYNC_MS = 250;
/** Cuánto se ve el aviso "Acércate más" al tocar un Pokémon fuera de alcance. */
const TOO_FAR_MS = 1500;

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
          <app-weather-chip [weather]="spawnFeed.weather()" [night]="night()" />
        </div>
      </div>
      @if (notice(); as n) {
        <div class="notice" role="status">{{ n }}</div>
      }
      <app-ball-menu />

      <app-location-gate [mapsError]="mapsError()" (retryMaps)="retryMaps()" />
      @if (location.status() === 'joystick') {
        <app-joystick (vector)="joy = $event" />
      }
    </ion-content>
  `,
  styles: `
    /* Vidrio sin esmerilar sobre el mapa 3D (D-039): el desenfoque costaba hasta 18 fps en el Samsung A36. */
    :host {
      --glass-filter: none;
      --surface: var(--surface-opaque);
    }
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
    .notice {
      position: absolute;
      z-index: 10;
      left: 50%;
      bottom: calc(var(--ion-safe-area-bottom, 0px) + 112px);
      transform: translateX(-50%);
      max-width: calc(100% - 2 * var(--s-4));
      padding: var(--s-2) var(--s-4);
      border-radius: var(--r-chip);
      background: var(--surface);
      color: var(--surface-text);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-sm);
      font: 600 0.85rem/1.3 var(--font-display);
      text-align: center;
      pointer-events: none;
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
  protected readonly auth = inject(AuthService);
  protected readonly bag = inject(BagService);
  protected readonly spawnFeed = inject(SpawnFeedService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly router = inject(Router);

  protected readonly night = signal(isNightLocal(new Date()));
  /** Por qué no se pudo cargar Google Maps (la pantalla de estados lo muestra con "Reintentar"). */
  protected readonly mapsError = signal<string | null>(null);
  /** `true` = norte siempre arriba; `false` = el mapa gira con la brújula (lo alterna la brújula del HUD). */
  protected readonly northUp = signal(false);
  /** Rumbo de la cámara redondeado a grados (para la aguja del HUD; no cambia en cada fotograma). */
  protected readonly cameraHeading = signal(0);
  /** "Acércate más" tras tocar un Pokémon lejano (gana al error del feed mientras dura). */
  private readonly tooFar = signal(false);
  /** Aviso flotante sobre el mapa: Pokémon fuera de alcance o el feed de Pokémon salvajes caído. */
  protected readonly notice = computed(() =>
    this.tooFar() ? 'Acércate más para atraparlo' : this.spawnFeed.error(),
  );
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
  /** Último instante en que se miró el feed de Pokémon (cada SPAWN_SYNC_MS). */
  private lastSpawnSync = 0;
  /** Posición del avatar en el último fotograma (para la distancia al tocar un Pokémon). */
  private avatarPos: LatLng | null = null;
  private readonly cries = new CryThrottle();
  private pointerDown: PointerMark | null = null;
  private tooFarTimer?: ReturnType<typeof setTimeout>;
  /** Abriendo un encuentro (un segundo toque mientras tanto no hace nada). */
  private opening = false;
  private readonly onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
  };
  private readonly onPointerUp = (e: PointerEvent): void => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (down && e.isPrimary && isTap(down, { x: e.clientX, y: e.clientY, t: e.timeStamp })) {
      this.tapAt(e.clientX, e.clientY);
    }
  };
  private destroyed = false;
  private rebuilding = false;
  /** Cuándo se rehízo el mapa últimamente (tope de reintentos: sin WebGL no se entra en bucle). */
  private rebuildTimes: number[] = [];
  /**
   * El mapa perdió su contexto WebGL y nadie lo ha devuelto (fallo de la GPU, D-038). Si fue un reinicio de la GPU,
   * Chrome suele bloquear WebGL a la página y el mapa nuevo cae a raster: el tope de reintentos lo explica en pantalla.
   */
  private glLost = false;
  private recoverTimer?: ReturnType<typeof setTimeout>;
  private readonly onContextLost = (): void => {
    console.warn('[mapa] contexto WebGL perdido');
    this.glLost = true;
    this.scheduleRecover();
  };
  private readonly onContextRestored = (): void => {
    console.warn('[mapa] contexto WebGL recuperado');
    this.glLost = false;
  };
  /** App a segundo plano (pantalla bloqueada, otra app): misma pausa de la capa 3D que al salir de la pantalla. */
  private readonly onVisibility = (): void => {
    if (!this.active) return;
    if (document.hidden) this.overlay?.setMap(null);
    else {
      this.attachOverlay();
      this.scheduleRecover();
    }
  };

  constructor() {
    afterNextRender(() => void this.init());
  }

  ionViewDidEnter(): void {
    if (this.active || this.destroyed) return;
    this.active = true;
    this.lastSpawnSync = 0;
    this.mapScene.spawns.enter();
    this.attachOverlay();
    this.scheduleRecover();
    void this.bag.load();
    this.compass.start();
    void this.startLocation();
    this.lastFrame = 0;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  ionViewWillLeave(): void {
    this.active = false;
    // La capa 3D va en animationMode 'always' (pide un fotograma tras otro): con el mapa oculto eso tumbaba la GPU
    // del Samsung A36 (reinicio del contexto → WebGL bloqueado → mapa raster al volver, D-038). Fuera de pantalla,
    // sin capa 3D.
    this.overlay?.setMap(null);
    clearTimeout(this.recoverTimer);
    cancelAnimationFrame(this.raf);
    void this.location.stop();
    this.compass.stop();
    this.joy = { dx: 0, dy: 0 };
    this.pointerDown = null;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ionViewWillLeave();
    clearInterval(this.nightTimer);
    clearTimeout(this.tooFarTimer);
    this.mapEl().nativeElement.removeEventListener('pointerdown', this.onPointerDown, true);
    this.mapEl().nativeElement.removeEventListener('pointerup', this.onPointerUp, true);
    this.mapEl().nativeElement.removeEventListener('webglcontextlost', this.onContextLost, true);
    this.mapEl().nativeElement.removeEventListener(
      'webglcontextrestored',
      this.onContextRestored,
      true,
    );
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
    // Los eventos llegan al canvas que crea Google dentro del div: se escuchan en fase de captura.
    this.mapEl().nativeElement.addEventListener('webglcontextlost', this.onContextLost, true);
    this.mapEl().nativeElement.addEventListener(
      'webglcontextrestored',
      this.onContextRestored,
      true,
    );
    document.addEventListener('visibilitychange', this.onVisibility);
    // Toques sobre los Pokémon: en captura, antes de que Google los use para arrastrar el mapa (no se cancelan).
    this.mapEl().nativeElement.addEventListener('pointerdown', this.onPointerDown, true);
    this.mapEl().nativeElement.addEventListener('pointerup', this.onPointerUp, true);
    clearInterval(this.nightTimer);
    this.nightTimer = setInterval(() => this.recoverIfLost(), NIGHT_CHECK_MS);
    // Por si Ionic disparó ionViewDidEnter antes de que el mapa existiera (primera carga).
    this.ionViewDidEnter();
  }

  protected retryMaps(): void {
    this.rebuildTimes = [];
    if (this.map) void this.rebuildMap('reintento');
    else void this.init();
  }

  /** Monta la capa 3D sobre el mapa (solo con la pantalla del mapa a la vista; ver ionViewWillLeave). */
  private attachOverlay(): void {
    if (this.map && this.overlay && !document.hidden && this.overlay.getMap() !== this.map) {
      this.overlay.setMap(this.map);
    }
  }

  /** Comprueba el mapa pasado un momento (si el WebView devolvió el contexto, no hay nada que rehacer). */
  private scheduleRecover(): void {
    clearTimeout(this.recoverTimer);
    this.recoverTimer = setTimeout(() => this.recoverIfLost(), GL_RECOVER_DELAY_MS);
  }

  /**
   * Rehace el mapa si hace falta: contexto WebGL perdido y no devuelto, mapa caído a raster (sin capa 3D ni avatar) o
   * cambio de día/noche. **Solo con la pantalla del mapa a la vista**: con la página oculta (0×0) Google no puede crear
   * el mapa vectorial. Nunca llamar a `getContext()` sobre el canvas de Google para comprobar nada: si aún no tiene
   * contexto, esa llamada se lo crea y Google cae a raster (D-038).
   */
  private recoverIfLost(): void {
    if (!this.active || document.hidden || !this.map) return;
    if (this.map.getRenderingType() === 'RASTER') void this.rebuildMap('el mapa cayó a raster');
    else if (this.glLost) void this.rebuildMap('contexto WebGL perdido');
    else if (isNightLocal(new Date()) !== this.night()) void this.rebuildMap('cambio de día/noche');
  }

  /**
   * Rehace mapa y overlay desde cero (div vacío, overlay nuevo: su renderer va atado al contexto WebGL del mapa).
   * Como mucho MAX_REBUILDS veces por minuto: si WebGL no vuelve, se avisa con "No se pudo cargar el mapa".
   */
  private async rebuildMap(reason: string): Promise<void> {
    if (this.rebuilding || this.destroyed || !this.active) return;
    const now = Date.now();
    this.rebuildTimes = this.rebuildTimes.filter((t) => now - t < REBUILD_WINDOW_MS);
    if (this.rebuildTimes.length >= MAX_REBUILDS) {
      console.error(`[mapa] demasiados intentos de rehacer el mapa (${reason})`);
      this.mapsError.set('El mapa 3D no está disponible ahora mismo en este móvil.');
      return;
    }
    this.rebuildTimes.push(now);
    this.rebuilding = true;
    this.mapsError.set(null);
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
    // Si Google cae a raster (sin WebGL), la capa 3D no se dibuja: se intenta rehacer (con la pantalla a la vista).
    const map = this.map;
    map.addListener('renderingtype_changed', () => {
      if (map === this.map && map.getRenderingType() === 'RASTER') this.scheduleRecover();
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
      this.mapScene.spawns.reposition(this.origin);
      f = { ...f, east: 0, north: 0 };
    }
    this.mapScene.setPlayer(f, now);
    this.avatarPos = fromLocalM(this.origin, f.east, f.north);
    if (now - this.lastSpawnSync >= SPAWN_SYNC_MS) {
      this.lastSpawnSync = now;
      this.syncSpawns(pos, this.avatarPos, now);
    }
    this.mapScene.spawns.update(now);
    this.map.moveCamera({ center: this.avatarPos, heading });
  }

  /**
   * Pide `/spawns` cuando toca (lo decide el feed) y deja en la escena los MAX_DRAWN más cercanos al avatar. Los que
   * brotan cerca suenan bajito (DISENO §5), como mucho uno cada pocos segundos.
   */
  private syncSpawns(gps: LatLng, avatar: LatLng, now: number): void {
    if (!this.origin) return;
    void this.spawnFeed.tick(gps);
    const sprouted = this.mapScene.spawns.sync(
      nearestN(this.spawnFeed.spawns(), avatar),
      this.origin,
      now,
    );
    for (const s of sprouted) {
      const gain = cryGain(distanceM(avatar, s));
      if (gain !== null && this.cries.take(now)) {
        void this.audio.playCry(s.speciesId, gain);
        break;
      }
    }
  }

  /** Toque sobre el mapa: si cae en un Pokémon, al encuentro (si está a mano) o "Acércate más". */
  private tapAt(clientX: number, clientY: number): void {
    if (!this.overlay || !this.avatarPos) return;
    const targets = this.mapScene.spawns.hitTargets();
    if (targets.length === 0) return;
    const ndc = toNdc(clientX, clientY, this.mapEl().nativeElement.getBoundingClientRect());
    const hit = this.overlay.raycast(new THREE.Vector2(ndc.x, ndc.y), targets)[0];
    const id = hit ? this.mapScene.spawns.idOf(hit.object) : null;
    const spawn = id ? this.mapScene.spawns.get(id) : null;
    if (!id || !spawn) return;
    if (distanceM(this.avatarPos, spawn) <= REACH_RADIUS_M) {
      this.haptics.tap();
      void this.openEncounter(id);
      return;
    }
    this.mapScene.spawns.hop(id, performance.now());
    this.tooFar.set(true);
    clearTimeout(this.tooFarTimer);
    this.tooFarTimer = setTimeout(() => this.tooFar.set(false), TOO_FAR_MS);
  }

  /**
   * Antes de abrir el encuentro se le dice al servidor dónde está el jugador AHORA: mide la distancia desde la última
   * posición de `GET /spawns` y el feed solo la renueva cada 60 m (si no, 403 "demasiado lejos" tras acercarse).
   * Si falla igual se abre: la pantalla del encuentro enseña el error del servidor.
   */
  private async openEncounter(id: string): Promise<void> {
    const pos = this.location.position();
    if (this.opening || !pos) return;
    this.opening = true;
    try {
      await this.spawnFeed.reportPosition({ lat: pos.lat, lng: pos.lng });
      await this.router.navigateByUrl(`/encuentro/${encodeURIComponent(id)}`);
    } finally {
      this.opening = false;
    }
  }

  /** Dónde poner la cámara al crear el mapa: el avatar si ya hay posición, si no el centro por defecto. */
  private cameraCenter(): LatLng {
    const p = this.location.position();
    return p ? { lat: p.lat, lng: p.lng } : DEFAULT_CENTER;
  }
}
