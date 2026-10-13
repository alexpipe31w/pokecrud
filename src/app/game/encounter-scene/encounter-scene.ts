import * as THREE from 'three';

import { spotInFront } from './device-pose';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
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

const horizon = new THREE.Vector3();

/**
 * Escena three.js del encuentro (F2-04a), sin renderer (lo pone `EncounterStage`): así se prueba en jsdom. Metros, Y
 * arriba, la cámara (el móvil) en el origen y el suelo a −EYE_HEIGHT_M (D-045). El Pokémon es su arte en un plano que
 * siempre mira a la cámara (girando solo sobre Y), con los pies en `anchor` y su sombra en el suelo.
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
  private readonly shadowTex: THREE.Texture;
  private readonly glowTex: THREE.Texture;
  private aspect = 1;
  private placed = false;
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
    this.anchor.add(this.shadow, this.body, this.fx, this.burst);
    this.anchor.visible = false;
    this.scene.add(this.anchor);
  }

  get isPlaced(): boolean {
    return this.placed;
  }

  /** Proporción ancho/alto del arte (para la caja del lanzamiento, F2-05). */
  get artAspect(): number {
    return this.aspect;
  }

  /** Distancia a la que está (D-045: máx(2 m, 1,8 × altura), tope 12 m). */
  get distance(): number {
    return encounterDistance(this.heightM);
  }

  setTexture(tex: THREE.Texture): void {
    this.body.material.map = tex;
    this.body.material.needsUpdate = true;
    const img = tex.image as { width?: number; height?: number } | undefined;
    if (img?.width && img.height) this.aspect = img.width / img.height;
  }

  /** Fantasma semitransparente (F2-04b) o fundidos (aparecer, huir). */
  setOpacity(alpha: number): void {
    this.body.material.opacity = alpha;
    this.shadow.material.opacity = Math.min(1, alpha * 1.2);
  }

  /** Pone al Pokémon en el suelo delante de hacia donde mira el móvil (`yaw` de `cameraYaw`). */
  placeAt(yaw: number): void {
    spotInFront(yaw, this.distance, -EYE_HEIGHT_M, this.anchor.position);
    this.anchor.visible = true;
    this.placed = true;
  }

  /**
   * Sin AR (sin imagen de la cámara o sin giroscopio): cámara quieta mirando al centro del Pokémon, como Pokémon GO
   * con la AR apagada. Si no, un Pikachu a 2 m quedaría por debajo de la pantalla.
   */
  aimAtPokemon(): void {
    const a = this.anchor.position;
    this.camera.lookAt(a.x, a.y + this.heightM / 2, a.z);
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
    this.body.scale.set(h * this.aspect * (2 - pose.squash), h * pose.squash, 1);
    this.body.position.y = pose.lift - h * (1 - ART_FILL) * 0.5;
    this.body.rotation.z = pose.lean;
    // La sombra se queda en el suelo y encoge cuanto más alto está.
    const away = Math.min(0.6, pose.lift / (this.heightM + 0.5));
    this.shadow.scale.setScalar(Math.max(0.35, this.heightM * 0.9) * (1 - away));
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
        col.setXYZ(i, c.r * p.alpha, c.g * p.alpha, c.b * p.alpha); // aditivo: oscuro = transparente
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
      col.setXYZ(i, c.r * (1 - k), c.g * (1 - k), c.b * (1 - k));
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  dispose(): void {
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
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      size,
      map,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  p.frustumCulled = false;
  return p;
}

const attr = (p: THREE.Points, name: string): THREE.BufferAttribute =>
  p.geometry.getAttribute(name) as THREE.BufferAttribute;
