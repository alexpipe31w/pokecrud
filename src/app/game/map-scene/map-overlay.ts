import { ThreeJSOverlayView, type ThreeJSOverlayViewOptions } from '@googlemaps/three';
import type * as THREE from 'three';

/**
 * `ThreeJSOverlayView` que avisa antes de pintar cada fotograma con la matriz de su cámara (modelo-vista-proyección
 * desde el ancla). La usa la capa HTML de los Pokémon (D-042) para colocarse con la cámara de ESE fotograma.
 * `camera` es `protected` en la librería: por eso una subclase y no leerla desde fuera.
 */
export class MapOverlay extends ThreeJSOverlayView {
  constructor(
    options: ThreeJSOverlayViewOptions,
    private readonly beforeDraw: (projection: THREE.Matrix4) => void,
  ) {
    super(options);
  }

  override onBeforeDraw(): void {
    this.beforeDraw(this.camera.projectionMatrix);
  }
}
