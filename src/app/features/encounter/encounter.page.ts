import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  InjectionToken,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { hashString } from '@shared/engine/rng';
import type { EncounterView } from '@shared/protocol/encounters';
import * as THREE from 'three';

import { loadFirstTexture } from '../../game/encounter-scene/art-texture';
import { cssColor } from '../../game/encounter-scene/css-color';
import { cameraYaw } from '../../game/encounter-scene/device-pose';
import { artUrls, pokemonHeightM, sizeClass } from '../../game/encounter-scene/encounter-layout';
import { EncounterScene, type PokemonPose } from '../../game/encounter-scene/encounter-scene';
import {
  EncounterStage,
  type EncounterStageLike,
} from '../../game/encounter-scene/encounter-stage';
import { personalityOf, type Personality } from '../../game/encounter-scene/personality';
import { loadPokemonModel, type PokemonModel } from '../../game/encounter-scene/pokemon-model';
import {
  TOUCHDOWN_MS,
  jumpSchedule,
  landingAt,
  motionAt,
} from '../../game/encounter-scene/pokemon-motion';
import { FX_KIND } from '../../game/encounter-scene/type-fx';
import { CameraService } from '../../services/ar/camera.service';
import { OrientationService } from '../../services/ar/orientation.service';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { EncounterApiService } from '../../services/game/encounter-api.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SettingsService } from '../../services/game/settings.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
import { EncounterHudComponent } from './encounter-hud.component';

/** Crea el escenario (renderer + bucle). Token para que los tests pongan un doble: jsdom no tiene WebGL. */
export const ENCOUNTER_STAGE = new InjectionToken<
  (canvas: HTMLCanvasElement, world: EncounterScene) => EncounterStageLike
>('ENCOUNTER_STAGE', {
  providedIn: 'root',
  factory: () => (canvas, world) => new EncounterStage(canvas, world),
});

/** Carga el modelo 3D del Pokémon (F2-12, D-048); null = sin modelo → arte plano. Token para los tests (sin red). */
export const POKEMON_MODEL = new InjectionToken<
  (speciesId: number, shiny: boolean) => Promise<PokemonModel | null>
>('POKEMON_MODEL', {
  providedIn: 'root',
  factory: () => (speciesId, shiny) => loadPokemonModel(speciesId, shiny),
});

/** Sin ninguna lectura de orientación en este tiempo → sin giroscopio: cámara quieta mirando al Pokémon. */
export const NO_GYRO_MS = 1500;

/** Radianes que gira el Pokémon por píxel arrastrado (media pantalla ≈ media vuelta). */
const SPIN_PER_PX = Math.PI / 200;

/** Texto de cada error de `GET /encounters/:id` (D-028). */
export function encounterErrorText(status: number | undefined): string {
  switch (status) {
    case 403:
      return 'Estás demasiado lejos.';
    case 410:
      return 'Se ha ido…';
    case 409:
      return 'Ya lo intentaste.';
    case 404:
      return 'Este Pokémon ya no está.';
    default:
      return 'No se pudo abrir el encuentro. Revisa tu conexión.';
  }
}

type Phase = 'loading' | 'error' | 'resolved' | 'ready';

/** Si la ficha no ha cargado: quieto, en el suelo, sin efectos raros. */
const CALM: Personality = { agility: 0, skittish: 0, hover: 0, ghostly: false, fx: 'normal' };

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Encuentro en AR (F2-04a, D-045): la cámara trasera principal de fondo y el Pokémon a su tamaño real anclado en el
 * suelo con el giroscopio, delante de donde se miraba al entrar. Sin cámara (permiso, AR apagada) o sin giroscopio:
 * fondo ilustrado / cámara quieta mirando al Pokémon. Cámara y sensores se sueltan al salir y en segundo plano.
 */
