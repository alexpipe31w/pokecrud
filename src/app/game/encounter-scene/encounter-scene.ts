import type { BallId } from '@shared/engine/capture';
import * as THREE from 'three';

import { createBall, disposeBall } from './ball-mesh';
import { spotInFront } from './device-pose';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
import type { PokemonModel } from './pokemon-model';
import { hitBox, type FlightPos, type TargetBox } from './throw-physics';
import { FX_COUNT, particleAt, type FxKind, type FxPoint } from './type-fx';

/** Postura del Pokémon en un fotograma (la da `motionAt` en F2-04b; quieto hasta entonces). */
export interface PokemonPose {
  lift: number;
  squash: number;
  lean: number;
}
export const STILL: PokemonPose = { lift: 0, squash: 1, lean: 0 };

/** El arte `home` deja ~10 % de margen alrededor del Pokémon: se compensa para que mida su altura real. */
const ART_FILL = 0.8;
/** Campo de visión vertical calibrado en el A36 (D-045). */
export const ENCOUNTER_FOV_DEG = 64;

/** Puntos de una ráfaga (polvo al aterrizar, destello shiny; estrellas de la captura en F2-07). */
export const BURST_COUNT = 28;
export const BURST_S = 0.8;
/**
 * La bola en vuelo no se dibuja hasta estar a esta distancia por delante: sale del plano de la cámara y, pegada a
 * ella, tapaba la pantalla entera. Así entra desde abajo, desde la mano (como en Pokémon GO). Solo visual.
 */
export const BALL_SHOW_FWD = 0.35;

const horizon = new THREE.Vector3();
const boxTmp = new THREE.Box3();
const cornerTmp = new THREE.Vector3();
const cornerCam = new THREE.Vector3();

/** Caja en píxeles de la pantalla (0,0 arriba a la izquierda). */
export interface ScreenBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Escena three.js del encuentro (F2-04a), sin renderer (lo pone `EncounterStage`): así se prueba en jsdom. Metros, Y
 * arriba, la cámara (el móvil) en el origen y el suelo a −EYE_HEIGHT_M (D-045). El Pokémon es su modelo 3D (F2-12,
 * D-048) o, si no hay, su arte en un plano; los dos miran a la cámara (girando solo sobre Y), con los pies en `anchor`
 * y su sombra en el suelo.
 */
