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
import { IonContent } from '@ionic/angular';
import * as THREE from 'three';
import {
  cameraYaw,
  deviceEventQuaternion,
  sensorQuaternion,
} from '../../game/encounter-scene/device-pose';
import { PoseDelay } from '../../game/encounter-scene/pose-delay';
import { DatasetService } from '../../services/game/dataset.service';
import { FpsMeter, type FpsSummary } from '../dev-map/fps-meter';
import { ArSpikeScene, MAX_PARTICLES, fitDistance, homeArtUrl } from './ar-spike-scene';

/** Fuentes de orientación que se comparan: los dos eventos clásicos y la Generic Sensor API. */
type Source = 'event' | 'absolute' | 'sensor';
type Res = 720 | 1080;
type Dpr = 'x2' | 'native';

interface BenchCfg {
  label: string;
  camera: boolean;
  res: Res;
  scene: boolean;
  particles: boolean;
  dpr: Dpr;
}
interface BenchResult extends FpsSummary {
  label: string;
  videoFps: number;
  sensorHz: number;
}
interface DriftResult {
  source: Source;
  hz: number;
  driftDeg: number;
  noiseDeg: number;
}

/** Lo mínimo de la Generic Sensor API (no está en lib.dom de TypeScript). */
interface OrientationSensorLike extends EventTarget {
  quaternion?: number[];
  start(): void;
  stop(): void;
}
type OrientationSensorCtor = new (opts: {
  frequency: number;
  referenceFrame: 'device' | 'screen';
}) => OrientationSensorLike;

