/// <reference types="google.maps" />
// @googlemaps/three 4.0.13 trae sus tipos (dist/three.d.ts) pero su `exports` no tiene condición `types`, así que con
// `moduleResolution: bundler` TypeScript no los encuentra. Esta copia recoge SOLO lo que usa la app (F1-01); si se
// sube de versión o se usa algo más, copiarlo de node_modules/@googlemaps/three/dist/three.d.ts.
declare module '@googlemaps/three' {
  import type { Intersection, Object3D, PerspectiveCamera, Scene, Vector2, Vector3 } from 'three';

  export type LatLngTypes =
    | google.maps.LatLngLiteral
    | google.maps.LatLng
    | google.maps.LatLngAltitudeLiteral
    | google.maps.LatLngAltitude;

  export interface ThreeJSOverlayViewOptions {
    anchor?: LatLngTypes;
    upAxis?: 'Z' | 'Y' | Vector3;
    map?: google.maps.Map;
    scene?: Scene;
    animationMode?: 'always' | 'ondemand';
    addDefaultLighting?: boolean;
  }

  export class ThreeJSOverlayView {
    readonly scene: Scene;
    animationMode: 'always' | 'ondemand';
    /** Su `projectionMatrix` es modelo-vista-proyección desde el ancla (la usa `MapOverlay`, F1-07 / D-042). */
    protected readonly camera: PerspectiveCamera;
    constructor(options?: ThreeJSOverlayViewOptions);
    setAnchor(anchor: LatLngTypes): void;
    onBeforeDraw(): void;
    requestRedraw(): void;
    getMap(): google.maps.Map;
    setMap(map: google.maps.Map | null): void;
    latLngAltitudeToVector3(position: LatLngTypes, target?: Vector3): Vector3;
    raycast(p: Vector2, objects?: Object3D[]): Intersection[];
  }
}
