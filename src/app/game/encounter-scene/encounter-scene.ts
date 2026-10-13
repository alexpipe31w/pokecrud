import * as THREE from 'three';

import { spotInFront } from './device-pose';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';

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
  private readonly shadowTex: THREE.Texture;
  private aspect = 1;
  private placed = false;

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
    this.anchor.add(this.shadow, this.body);
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

  dispose(): void {
    this.body.geometry.dispose();
    this.body.material.map?.dispose();
    this.body.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.shadowTex.dispose();
  }
}

/**
 * Mancha difuminada para la sombra, calculada en un array (sin canvas: ni otro contexto que cuente para el límite
 * del WebView, D-038, ni avisos de jsdom en los tests). Negro con alfa 0,5 en el centro → 0 en el borde.
 */
export function blobTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x - c, y - c) / c);
      data[(y * size + x) * 4 + 3] = Math.round(127 * (1 - d) * (1 - d));
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}