@Component({
  selector: 'app-encounter',
  imports: [IonContent, GameButtonComponent, GlassPanelComponent, EncounterHudComponent],
  template: `
    <ion-content [scrollY]="false" class="full">
      <div
        #stage
        class="stage"
        [class.stage--ill]="!streaming()"
        [style.--horizon]="horizon()"
        [style.--enc-color]="typeColor()"
        (pointerdown)="dragStart($event)"
        (pointermove)="dragMove($event)"
        (pointerup)="dragEnd()"
        (pointercancel)="dragEnd()"
      >
        <video #video muted playsinline [hidden]="!streaming()"></video>
        <canvas #canvas></canvas>
        <div #flash class="flash" aria-hidden="true"></div>
      </div>
      <div class="layer">
        @switch (phase()) {
          @case ('loading') {
            <p class="msg" role="status">Buscando al Pokémon…</p>
          }
          @case ('ready') {
            @if (view(); as v) {
              <app-encounter-hud
                [name]="name()"
                [level]="v.level"
                [shiny]="v.shiny"
                [size]="size()"
                [ar]="arOn()"
                (flee)="flee()"
                (toggleAr)="toggleAr()"
              />
            }
            @if (note(); as n) {
              <p class="note" role="status">{{ n }}</p>
            }
          }
          @default {
            <app-glass-panel size="lg" class="card">
              <p class="card__text" role="alert">{{ message() }}</p>
              <app-game-button variant="glass" label="Volver al mapa" (pressed)="back()" />
            </app-glass-panel>
          }
        }
      </div>
    </ion-content>
  `,
  styles: `
    .full {
      --padding-top: 0;
      --padding-bottom: 0;
      --padding-start: 0;
      --padding-end: 0;
    }
    .stage,
    video,
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .stage {
      background: var(--ink);
      touch-action: none;
    }
    .stage--ill {
      background:
        radial-gradient(
          120% 60% at 50% var(--horizon, 34%),
          color-mix(in srgb, var(--enc-color) 35%, transparent),
          transparent 70%
        ),
        linear-gradient(
          180deg,
          #bfe6ff 0%,
          #e9f6ff var(--horizon, 34%),
          #cfe9b8 var(--horizon, 34%),
          #9fd28a 100%
        );
    }
    video {
      object-fit: cover;
    }
    .flash {
      position: absolute;
      inset: 0;
      background: var(--paper);
      opacity: 0;
      pointer-events: none;
    }
    .layer {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--s-3);
      padding: calc(var(--ion-safe-area-top, 0px) + var(--s-3)) var(--s-4)
        calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      pointer-events: none;
    }
    .layer > * {
      pointer-events: auto;
    }
    .msg,
    .card {
      margin: auto;
    }
    .msg {
      font: 600 1.1rem/1.2 var(--font-display);
      color: var(--paper);
      text-shadow: 0 1px 3px rgb(0 0 0 / 0.5);
    }
    .note {
      align-self: center;
      margin: 0;
      padding: var(--s-1) var(--s-3);
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font-size: 0.8rem;
    }
    .card {
      width: min(100%, 360px);
      display: grid;
      gap: var(--s-4);
      text-align: center;
    }
    .card__text {
      margin: 0;
      font: 600 1.1rem/1.3 var(--font-display);
    }
  `,
})
export class EncounterPage implements OnDestroy {
  /** `:id` de la ruta (id del spawn, `celda:franja:índice`). */
  readonly id = input.required<string>();
  private readonly router = inject(Router);
  private readonly api = inject(EncounterApiService);
  private readonly dataset = inject(DatasetService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly settings = inject(SettingsService);
  private readonly camera = inject(CameraService);
  private readonly orientation = inject(OrientationService);
  private readonly createStage = inject(ENCOUNTER_STAGE);
  private readonly loadModel = inject(POKEMON_MODEL);
  private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly flashEl = viewChild.required<ElementRef<HTMLElement>>('flash');

  protected readonly phase = signal<Phase>('loading');
  protected readonly view = signal<EncounterView | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Hay imagen de la cámara (desde su primer fotograma: vacío, el WebView pinta un póster gris, D-045). */
  protected readonly streaming = signal(false);
  protected readonly noGyro = signal(false);
  /** Altura del horizonte del fondo ilustrado (la de la escena sin AR). */
  protected readonly horizon = signal('34%');
  protected readonly arOn = computed(() => this.settings.settings().arEnabled);
  /** "Reducir efectos" (ajustes) o "reducir movimiento" (sistema): sin partículas ni destellos (D-033). */
  private readonly reduce = computed(
    () => this.settings.settings().reduceEffects || prefersReducedMotion(),
  );
  private readonly species = computed(() => {
    const v = this.view();
    return v ? (this.dataset.species().get(v.speciesId) ?? null) : null;
  });
  protected readonly name = computed(
    () => this.species()?.names.es ?? `#${this.view()?.speciesId ?? ''}`,
  );
  protected readonly size = computed(() => {
    const v = this.view();
    return v ? sizeClass(v.heightScale) : null;
  });
  protected readonly typeColor = computed(() => `var(--t-${this.species()?.types[0] ?? 'normal'})`);
  protected readonly message = computed(() => {
    if (this.phase() !== 'resolved') return this.error() ?? '';
    return this.view()?.status === 'caught' ? 'Ya lo atrapaste.' : 'Ya se te escapó.';
  });
  protected readonly note = computed(() => {
    const cam = this.camera.state();
    if (this.arOn() && cam === 'denied') return 'Sin permiso de cámara: modo sin AR.';
    if (this.arOn() && cam === 'unavailable') return 'Sin cámara: modo sin AR.';
    if (this.noGyro()) return 'Sin giroscopio: el Pokémon se queda delante.';
    return null;
  });

  private world: EncounterScene | null = null;
  private stage: EncounterStageLike | null = null;
  private readonly q = new THREE.Quaternion();
  private active = false;
  private enteredAt = 0;
  /** Si el último fotograma fue en AR (al cambiar, el Pokémon se vuelve a poner delante). */
  private arMode = false;
  private loadSeq = 0;
  private resizeObs?: ResizeObserver;
  private personality: Personality = CALM;
  private jumps: number[] = [];
  /** Cuándo empezó el encuentro (ms): aterrizaje y saltos cuentan desde aquí; NO se reinicia al volver. */
  private startedAt = 0;
  private touchedDown = false;

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  ionViewDidEnter(): void {
    this.resume();
  }

  ionViewWillLeave(): void {
    this.pause();
  }

  ngOnDestroy(): void {
    this.pause();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObs?.disconnect();
    this.teardown();
  }

  protected back(): void {
    void this.router.navigateByUrl('/mapa');
  }

  protected flee(): void {
    this.haptics.tap();
    this.back();
  }

  protected toggleAr(): void {
    this.haptics.tap();
    const on = !this.arOn();
    this.settings.update({ arEnabled: on });
    if (on && this.active) void this.openCamera();
    else this.closeCamera();
  }

  /** X del dedo mientras arrastra para girar al Pokémon (F2-12); null = sin arrastrar. */
  private dragX: number | null = null;

  protected dragStart(e: PointerEvent): void {
    this.dragX = e.clientX;
  }

  protected dragMove(e: PointerEvent): void {
    if (this.dragX === null) return;
    this.world?.spin((e.clientX - this.dragX) * SPIN_PER_PX);
    this.dragX = e.clientX;
  }

  protected dragEnd(): void {
    this.dragX = null;
  }

  private async load(): Promise<void> {
    const seq = ++this.loadSeq;
    this.teardown();
    this.phase.set('loading');
    this.view.set(null);
    this.error.set(null);
    try {
      const [v] = await Promise.all([
        this.api.view(this.id()),
        this.dataset.load().catch(() => undefined),
      ]);
      if (seq !== this.loadSeq) return;
      this.view.set(v);
      if (v.status !== 'open') {
        this.phase.set('resolved');
        return;
      }
      const sp = this.dataset.species().get(v.speciesId);
      const world = new EncounterScene(pokemonHeightM(sp?.height ?? 10, v.heightScale));
      this.world = world;
      // Personalidad de su ficha (F2-04b): saltos con semilla = id del encuentro (siempre los mismos).
      this.personality = sp ? personalityOf(sp) : CALM;
      this.jumps = jumpSchedule(hashString(v.id), this.personality.agility);
      if (this.personality.ghostly) world.setOpacity(0.7);
      const type = sp?.types[0] ?? 'normal';
      world.setFx(this.reduce() ? null : FX_KIND[type], cssColor([`--t-${type}`, '#ffffff']));
      this.startedAt = performance.now();
      this.touchedDown = false;
      this.stage = this.createStage(this.canvasEl().nativeElement, world);
      this.stage.onFrame = (now) => this.frame(now);
      this.watchSize();
      this.phase.set('ready');
      this.flashIn();
      void loadFirstTexture(artUrls(v.speciesId, v.shiny)).then((tex) => {
        if (tex && this.world === world) world.setTexture(tex);
        else tex?.dispose();
      });
      // El modelo 3D (D-048) sustituye al plano en cuanto llega; si no hay, se queda el plano (sin esperar).
      void this.loadModel(v.speciesId, v.shiny).then((model) => {
        if (!model || this.world !== world) return;
        world.setModel(model);
        if (this.personality.ghostly) world.setOpacity(0.7);
      });
      this.resume();
    } catch (err) {
      if (seq !== this.loadSeq) return;
      const status = err instanceof HttpErrorResponse ? err.status : undefined;
      console.warn('[encuentro] no se pudo abrir', { id: this.id(), status });
      this.error.set(encounterErrorText(status));
      this.phase.set('error');
    }
  }

  /** Al entrar o volver de segundo plano: sensores, cámara (si la AR está activada) y bucle. Idempotente. */
  private resume(): void {
    if (!this.stage || this.active || document.hidden) return;
    this.active = true;
    this.enteredAt = performance.now();
    this.noGyro.set(false);
    this.orientation.start();
    if (this.arOn()) void this.openCamera();
    this.stage.start();
  }

  /** Al salir o pasar a segundo plano: soltar cámara y sensores (D-045). */
  private pause(): void {
    if (!this.active) return;
    this.active = false;
    this.stage?.stop();
    this.closeCamera();
    this.orientation.stop();
  }

  private readonly onVisibility = () => (document.hidden ? this.pause() : this.resume());

  /** Un fotograma (lo llama el escenario antes de dibujar). */
  private frame(now: number): void {
    const world = this.world;
    if (!world) return;
    const has = this.orientation.pose(now, this.q);
    if (!has && !this.noGyro() && now - this.enteredAt > NO_GYRO_MS) this.noGyro.set(true);
    const ar = this.streaming() && has;
    if (!world.isPlaced || ar !== this.arMode) {
      // Al entrar (y al pasar de AR a sin AR o al revés) el Pokémon se pone delante de donde se mira.
      world.placeAt(ar ? cameraYaw(this.q) : 0);
      this.arMode = ar;
      if (!ar) {
        world.aimAtPokemon(this.personality.hover);
        this.horizon.set(`${Math.round(world.horizonY() * 100)}%`);
      }
    }
    const t = now - this.startedAt;
    if (!this.touchedDown && t >= TOUCHDOWN_MS) this.touchdown(t);
    const pose = this.poseAt(t, world.heightM);
    if (ar) {
      world.update(this.q, pose);
    } else {
      world.aimAtPokemon(this.personality.hover);
      world.update(null, pose);
    }
    world.animate(t / 1000);
  }

  /** Postura en `t` ms del encuentro: cae al entrar y después se mueve según su ficha (F2-04b). */
  private poseAt(t: number, heightM: number): PokemonPose {
    const land = landingAt(t);
    if (land) return { lift: this.personality.hover + land.lift, squash: land.squash, lean: 0 };
    return motionAt(t, this.personality, this.jumps, heightM);
  }

  /** Toca el suelo (DISENO §5): polvo (o destello dorado si es shiny), su grito completo y vibración, a la vez. */
  private touchdown(t: number): void {
    this.touchedDown = true;
    const v = this.view();
    if (!v || !this.world) return;
    if (!this.reduce()) {
      this.world.startBurst(
        t / 1000,
        v.shiny ? cssColor(['--gold', '#ffcb3d']) : cssColor(['--paper-2', '#efe8d8']),
        v.shiny,
      );
    }
    void this.audio.playSfx(v.shiny ? 'shiny' : 'land');
    void this.audio.playCry(v.speciesId);
    this.haptics.tap();
  }

  /** Entra desde el mapa con un destello blanco que se va (continuidad con el zoom del mapa, DISENO §4.8). */
  private flashIn(): void {
    const el = this.flashEl().nativeElement;
    if (this.reduce() || typeof el.animate !== 'function') return;
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 350,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  }

  private async openCamera(): Promise<void> {
    const stream = await this.camera.open();
    if (!stream) return;
    if (!this.active || !this.arOn()) {
      this.camera.close();
      return;
    }
    const video = this.videoEl().nativeElement;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (err) {
      console.warn('[encuentro] el vídeo no arranca', err);
    }
    await firstFrame(video);
    if (this.active && this.camera.state() === 'on') this.streaming.set(true);
  }

  private closeCamera(): void {
    this.camera.close();
    this.streaming.set(false);
    this.videoEl().nativeElement.srcObject = null;
  }

  private watchSize(): void {
    const el = this.stageEl().nativeElement;
    const apply = () => this.stage?.resize(el.clientWidth, el.clientHeight);
    this.resizeObs?.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(apply);
      this.resizeObs.observe(el);
    }
    apply();
  }

  private teardown(): void {
    this.stage?.dispose();
    this.world?.dispose();
    this.stage = null;
    this.world = null;
    this.arMode = false;
  }
}

/** Espera al primer fotograma del vídeo (como mucho 3 s: si no llega, se enseña igual). */
function firstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 3000);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    if (typeof video.requestVideoFrameCallback === 'function')
      video.requestVideoFrameCallback(done);
    else video.addEventListener('playing', done, { once: true });
  });
}
