import * as THREE from 'three';
import { spotInFront } from '../../game/encounter-scene/device-pose';

/**
 * Escena de prueba del spike F2-01 (`/dev/ar`): lo que tendrá el encuentro (F2-04) sobre la cámara, para medir cuánto
 * cuesta dibujarlo en el WebView: el Pokémon a tamaño real (arte `home` en billboard que respira), su sombra, el
 * anillo del suelo y partículas del color de su tipo (la carga de los "efectos por tipo" de DISENO §5).
 * Metros, Y arriba, cámara en el origen y el suelo a −EYE_HEIGHT_M.
 */

/** Altura a la que se sostiene el móvil: el suelo de la escena está a esta distancia por debajo de la cámara. */
export const EYE_HEIGHT_M = 1.4;
export const MAX_PARTICLES = 400;

export const homeArtUrl = (dexId: number): string =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${dexId}.png`;

/** Distancia para que quepa en pantalla pero se note el tamaño: los pequeños a 2 m, los grandes más lejos. */
export const fitDistance = (heightM: number): number => Math.max(2, heightM * 1.8);

export class ArSpikeScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
  private readonly scene = new THREE.Scene();
  /** Pie del Pokémon: se coloca en el suelo y gira hacia la cámara (billboard sobre Y). */
  private readonly anchor = new THREE.Group();
  private readonly body: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly seeds = new Float32Array(MAX_PARTICLES * 3);
  private readonly disposables: { dispose(): void }[] = [];
  private texture: THREE.Texture | null = null;
  private heightM = 1;
  private aspect = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);

    const bodyGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.body = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false }),
    );
    this.body.renderOrder = 2;

    const blob = radialTexture('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }),
    );
    this.shadow.position.y = 0.01;

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
    );
    this.ring.position.y = 0.02;

    const dot = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3),
    );
    this.particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        map: dot,
        size: 0.12,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.particles.frustumCulled = false;
    for (let i = 0; i < this.seeds.length; i++) this.seeds[i] = Math.random();
    this.setParticles(0);

    this.anchor.add(this.shadow, this.ring, this.body, this.particles);
    this.anchor.visible = false;
    this.scene.add(this.anchor);
    this.disposables.push(
      bodyGeo,
      this.body.material,
      this.shadow.geometry,
      this.shadow.material,
      blob,
      this.ring.geometry,
      this.ring.material,
      pGeo,
      this.particles.material,
      dot,
    );
  }

  setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(ratio);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Campo de visión VERTICAL en grados: tiene que coincidir con el del vídeo tal como se ve (recortado). */
  setFov(deg: number): void {
    this.camera.fov = deg;
    this.camera.updateProjectionMatrix();
  }

  setParticles(count: number, color = '#ffcb3d'): void {
    this.particles.geometry.setDrawRange(0, Math.min(count, MAX_PARTICLES));
    this.particles.material.color.set(color);
  }

  /** Cambia de Pokémon: textura `home` (512×512) y altura real en metros. */
  async setPokemon(url: string, heightM: number): Promise<void> {
    const tex = await new THREE.TextureLoader().setCrossOrigin('anonymous').loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.texture?.dispose();
    this.texture = tex;
    this.body.material.map = tex;
    this.body.material.needsUpdate = true;
    const img = tex.image as { width: number; height: number };
    this.aspect = img.width / img.height;
    this.heightM = heightM;
    const r = Math.max(0.35, heightM * 0.45);
    this.shadow.scale.setScalar(r * 2);
    this.ring.scale.setScalar(r * 1.6);
  }

  /** Pone al Pokémon en el suelo, a `distance` metros en el rumbo `yaw` (ver `cameraYaw`). */
  placeAt(yaw: number, distance: number): void {
    spotInFront(yaw, distance, -EYE_HEIGHT_M, this.anchor.position);
    this.anchor.visible = true;
  }

  /** Un fotograma: orienta la cámara, anima (respirar, saltito, partículas) y dibuja. `now` en ms. */
  render(now: number, orientation: THREE.Quaternion | null): void {
    if (orientation) this.camera.quaternion.copy(orientation);
    const t = now / 1000;
    const a = this.anchor;
    a.rotation.y = Math.atan2(-a.position.x, -a.position.z);
    // El arte home deja ~10 % de margen alrededor del Pokémon: se compensa para que la altura visible sea la real.
    const h = this.heightM / 0.8;
    const breathe = 1 + 0.025 * Math.sin(t * 2.4);
    const hop = Math.max(0, Math.sin(t * 2.2)) ** 8 * 0.12 * this.heightM;
    this.body.scale.set(h * this.aspect * (2 - breathe), h * breathe, 1);
    this.body.position.y = hop - h * 0.1;
    this.shadow.material.opacity = 1 - hop / (this.heightM * 0.3 + 0.01);
    this.updateParticles(t);
    this.renderer.render(this.scene, this.camera);
  }

  clear(): void {
    this.renderer.clear();
  }

  /** Libera la GPU: el contexto WebGL se pierde a propósito para no acumularlos (límite del WebView, D-038). */
  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.texture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  /** Partículas que suben en espiral alrededor del Pokémon (en la CPU: 400 puntos son ~0,05 ms). */
  private updateParticles(t: number): void {
    const n = this.particles.geometry.drawRange.count;
    if (!n || n === Infinity) return;
    const pos = this.particles.geometry.attributes['position'] as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const top = this.heightM * 1.3 + 0.3;
    const radius = Math.max(0.4, this.heightM * 0.5);
    for (let i = 0; i < n; i++) {
      const s0 = this.seeds[i * 3];
      const s1 = this.seeds[i * 3 + 1];
      const s2 = this.seeds[i * 3 + 2];
      const life = (t * (0.25 + s1 * 0.35) + s0) % 1;
      const ang = s2 * Math.PI * 2 + t * (0.6 + s0);
      const r = radius * (0.6 + 0.6 * s1) * (1 - life * 0.4);
      arr[i * 3] = Math.cos(ang) * r;
      arr[i * 3 + 1] = life * top;
      arr[i * 3 + 2] = Math.sin(ang) * r;
    }
    pos.needsUpdate = true;
  }
}

/** Círculo difuminado en un canvas 2D (sombra y partículas), sin descargar nada. */
function radialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
