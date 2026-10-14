import * as THREE from 'three';

import type { EncounterScene } from './encounter-scene';

/** Lo que la página usa del escenario (en los tests, un doble: jsdom no tiene WebGL). */
export interface EncounterStageLike {
  /** Cada fotograma, antes de dibujar (ms de `requestAnimationFrame`). */
  onFrame: ((now: number) => void) | null;
  start(): void;
  stop(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Renderer y bucle del encuentro (F2-04a): un `WebGLRenderer` transparente sobre el `<video>` de la cámara. UN solo
 * contexto WebGL, que se suelta al destruir (`forceContextLoss`): el WebView tiene un límite y al pasarse mata el más
 * viejo, que es el del mapa (D-038). Píxeles a como mucho ×2 (el nativo ×2,8 no se nota y empeora el peor fotograma,
 * D-045). Sin pruebas unitarias (WebGL): se prueba en el móvil.
 */
export class EncounterStage implements EncounterStageLike {
  onFrame: ((now: number) => void) | null = null;
  private readonly renderer: THREE.WebGLRenderer;
  private raf = 0;
  private running = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly world: EncounterScene,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize(width: number, height: number): void {
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.world.setViewport(width, height);
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    this.onFrame?.(now);
    this.renderer.render(this.world.scene, this.world.camera);
    this.raf = requestAnimationFrame(this.tick);
  };
}