const SOURCES: Source[] = ['event', 'absolute', 'sensor'];
const SOURCE_LABEL: Record<Source, string> = {
  event: 'deviceorientation',
  absolute: 'absoluta (brújula)',
  sensor: 'RelativeOrientationSensor',
};
/** Pokémon de prueba: de pequeño a enorme (la altura sale del dataset). */
const DEX_IDS = [25, 6, 143, 130];
const WARMUP_MS = 2_000;
const MEASURE_MS = 10_000;
const DRIFT_MS = 20_000;
const BATTERY: BenchCfg[] = [
  { label: 'Solo cámara 720p', camera: true, res: 720, scene: false, particles: false, dpr: 'x2' },
  { label: 'Cámara + Pokémon', camera: true, res: 720, scene: true, particles: false, dpr: 'x2' },
  { label: '+ 400 partículas', camera: true, res: 720, scene: true, particles: true, dpr: 'x2' },
  {
    label: '+ resolución nativa',
    camera: true,
    res: 720,
    scene: true,
    particles: true,
    dpr: 'native',
  },
  {
    label: 'Cámara 1080p + todo',
    camera: true,
    res: 1080,
    scene: true,
    particles: true,
    dpr: 'x2',
  },
  { label: 'Sin cámara + todo', camera: false, res: 720, scene: true, particles: true, dpr: 'x2' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r1 = (n: number) => Math.round(n * 10) / 10;
const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/**
 * SPIKE F2-01 (solo desarrollo, /dev/ar): cámara trasera por `getUserMedia` de fondo y la escena three.js del
 * encuentro encima, anclada al mundo con el giroscopio. Compara las tres fuentes de orientación, mide fps y la
 * deriva, y deja los resultados en pantalla y en la consola con el prefijo `[F2-01]` (en el móvil: CDP).
 * No es la escena del juego: eso es F2-04.
 */
@Component({
  selector: 'app-dev-ar',
  imports: [IonContent],
  template: `
    <ion-content [scrollY]="false" class="full">
      <div class="stage" [class.ill]="!cameraOn()">
        <video #video muted playsinline [hidden]="!cameraOn()"></video>
        <canvas #canvas></canvas>
      </div>

      <div class="hud top">
        <div class="fps" [class.bad]="fps() < 50">{{ fps() }} <small>fps</small></div>
        <div class="box">
          Cámara: {{ camInfo() }}<br />
          Vídeo {{ videoFps() }} fps · {{ hz() }}<br />
          WebXR AR: {{ xr() }}
        </div>
        @if (status()) {
          <div class="box">{{ status() }}</div>
        }
      </div>

      <div class="hud bottom">
        <button class="mini" (click)="panel.set(!panel())">
          {{ panel() ? 'Ocultar' : 'Controles' }}
        </button>
        @if (panel()) {
          <div class="row">
            @for (s of sources; track s) {
              <button [class.on]="source() === s" [disabled]="busy()" (click)="setSource(s)">
                {{ sourceLabel[s] }}
              </button>
            }
          </div>
          <div class="row">
            <button [class.on]="cameraOn()" [disabled]="busy()" (click)="toggleCamera()">
              Cámara
            </button>
            <button [disabled]="busy() || backCams().length < 2" (click)="cycleCam()">
              {{ camLabel() }}
            </button>
            <button [class.on]="fixed30()" [disabled]="busy()" (click)="toggleFixed30()">
              30 fps fijos
            </button>
            <button [class.on]="res() === 1080" [disabled]="busy()" (click)="toggleRes()">
              {{ res() }}p
            </button>
          </div>
          <div class="row">
            <button [class.on]="sceneOn()" [disabled]="busy()" (click)="sceneOn.set(!sceneOn())">
              Pokémon
            </button>
            <button [class.on]="particlesOn()" [disabled]="busy()" (click)="toggleParticles()">
              Partículas
            </button>
            <button [class.on]="dpr() === 'native'" [disabled]="busy()" (click)="toggleDpr()">
              {{ dpr() === 'native' ? 'dpr nativo' : 'dpr ≤ 2' }}
            </button>
          </div>
          <div class="row">
            @for (id of dexIds; track id) {
              <button [class.on]="dexId() === id" [disabled]="busy()" (click)="setPokemon(id)">
                #{{ id }}
              </button>
            }
            <button (click)="recenter()">Recolocar</button>
          </div>
          <label
            >Campo de visión {{ fov() }}°
            <input type="range" min="40" max="90" [value]="fov()" (input)="setFov($event)" />
          </label>
          <label
            >Retraso de la orientación {{ delayMs() }} ms
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              [value]="delayMs()"
              (input)="setDelay($event)"
            />
          </label>
          <div class="row">
            <button class="primary" [disabled]="busy()" (click)="runBattery()">
              Medir batería (~2 min)
            </button>
            <button [disabled]="busy()" (click)="runDrift()">Deriva 20 s</button>
          </div>
        }
        @if (results().length) {
          <table>
            <tr>
              <th>Config</th>
              <th>fps</th>
              <th>p95</th>
              <th>tirones</th>
              <th>vídeo</th>
            </tr>
            @for (r of results(); track $index) {
              <tr [class.bad]="r.avgFps < 50">
                <td>{{ r.label }}</td>
                <td>{{ r.avgFps }}</td>
                <td>{{ r.p95Ms }}</td>
                <td>{{ r.jankPct }} %</td>
                <td>{{ r.videoFps }}</td>
              </tr>
            }
          </table>
        }
        @if (drift().length) {
          <table>
            <tr>
              <th>Fuente</th>
              <th>Hz</th>
              <th>deriva °</th>
              <th>ruido °</th>
            </tr>
            @for (d of drift(); track d.source) {
              <tr>
                <td>{{ sourceLabel[d.source] }}</td>
                <td>{{ d.hz }}</td>
                <td>{{ d.driftDeg }}</td>
                <td>{{ d.noiseDeg }}</td>
              </tr>
            }
          </table>
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
      background: #000;
    }
    .stage.ill {
      background: linear-gradient(#7ec8f0 0 55%, #8fce6a 55% 100%);
    }
    video {
      object-fit: cover;
    }
    .hud {
      position: absolute;
      left: 12px;
      right: 12px;
      color: #fff;
      font:
        600 12px/1.35 system-ui,
        sans-serif;
      display: grid;
      gap: 6px;
      justify-items: start;
    }
    .top {
      top: calc(var(--ion-safe-area-top, 0px) + 8px);
    }
    .bottom {
      bottom: calc(var(--ion-safe-area-bottom, 0px) + 8px);
      justify-items: stretch;
    }
    .fps {
      padding: 2px 10px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.6);
      font-size: 26px;
      font-variant-numeric: tabular-nums;
    }
    .box,
    label,
    table {
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.6);
    }
    .bad,
    .bad td {
      color: #ff8a80;
    }
    .row {
      display: flex;
      gap: 4px;
    }
    button {
      flex: 1;
      min-height: 38px;
      border: 0;
      border-radius: 8px;
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
    button.mini {
      justify-self: end;
      flex: none;
      padding: 0 12px;
    }
    button:disabled {
      opacity: 0.5;
    }
    input {
      width: 100%;
    }
    table {
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
    }
    td,
    th {
      padding: 2px 4px;
      text-align: right;
    }
    td:first-child,
    th:first-child {
      text-align: left;
    }
  `,
})
export class DevArPage implements OnDestroy {
  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly dataset = inject(DatasetService);

  protected readonly sources = SOURCES;
  protected readonly sourceLabel = SOURCE_LABEL;
  protected readonly dexIds = DEX_IDS;

  protected readonly fps = signal(0);
  protected readonly camInfo = signal('apagada');
  protected readonly videoFps = signal(0);
  protected readonly hz = signal('');
  protected readonly xr = signal('…');
  protected readonly status = signal('');
  protected readonly panel = signal(true);
  protected readonly busy = signal(false);
  protected readonly source = signal<Source>('event');
  protected readonly cameraOn = signal(true);
  protected readonly res = signal<Res>(720);
  protected readonly sceneOn = signal(true);
  protected readonly particlesOn = signal(false);
  protected readonly dpr = signal<Dpr>('x2');
  protected readonly dexId = signal(DEX_IDS[0]);
  /** Vertical en pantalla: el lado largo de un objetivo de 26 mm equivalentes (4:3) es ~67°. Se afina con el deslizador. */
  protected readonly fov = signal(67);
  /** Cámaras traseras por número de Camera2 (la 0 es la principal; `facingMode` abre el gran angular en el A36). */
  protected readonly backCams = signal<{ n: number; id: string }[]>([]);
  protected readonly camId = signal<string | null>(null);
  protected readonly fixed30 = signal(false);
  protected readonly camLabel = computed(() => {
    const cam = this.backCams().find((c) => c.id === this.camId());
    return cam ? `Cám. ${cam.n}` : 'Cám. ?';
  });
  protected readonly delayMs = signal(0);
  protected readonly results = signal<BenchResult[]>([]);
  protected readonly drift = signal<DriftResult[]>([]);

  private scene?: ArSpikeScene;
  private stream: MediaStream | null = null;
  private sensor: OrientationSensorLike | null = null;
  private readonly meter = new FpsMeter();
  private readonly buffers: Record<Source, PoseDelay> = {
    event: new PoseDelay(),
    absolute: new PoseDelay(),
    sensor: new PoseDelay(),
  };
  private readonly counts: Record<Source, number> = { event: 0, absolute: 0, sensor: 0 };
  private readonly rates: Record<Source, number> = { event: 0, absolute: 0, sensor: 0 };
  /** Rumbos registrados durante la prueba de deriva: [t, grados]. */
  private driftLog: Record<Source, [number, number][]> | null = null;
  private readonly pose = new THREE.Quaternion();
  private readonly tmp = new THREE.Quaternion();
  private heightM = 0.4;
  private placed = false;
  private videoFrames = 0;
  private lastVideoFrames = 0;
  /** Cada petición de cámara lleva su número: si llega otra antes de que responda, la vieja se suelta. */
  private camGen = 0;
  private raf = 0;
  private hzTimer = 0;
  private active = false;
  private destroyed = false;
  private resizeObs?: ResizeObserver;

  constructor() {
    afterNextRender(() => void this.init());
  }

  ionViewDidEnter(): void {
    this.resume();
  }

  ionViewWillLeave(): void {
    this.pause();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.pause();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObs?.disconnect();
    this.scene?.dispose();
  }

  protected setSource(s: Source): void {
    this.source.set(s);
    this.recenter();
  }

  protected toggleCamera(): void {
    this.cameraOn.set(!this.cameraOn());
    if (this.cameraOn()) void this.startCamera();
    else this.stopCamera();
  }

  protected cycleCam(): void {
    const cams = this.backCams();
    const i = cams.findIndex((c) => c.id === this.camId());
    this.camId.set(cams[(i + 1) % cams.length].id);
    if (this.cameraOn()) void this.startCamera();
  }

  protected toggleFixed30(): void {
    this.fixed30.set(!this.fixed30());
    if (this.cameraOn()) void this.startCamera();
  }

  protected toggleRes(): void {
    this.res.set(this.res() === 720 ? 1080 : 720);
    if (this.cameraOn()) void this.startCamera();
  }

  protected toggleParticles(): void {
    this.particlesOn.set(!this.particlesOn());
    this.applyParticles();
  }

  protected toggleDpr(): void {
    this.dpr.set(this.dpr() === 'x2' ? 'native' : 'x2');
    this.applyDpr();
  }

  protected setFov(e: Event): void {
    this.fov.set(+(e.target as HTMLInputElement).value);
    this.scene?.setFov(this.fov());
  }

  protected setDelay(e: Event): void {
    this.delayMs.set(+(e.target as HTMLInputElement).value);
  }

  protected async setPokemon(id: number): Promise<void> {
    this.dexId.set(id);
    const sp = this.dataset.species().get(id);
    this.heightM = sp ? sp.height / 10 : 1;
    await this.scene?.setPokemon(homeArtUrl(id), this.heightM);
    this.applyParticles();
    this.recenter();
  }

  /** Pone al Pokémon delante de hacia donde mira ahora el móvil. */
  protected recenter(): void {
    if (!this.scene || !this.buffers[this.source()].sample(performance.now(), this.tmp)) {
      this.placed = false;
      return;
    }
    this.scene.placeAt(cameraYaw(this.tmp), fitDistance(this.heightM));
    this.placed = true;
  }

  /** Cada configuración: 2 s de calentamiento y 10 s midiendo. El móvil apoyado de pie, sin tocarlo. */
  protected async runBattery(): Promise<void> {
    this.busy.set(true);
    this.results.set([]);
    const prev = {
      camera: this.cameraOn(),
      res: this.res(),
      scene: this.sceneOn(),
      particles: this.particlesOn(),
      dpr: this.dpr(),
    };
    try {
      for (const [i, cfg] of BATTERY.entries()) {
        if (this.destroyed) return;
        this.status.set(`Midiendo ${i + 1}/${BATTERY.length}: ${cfg.label}`);
        await this.applyConfig(cfg);
        await sleep(WARMUP_MS);
        this.meter.reset();
        const frames0 = this.videoFrames;
        const counts0 = { ...this.counts };
        const t0 = performance.now();
        await sleep(MEASURE_MS);
        const secs = (performance.now() - t0) / 1000;
        const src = this.source();
        const result: BenchResult = {
          label: cfg.label,
          ...this.meter.summary(),
          videoFps: cfg.camera ? r1((this.videoFrames - frames0) / secs) : 0,
          sensorHz: r1((this.counts[src] - counts0[src]) / secs),
        };
        this.results.update((r) => [...r, result]);
        console.log('[F2-01] resultado', JSON.stringify({ ...result, dpr: this.ratio(cfg.dpr) }));
      }
      console.log(
        '[F2-01] batería',
        JSON.stringify({ device: this.deviceInfo(), results: this.results() }),
      );
      this.status.set('Batería terminada (resultados abajo y en la consola [F2-01]).');
    } finally {
      await this.applyConfig({ label: '', ...prev });
      this.busy.set(false);
    }
  }

  /** Móvil quieto (en la mesa o apoyado): cuánto se mueve el rumbo de cada fuente sin moverse el móvil. */
  protected async runDrift(): Promise<void> {
    this.busy.set(true);
    this.drift.set([]);
    this.status.set('Deja el móvil QUIETO 20 s…');
    const counts0 = { ...this.counts };
    this.driftLog = { event: [], absolute: [], sensor: [] };
    await sleep(DRIFT_MS);
    const log = this.driftLog;
    this.driftLog = null;
    const out: DriftResult[] = SOURCES.map((s) => {
      const ys = log[s].map(([, y]) => y);
      if (ys.length < 2) return { source: s, hz: 0, driftDeg: NaN, noiseDeg: NaN };
      // Rumbos "desenrollados" respecto al primero para que pasar por ±180° no cuente como un salto.
      const rel = ys.map((y) => wrapDeg(y - ys[0]));
      const mean = rel.reduce((a, b) => a + b, 0) / rel.length;
      const sd = Math.sqrt(rel.reduce((a, b) => a + (b - mean) ** 2, 0) / rel.length);
      return {
        source: s,
        hz: r1((this.counts[s] - counts0[s]) / (DRIFT_MS / 1000)),
        driftDeg: r1(rel[rel.length - 1]),
        noiseDeg: r1(sd),
      };
    });
    this.drift.set(out);
    console.log('[F2-01] deriva', JSON.stringify(out));
    this.status.set('Deriva medida (abajo y en la consola [F2-01]).');
    this.busy.set(false);
  }

  private async init(): Promise<void> {
    this.scene = new ArSpikeScene(this.canvasEl().nativeElement);
    this.scene.setFov(this.fov());
    this.applyDpr();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvasEl().nativeElement);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
    void this.checkXr();
    try {
      await this.dataset.load();
    } catch {
      this.status.set('Sin dataset: alturas por defecto.');
    }
    await this.setPokemon(this.dexId());
    // Por si Ionic disparó ionViewDidEnter antes de que existiera la escena (primera carga).
    this.resume();
  }

  /** Arranca cámara, sensores y bucle (al entrar y al volver de segundo plano). Idempotente. */
  private resume(): void {
    if (!this.scene || this.active || this.destroyed || document.hidden) return;
    this.active = true;
    this.startSensors();
    if (this.cameraOn()) void this.startCamera();
    this.raf = requestAnimationFrame((t) => this.tick(t));
    this.hzTimer = window.setInterval(() => this.updateHz(), 1000);
  }

  /** Suelta la cámara y los sensores (al salir de la página o pasar a segundo plano). */
  private pause(): void {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    clearInterval(this.hzTimer);
    this.stopCamera();
    this.stopSensors();
  }

  private readonly onVisibility = () => (document.hidden ? this.pause() : this.resume());

  private tick(now: number): void {
    if (!this.active) return;
    this.meter.frame(now);
    if (this.sceneOn()) {
      const has = this.buffers[this.source()].sample(now - this.delayMs(), this.pose);
      if (has && !this.placed) this.recenter();
      this.scene?.render(now, has ? this.pose : null);
    } else {
      this.scene?.clear();
    }
    if (Math.floor(now / 250) !== Math.floor((now - 16) / 250))
      this.fps.set(this.meter.recentFps());
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private async startCamera(): Promise<void> {
    this.stopCamera();
    const gen = ++this.camGen;
    const res = this.res();
    const t0 = performance.now();
    this.camInfo.set('pidiendo…');
    const camId = this.camId();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // Sin cámara elegida (antes del permiso no hay etiquetas): la que dé `facingMode`, y luego la principal.
          ...(camId ? { deviceId: { exact: camId } } : { facingMode: { ideal: 'environment' } }),
          width: { ideal: res === 1080 ? 1920 : 1280 },
          height: { ideal: res },
          frameRate: this.fixed30() ? { min: 30, ideal: 30 } : { ideal: 30 },
        },
      });
      if (gen !== this.camGen || !this.active || !this.cameraOn()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (!camId) {
        const main = await this.listBackCams();
        const opened = stream.getVideoTracks()[0].getSettings().deviceId;
        this.camId.set(main?.id ?? opened ?? null);
        if (main && main.id !== opened) {
          console.log(
            '[F2-01] facingMode abrió',
            stream.getVideoTracks()[0].label,
            '→ cambio a la principal',
          );
          stream.getTracks().forEach((t) => t.stop());
          return this.startCamera();
        }
      }
      this.stream = stream;
      const video = this.videoEl().nativeElement;
      video.srcObject = stream;
      await video.play();
      const ttff = await firstFrame(video, t0);
      const track = stream.getVideoTracks()[0];
      const s = track.getSettings();
      this.camInfo.set(
        `${this.camLabel()} · ${s.width}×${s.height} @ ${s.frameRate} · 1.er fotograma ${Math.round(ttff)} ms`,
      );
      this.countVideoFrames(video, stream);
      console.log(
        '[F2-01] cámara',
        JSON.stringify({
          label: track.label,
          settings: s,
          capabilities: track.getCapabilities?.(),
          firstFrameMs: Math.round(ttff),
        }),
      );
    } catch (err) {
      const name = err instanceof DOMException ? err.name : 'Error';
      this.camInfo.set(`${name}: ${err instanceof Error ? err.message : err}`);
      console.warn('[F2-01] cámara', name, err);
    }
  }

  /** Cámaras traseras ordenadas por su número ("camera 0, facing back"); devuelve la principal (la de número menor). */
  private async listBackCams(): Promise<{ n: number; id: string } | undefined> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices
      .filter((d) => d.kind === 'videoinput' && /back/i.test(d.label))
      .map((d) => ({ n: Number(/(\d+)/.exec(d.label)?.[1] ?? 99), id: d.deviceId }))
      .sort((a, b) => a.n - b.n);
    this.backCams.set(cams);
    return cams[0];
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const video = this.videoEl().nativeElement;
    video.srcObject = null;
    this.videoFps.set(0);
    if (!this.cameraOn()) this.camInfo.set('apagada');
  }

  /** Cuenta los fotogramas de vídeo que se presentan de verdad (no los que se piden). */
  private countVideoFrames(video: HTMLVideoElement, stream: MediaStream): void {
    if (!('requestVideoFrameCallback' in video)) return;
    const onFrame = () => {
      if (this.stream !== stream) return;
      this.videoFrames++;
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }

  private startSensors(): void {
    window.addEventListener('deviceorientation', this.onEvent);
    window.addEventListener('deviceorientationabsolute', this.onAbsolute);
    const Ctor = (window as unknown as { RelativeOrientationSensor?: OrientationSensorCtor })
      .RelativeOrientationSensor;
    if (!Ctor) return;
    try {
      const sensor = new Ctor({ frequency: 60, referenceFrame: 'device' });
      sensor.addEventListener('reading', () => {
        if (sensor.quaternion)
          this.push('sensor', sensorQuaternion(sensor.quaternion, screenAngle(), this.tmp));
      });
      sensor.addEventListener('error', (e) =>
        console.warn('[F2-01] RelativeOrientationSensor', (e as Event & { error?: Error }).error),
      );
      sensor.start();
      this.sensor = sensor;
    } catch (err) {
      console.warn('[F2-01] RelativeOrientationSensor', err);
    }
  }

  private stopSensors(): void {
    window.removeEventListener('deviceorientation', this.onEvent);
    window.removeEventListener('deviceorientationabsolute', this.onAbsolute);
    this.sensor?.stop();
    this.sensor = null;
  }

  private readonly onEvent = (e: DeviceOrientationEvent) => this.onOrientation('event', e);
  private readonly onAbsolute = (e: DeviceOrientationEvent) => this.onOrientation('absolute', e);

  private onOrientation(source: Source, e: DeviceOrientationEvent): void {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    this.push(source, deviceEventQuaternion(e.alpha, e.beta, e.gamma, screenAngle(), this.tmp));
  }

  private push(source: Source, q: THREE.Quaternion): void {
    const now = performance.now();
    this.buffers[source].push(now, q);
    this.counts[source]++;
    this.driftLog?.[source].push([now, THREE.MathUtils.radToDeg(cameraYaw(q))]);
  }

  private updateHz(): void {
    const parts = SOURCES.map((s) => {
      const hz = this.counts[s] - this.rates[s];
      this.rates[s] = this.counts[s];
      return `${s} ${hz} Hz`;
    });
    this.hz.set(parts.join(' · '));
    this.videoFps.set(this.videoFrames - this.lastVideoFrames);
    this.lastVideoFrames = this.videoFrames;
  }

  private async applyConfig(cfg: BenchCfg): Promise<void> {
    this.sceneOn.set(cfg.scene);
    this.particlesOn.set(cfg.particles);
    this.applyParticles();
    this.dpr.set(cfg.dpr);
    this.applyDpr();
    const camChanged = cfg.camera !== this.cameraOn() || (cfg.camera && cfg.res !== this.res());
    this.cameraOn.set(cfg.camera);
    this.res.set(cfg.res);
    if (camChanged) {
      if (cfg.camera) await this.startCamera();
      else this.stopCamera();
    }
    this.recenter();
  }

  private applyParticles(): void {
    const type = this.dataset.species().get(this.dexId())?.types[0] ?? 'normal';
    const color = getComputedStyle(document.documentElement).getPropertyValue(`--t-${type}`).trim();
    this.scene?.setParticles(this.particlesOn() ? MAX_PARTICLES : 0, color || '#ffcb3d');
  }

  private ratio(dpr: Dpr): number {
    return dpr === 'native' ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 2);
  }

  private applyDpr(): void {
    this.scene?.setPixelRatio(this.ratio(this.dpr()));
    this.resize();
  }

  private resize(): void {
    const c = this.canvasEl().nativeElement;
    if (c.clientWidth && c.clientHeight) this.scene?.resize(c.clientWidth, c.clientHeight);
  }

  private async checkXr(): Promise<void> {
    const xr = (
      navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }
    ).xr;
    if (!xr) return this.xr.set('no existe navigator.xr');
    try {
      this.xr.set((await xr.isSessionSupported('immersive-ar')) ? 'SÍ' : 'no soportado');
    } catch (err) {
      this.xr.set(`error: ${err instanceof Error ? err.message : err}`);
    }
  }

  private deviceInfo(): Record<string, unknown> {
    const gl = this.scene?.renderer.getContext();
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      userAgent: navigator.userAgent,
      dpr: window.devicePixelRatio,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      gpu: dbg ? gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocida',
      fov: this.fov(),
      source: this.source(),
      delayMs: this.delayMs(),
      dexId: this.dexId(),
    };
  }
}

const screenAngle = (): number => screen.orientation?.angle ?? 0;

/** ms desde `t0` hasta que el vídeo presenta su primer fotograma. */
function firstFrame(video: HTMLVideoElement, t0: number): Promise<number> {
  return new Promise((resolve) => {
    // Existe desde Chrome 83; el tipo dice que siempre, el WebView viejo quizá no.
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => resolve(performance.now() - t0));
    } else {
      video.addEventListener('playing', () => resolve(performance.now() - t0), { once: true });
    }
  });
}