export class EncounterScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(ENCOUNTER_FOV_DEG, 1, 0.05, 200);
  /** Pies del Pokémon, en el suelo. */
  readonly anchor = new THREE.Group();
  readonly body: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  /** Partículas del tipo, alrededor del Pokémon (F2-04b). */
  readonly fx: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  /** Ráfaga: polvo por el suelo o chispas que suben (F2-04b; estrellas en F2-07). */
  readonly burst: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  /** Aro de precisión sobre el Pokémon (F2-05): blanco fijo por fuera, de color y encogiendo por dentro. */
  readonly ring = new THREE.Group();
  /** La Poké Ball que vuela (F2-05); null mientras está en la mano (que es HTML). */
  ball: THREE.Group | null = null;
  private readonly ringOuter: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly ringInner: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  /**
   * Modelo 3D (F2-12): un grupo con los pies en su origen al que se aplica la postura; dentro, el `.glb` normalizado a
   * su altura real. Va AL LADO del plano `body` (no dentro: su escala no uniforme deformaría el giro). null = plano.
   */
  model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private lastAnimT = Number.NaN;
  private spinY = 0;
  /** Caja del modelo EN REPOSO en el sistema de los pies (sin saltos ni respiración): la de la ficha (F2-13). */
  private readonly restBox = new THREE.Box3();
  private readonly shadowTex: THREE.Texture;
  private readonly glowTex: THREE.Texture;
  private aspect = 1;
  /** Largo (hacia la cámara) / alto del modelo; el arte plano no tiene (F2-15). */
  private depthRatio = 0;
  private placed = false;
  /** 0 = normal; 1 = absorbido del todo en la bola (F2-07). */
  private shrink = 0;
  /** Hacia dónde se colocó (para recolocarlo a otra distancia sin cambiar de dirección, F2-15). */
  private yaw = 0;
  private fxKind: FxKind | null = null;
  private readonly fxColor = new THREE.Color();
  private readonly burstColor = new THREE.Color();
  private burstStart = Number.NaN;
  private burstUp = false;
  private readonly pt: FxPoint = { x: 0, y: 0, z: 0, alpha: 0 };

  constructor(readonly heightM: number) {
    this.body = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false }),
    );
    this.body.renderOrder = 2;
    this.shadowTex = blobTexture();
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }),
    );
    this.shadow.position.y = 0.01;
    this.glowTex = blobTexture(32, 255, 255);
    this.fx = glowPoints(FX_COUNT, 0.08, this.glowTex);
    this.burst = glowPoints(BURST_COUNT, 0.12, this.glowTex);
    this.fx.visible = false;
    this.burst.visible = false;
    const ringMat = (color: number, opacity: number) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
      });
    this.ringOuter = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), ringMat(0xffffff, 0.85));
    this.ringInner = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), ringMat(0x3ccf8e, 0.95));
    this.ring.add(this.ringOuter, this.ringInner);
    this.ring.renderOrder = 3;
    this.ring.visible = false;
    this.anchor.add(this.shadow, this.body, this.fx, this.burst, this.ring);
    this.anchor.visible = false;
    // Luz solo para la bola (el Pokémon y los aros son MeshBasic: no les afecta).
    this.scene.add(this.anchor, new THREE.HemisphereLight(0xffffff, 0x445566, 2.5));
  }

  get isPlaced(): boolean {
    return this.placed;
  }

  /** Proporción ancho/alto del arte (para la caja del lanzamiento, F2-05). */
  get artAspect(): number {
    return this.aspect;
  }

  /** Caja del Pokémon para el lanzamiento (la misma que dibuja el aro). */
  get box(): { height: number; halfWidth: number } {
    return hitBox(this.heightM, this.aspect);
  }

  /** Distancia a la que está (D-045: máx(2 m, 1,8 × altura), tope 12 m; F2-15: y que quepa a lo ancho). */
  get distance(): number {
    const halfWidthTan =
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const h = this.heightM;
    return encounterDistance(h, h * this.aspect, halfWidthTan, h * this.depthRatio);
  }

  setTexture(tex: THREE.Texture): void {
    this.body.material.map = tex;
    this.body.material.needsUpdate = true;
    const img = tex.image as { width?: number; height?: number } | undefined;
    // Si el modelo 3D ya llegó, manda su proporción (el arte queda oculto detrás).
    if (!this.model && img?.width && img.height) {
      this.aspect = img.width / img.height;
      this.refit();
    }
  }

  /**
   * Cambia el plano por el modelo 3D (F2-12): lo escala a su altura real con su caja, pies en el suelo y centrado;
   * reproduce en bucle su primera animación (si trae) y enciende la luz que necesitan sus materiales.
   */
  setModel({ scene: gltf, clips }: PokemonModel): void {
    if (clips.length) {
      this.mixer = new THREE.AnimationMixer(gltf);
      this.mixer.clipAction(clips[0]).play();
      this.mixer.update(0); // se mide en la pose de su animación, que es la que se ve
    }
    // Se mide lo que SE DIBUJA: en los modelos con huesos la geometría en reposo no dice dónde está (Pikachu salía
    // flotando 14 cm). `precise` aplica los huesos, que necesitan sus matrices al día.
    gltf.updateMatrixWorld(true);
    gltf.traverse((o) => (o as THREE.SkinnedMesh).skeleton?.update());
    const box = new THREE.Box3().setFromObject(gltf, true);
    const size = box.getSize(new THREE.Vector3());
    if (size.y <= 0) return; // modelo vacío: se queda el plano
    const k = this.heightM / size.y;
    gltf.scale.setScalar(k);
    gltf.position.set(
      (-(box.min.x + box.max.x) / 2) * k,
      -box.min.y * k,
      (-(box.min.z + box.max.z) / 2) * k,
    );
    // Las mallas con huesos se recortarían con la caja de su pose de reposo al animarse.
    gltf.traverse((o) => (o.frustumCulled = false));
    const pivot = new THREE.Group();
    pivot.add(gltf);
    this.anchor.add(pivot);
    this.model = pivot;
    this.aspect = size.x / size.y;
    this.depthRatio = size.z / size.y;
    this.refit();
    this.restBox.set(
      new THREE.Vector3((-size.x * k) / 2, 0, (-size.z * k) / 2),
      new THREE.Vector3((size.x * k) / 2, this.heightM, (size.z * k) / 2),
    );
    this.body.visible = false;
    // La hemisférica ya está (F2-05, para la bola); el modelo necesita además una direccional que marque volumen.
    if (!this.scene.getObjectsByProperty('isDirectionalLight', true).length) {
      const sun = new THREE.DirectionalLight(0xffffff, 1.8);
      sun.position.set(1, 4, 2);
      this.scene.add(sun);
    }
  }

  /** Gira el modelo sobre sí mismo (arrastrar el dedo, F2-12), en radianes. */
  spin(radians: number): void {
    this.spinY += radians;
  }

  /** Fantasma semitransparente (F2-04b) o fundidos (aparecer, huir). */
  setOpacity(alpha: number): void {
    this.body.material.opacity = alpha;
    this.shadow.material.opacity = Math.min(1, alpha * 1.2);
    eachMaterial(this.model, (m) => {
      m.transparent = alpha < 1;
      m.opacity = alpha;
    });
  }

  /** Pone al Pokémon en el suelo delante de hacia donde mira el móvil (`yaw` de `cameraYaw`). */
  placeAt(yaw: number): void {
    this.yaw = yaw;
    spotInFront(yaw, this.distance, -EYE_HEIGHT_M, this.anchor.position);
    this.anchor.visible = true;
    this.placed = true;
  }

  /** Ya colocado y con otra proporción (llegó el modelo o el arte): a la distancia que pide su ancho (F2-15). */
  private refit(): void {
    if (this.placed) spotInFront(this.yaw, this.distance, -EYE_HEIGHT_M, this.anchor.position);
  }

  /**
   * Sin AR (sin imagen de la cámara o sin giroscopio): cámara quieta mirando al centro del Pokémon, como Pokémon GO
   * con la AR apagada. Si no, un Pikachu a 2 m quedaría por debajo de la pantalla. `hover`: metros que flota (los
   * alados), para que no se salga por arriba.
   */
  aimAtPokemon(hover = 0): void {
    const a = this.anchor.position;
    this.camera.lookAt(a.x, a.y + hover + this.heightM / 2, a.z);
    this.camera.updateMatrixWorld();
  }

  /** Altura del horizonte en pantalla (0 arriba, 1 abajo) con la cámara de ahora: la del fondo ilustrado. */
  horizonY(): number {
    this.camera.updateMatrixWorld();
    horizon.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    horizon.y = 0;
    if (horizon.lengthSq() < 1e-9) return 0.5;
    horizon.normalize().multiplyScalar(1000).project(this.camera);
    return Math.min(1, Math.max(0, (1 - horizon.y) / 2));
  }

  /**
   * Dónde está el Pokémon en la pantalla, en píxeles (la ficha de F2-13 se pone a su lado). null si aún no está
   * colocado o si queda detrás de la cámara (en AR, al mirar hacia otro lado).
   */
  screenBox(width: number, height: number): ScreenBox | null {
    if (!this.placed) return null;
    this.anchor.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();
    // En reposo (sin saltos ni respiración): si no, la ficha subiría y bajaría con él (Alex lo vio).
    if (this.model) boxTmp.copy(this.restBox);
    else {
      const half = (this.heightM * this.aspect) / 2;
      boxTmp.min.set(-half, 0, 0);
      boxTmp.max.set(half, this.heightM, 0);
    }
    boxTmp.applyMatrix4(this.anchor.matrixWorld);
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      cornerTmp.set(
        i & 1 ? boxTmp.max.x : boxTmp.min.x,
        i & 2 ? boxTmp.max.y : boxTmp.min.y,
        i & 4 ? boxTmp.max.z : boxTmp.min.z,
      );
      // Detrás de la cámara la proyección se da la vuelta: mejor no decir nada.
      if (
        cornerCam.copy(cornerTmp).applyMatrix4(this.camera.matrixWorldInverse).z > -this.camera.near
      )
        return null;
      cornerTmp.project(this.camera);
      const x = ((cornerTmp.x + 1) / 2) * width;
      const y = ((1 - cornerTmp.y) / 2) * height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    return { left, top, right, bottom };
  }

  setViewport(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Un fotograma: orienta la cámara (null = sin giroscopio, se queda mirando a −Z) y coloca el cuerpo. */
  update(orientation: THREE.Quaternion | null, pose: PokemonPose = STILL): void {
    if (orientation) this.camera.quaternion.copy(orientation);
    const a = this.anchor;
    a.rotation.y = Math.atan2(-a.position.x, -a.position.z);
    const h = this.heightM / ART_FILL;
    const k = Math.max(0.001, 1 - this.shrink);
    this.body.scale.set(h * this.aspect * (2 - pose.squash) * k, h * pose.squash * k, 1);
    this.body.position.y = pose.lift - h * (1 - ART_FILL) * 0.5;
    this.body.rotation.z = pose.lean;
    const m = this.model;
    if (m) {
      m.position.y = pose.lift;
      m.scale.set((2 - pose.squash) * k, pose.squash * k, (2 - pose.squash) * k);
      m.rotation.set(0, this.spinY, pose.lean);
    }
    // La sombra se queda en el suelo y encoge cuanto más alto está.
    const away = Math.min(0.6, pose.lift / (this.heightM + 0.5));
    this.shadow.scale.setScalar(Math.max(0.35, this.heightM * 0.9) * (1 - away) * k);
  }

  /** Partículas del tipo (null = ninguna, p. ej. con "reducir efectos"). `color` CSS: '#rrggbb'. */
  setFx(kind: FxKind | null, color = '#ffffff'): void {
    this.fxKind = kind;
    this.fxColor.set(color);
    this.fx.visible = kind !== null;
  }

  /** Empieza una ráfaga en `tSec`: `up` = chispas que suben (shiny, estrellas); si no, polvo por el suelo. */
  startBurst(tSec: number, color: string, up: boolean): void {
    this.burstStart = tSec;
    this.burstColor.set(color);
    this.burstUp = up;
    this.burst.visible = true;
  }

  /** Anima partículas y ráfaga; `tSec` = segundos desde que empezó el encuentro. */
  animate(tSec: number): void {
    if (this.mixer) {
      // Tope de 1 s: al volver de segundo plano no da un salto enorme.
      const dt = Number.isNaN(this.lastAnimT) ? 0 : Math.min(1, Math.max(0, tSec - this.lastAnimT));
      this.mixer.update(dt);
    }
    this.lastAnimT = tSec;
    const radius = Math.max(0.25, this.heightM * 0.45 * this.aspect);
    if (this.fxKind) {
      const pos = attr(this.fx, 'position');
      const col = attr(this.fx, 'color');
      const c = this.fxColor;
      for (let i = 0; i < FX_COUNT; i++) {
        const p = particleAt(
          this.fxKind,
          seed(i, 0),
          seed(i, 1),
          seed(i, 2),
          tSec,
          this.heightM,
          radius,
          this.pt,
        );
        pos.setXYZ(i, p.x, p.y, p.z);
        col.setXYZW(i, c.r, c.g, c.b, p.alpha); // se apaga el alfa, no el color: el canvas es transparente
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
    }
    if (!this.burst.visible) return;
    const k = (tSec - this.burstStart) / BURST_S;
    if (!(k >= 0 && k < 1)) {
      this.burst.visible = false;
      return;
    }
    const pos = attr(this.burst, 'position');
    const col = attr(this.burst, 'color');
    const c = this.burstColor;
    for (let i = 0; i < BURST_COUNT; i++) {
      const ang = (i / BURST_COUNT) * Math.PI * 2;
      const r = radius * (0.3 + 1.2 * k) * (0.7 + 0.3 * seed(i, 1));
      const y = this.burstUp
        ? this.heightM * (0.2 + 1.1 * k * (0.5 + seed(i, 2)))
        : 0.05 + 0.3 * k * (1 - k);
      pos.setXYZ(i, Math.cos(ang) * r, y, Math.sin(ang) * r);
      col.setXYZW(i, c.r, c.g, c.b, 1 - k);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  setRing(visible: boolean, color = '#3ccf8e'): void {
    this.ring.visible = visible;
    this.ringInner.material.color.set(color);
  }

  /**
   * Aro centrado en la caja del Pokémon con los pies a `lift`; `inner` = radio del de color (`ringRadius`, 0..1).
   * Es una elipse del tamaño de la caja: así lo que se ve es justo la zona que cuenta (`throwQuality`).
   */
  updateRing(lift: number, inner: number): void {
    const { height, halfWidth } = this.box;
    this.ring.position.set(0, lift + height / 2, 0.02);
    this.ringOuter.scale.set(halfWidth, height / 2, 1);
    this.ringInner.scale.set(halfWidth * inner, (height / 2) * inner, 1);
  }

  /** Caja del Pokémon en el marco de un lanzamiento hecho mirando a `yaw`, con los pies a `lift` (throw-physics). */
  throwTarget(yaw: number, lift: number): TargetBox {
    const p = this.anchor.position;
    return {
      fwd: -Math.sin(yaw) * p.x - Math.cos(yaw) * p.z,
      lat: Math.cos(yaw) * p.x - Math.sin(yaw) * p.z,
      baseY: p.y + lift,
      groundY: -EYE_HEIGHT_M,
      ...this.box,
    };
  }

  /**
   * Absorción (F2-07): `shrink` 0..1 encoge al Pokémon hacia sus pies y `red` 0..1 lo tiñe de luz roja. En el plano,
   * el color del material multiplica el arte; en el modelo 3D (iluminado) además brilla en rojo (`emissive`), si no
   * el rojo se vería como una sombra. Se guardan sus colores originales y (0, 0) los devuelve tal cual.
   */
  setCaptureLook(shrink: number, red: number): void {
    this.shrink = Math.min(1, Math.max(0, shrink));
    const r = Math.min(1, Math.max(0, red));
    this.body.material.color.setRGB(1, 1 - 0.75 * r, 1 - 0.75 * r);
    this.body.visible = !this.model && this.shrink < 0.999;
    if (!this.model) return;
    this.model.visible = this.shrink < 0.999;
    eachMaterial(this.model, (m) => {
      const mat = m as THREE.MeshStandardMaterial;
      const base = (mat.userData['capture'] ??= {
        color: mat.color?.clone(),
        emissive: mat.emissive?.clone(),
      }) as { color?: THREE.Color; emissive?: THREE.Color };
      if (base.color)
        mat.color.copy(base.color).multiply(tint.setRGB(1, 1 - 0.75 * r, 1 - 0.75 * r));
      if (base.emissive) mat.emissive.copy(base.emissive).lerp(CAPTURE_GLOW, 0.8 * r);
    });
  }

  /** Bola quieta en un punto de la escena con una inclinación lateral (sacudidas de F2-07). */
  poseBall(x: number, y: number, z: number, tilt: number): void {
    if (!this.ball) return;
    this.ball.position.set(x, y, z);
    this.ball.rotation.set(0, Math.atan2(-x, -z), tilt);
  }

  /** Saca a la escena una bola nueva (la de la mano es HTML); si había otra, se tira. */
  spawnBall(id: BallId): THREE.Group {
    this.removeBall();
    this.ball = createBall(id);
    this.scene.add(this.ball);
    return this.ball;
  }

  removeBall(): void {
    if (!this.ball) return;
    this.scene.remove(this.ball);
    disposeBall(this.ball);
    this.ball = null;
  }

  /** Bola en un punto del vuelo (marco del lanzamiento hecho mirando a `yaw`), girando `spin` rad hacia delante. */
  setBallInThrowFrame(yaw: number, p: FlightPos, spin: number): void {
    if (!this.ball) return;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    this.ball.position.set(
      fx * p.fwd + Math.cos(yaw) * p.lat,
      p.up,
      fz * p.fwd - Math.sin(yaw) * p.lat,
    );
    this.ball.rotation.set(-spin, 0, 0);
    this.ball.visible = p.fwd >= BALL_SHOW_FWD;
  }

  dispose(): void {
    this.removeBall();
    for (const m of [this.ringOuter, this.ringInner]) {
      m.geometry.dispose();
      m.material.dispose();
    }
    this.mixer?.stopAllAction();
    this.model?.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    eachMaterial(this.model, (m) => {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    });
    for (const p of [this.fx, this.burst]) {
      p.geometry.dispose();
      p.material.dispose();
    }
    this.glowTex.dispose();
    this.body.geometry.dispose();
    this.body.material.map?.dispose();
    this.body.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.shadowTex.dispose();
  }
}

/**
 * Mancha difuminada calculada en un array (sin canvas: ni otro contexto que cuente para el límite del WebView, D-038,
 * ni avisos de jsdom en los tests). Por defecto la sombra: negro con alfa 0,5 en el centro → 0 en el borde; con
 * `rgb` 255 y `maxAlpha` 255, el punto de luz redondo de las partículas.
 */
export function blobTexture(size = 64, rgb = 0, maxAlpha = 127): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x - c, y - c) / c);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = rgb;
      data[i + 3] = Math.round(maxAlpha * (1 - d) * (1 - d));
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

/** Semilla fija en [0, 1) de la partícula `i` (`k` = 0, 1, 2): sin Math.random, la escena es determinista. */
function seed(i: number, k: number): number {
  const x = Math.sin((i + 1) * (12.9898 + k * 78.233)) * 43758.5453;
  return x - Math.floor(x);
}

function glowPoints(
  n: number,
  size: number,
  map: THREE.Texture,
): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  // RGBA por punto: sobre un canvas TRANSPARENTE (encima del vídeo) apagar el color en vez del alfa deja puntos
  // negros; con alfa por punto y alfa premultiplicado, el aditivo suma (color·α, α) y lo apagado no se ve.
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  const p = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      size,
      map,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
    }),
  );
  p.frustumCulled = false;
  return p;
}

/** Cada material de las mallas de `root` (los `.glb` pueden traer varios por malla). */
/** Luz roja de la absorción (F2-07) en los modelos 3D. */
const CAPTURE_GLOW = new THREE.Color(1, 0.12, 0.12);
const tint = new THREE.Color();

function eachMaterial(root: THREE.Object3D | null, fn: (m: THREE.Material) => void): void {
  root?.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) fn(m);
  });
}

const attr = (p: THREE.Points, name: string): THREE.BufferAttribute =>
  p.geometry.getAttribute(name) as THREE.BufferAttribute;
