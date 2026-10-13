# F2 · Encuentro en AR y captura — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP
> (`F2-04a`, `F2-04b`, `F2-05`, `F2-07`) = **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2.
> Marca las casillas `- [ ]` de TU tarea en TU rama según avances: son el punto de guardado del siguiente compañero.
> Los pasos de código siguen TDD: test que falla → código mínimo → test en verde → commit.
>
> **Qué está verificado (Kenneth, 2026-10-12, al escribir el plan):** todo el código de lógica pura, los servicios y la
> base de F2-04a (escena, página y sus tests) se escribió, se ejecutó y se borró antes de subir el plan: **lint OK,
> build OK y 306 tests en verde** en el estado de F2-04a, más 41 tests de lógica pura y 21 de servicios de F2-05/F2-07
> (todos verdes) y la compilación del servidor con los tipos movidos. Lo que NO se ha compilado está marcado con
> **(sin compilar)**: es el código de integración de F2-04b, F2-05 y F2-07 (escena, componentes y página). Ahí,
> compila y ajusta; la lógica que llama sí está probada.

**Objetivo:** tocar un Pokémon en el mapa abre la **cámara con el Pokémon en realidad aumentada** a su tamaño real,
moviéndose según su ficha; se le lanza la Poké Ball con el dedo (con curva y círculo de precisión); el servidor decide
y la Ball absorbe, cae, se sacude 1-3 veces y lo atrapa (o se escapa, o huye), con sonido y vibración en cada paso.

**Arquitectura (ARQUITECTURA §6, D-045, D-046):**

```
/encuentro/:id  EncounterPage (Angular, features/encounter/)
   │  EncounterApiService ── GET /encounters/:id · POST /encounters/:id/throw (reintento con el mismo id)
   │  CameraService  ── getUserMedia: cámara trasera PRINCIPAL (D-045) ──> <video> de fondo (oculto hasta el 1.er fotograma)
   │  OrientationService ── RelativeOrientationSensor | deviceorientation ─(PoseDelay 80 ms)─> cuaternión
   ▼
EncounterStage (WebGLRenderer transparente + rAF; UN contexto, se suelta al salir)
   └─ EncounterScene (three.js, sin renderer → se prueba en jsdom)
        ├─ Pokémon: arte home en billboard, tamaño real × XS/XL, sombra       (F2-04a)
        ├─ postura: landingAt / motionAt (personalidad: saltos, vuelo)        (F2-04b)
        ├─ partículas del tipo (particleAt) y polvo/destello al aterrizar     (F2-04b)
        ├─ aro de precisión + Poké Ball en vuelo (planFlight/flightPos)       (F2-05)
        └─ coreografía de la captura (preTimeline/resultTimeline/stepAt)     (F2-07)
```

- **Lógica pura con tests** en `src/app/game/encounter-scene/` (sin Angular): tamaños, personalidad, movimiento,
  partículas, gesto, física, aro, secuencia. Ya existen de F2-01: `device-pose.ts` (orientación → cámara, rumbo,
  punto delante) y `pose-delay.ts`.
- **Presentación three.js** en `src/app/game/encounter-scene/encounter-scene.ts` (escena) y `encounter-stage.ts`
  (renderer). **Pantalla** en `src/app/features/encounter/`.
- **El servidor manda** (REGLA 3): el cliente decide si la bola TOCA al Pokémon y propone la calidad del lanzamiento;
  el servidor gasta la bola, tira el RNG, decide captura/huida y puede rebajar un "excelente" (D-028). Un lanzamiento
  que no toca no llama al servidor (D-046).
- **Escena:** metros, Y arriba, la cámara (el móvil) en el origen, el suelo a −1,4 m (`EYE_HEIGHT_M`). AR solo de
  orientación (sin WebXR en el WebView, D-045).

**Tech stack:** Angular 22 (zoneless, signals), Ionic 9 (`@ionic/angular`), three 0.186.1, Generic Sensor API,
`getUserMedia`, Web Audio (efectos generados, D-044), `@capacitor/haptics`. Vitest: `ng test` (jsdom) para `src/`,
`npm run test:shared` (Node) para `shared/`. Un spec suelto: `npx ng test --include=<ruta.spec.ts> --watch=false`.

---

## Orden y paralelismo

```
F2-04a escena AR base ─> F2-04b personalidad y entrada ─> F2-05 lanzamiento ─> F2-07 captura/escape/shiny
```

Secuencial: cada una usa lo de la anterior. **Todas necesitan un Android real** para el criterio (cámara, giroscopio,
fps). En el PC se prueba con la AR apagada (fondo ilustrado) en vista móvil 390×844; `/dev/ar` sigue sirviendo para
medir otros móviles. **F2-10 (música) no está en este plan:** no depende de él (ROADMAP).

**Para abrir un encuentro en el APK sin salir a la calle:** en `/mapa` con el joystick (menú de la Poké Ball) acércate
a un Pokémon a ≤ 40 m y tócalo. Por CDP: `history.pushState({}, '', '/encuentro/<id>')` +
`dispatchEvent(new PopStateEvent('popstate', { state: {} }))` con un id de `GET /spawns` (el servidor exige ≤ 80 m de
tu última posición, D-028).

## Antes de empezar (lo que ya se sabe; no lo redescubras)

- **D-045** entero: la cámara principal NO es la de `facingMode` en el A36; el `<video>` vacío pinta un póster gris;
  `deviceorientation` deja de llegar con el móvil quieto; FOV 64° y retraso 80 ms calibrados a ojo; sin WebXR.
- **D-038:** un solo contexto WebGL por pantalla, soltarlo al salir (`forceContextLoss`); nunca `getContext` sobre
  canvas ajenos ni canvas WebGL "de prueba". La sombra y las partículas usan `DataTexture`/colores, no canvas 2D.
- **D-016:** dependencias del navegador y plugins por `InjectionToken` con `factory` (los tests ponen dobles).
- **D-022:** pantalla completa = anular `--padding-*` del `ion-content` y colocar con `var(--ion-safe-area-*)`.
- **D-033:** "Reducir efectos" / `prefers-reduced-motion` → la secuencia va al doble de rápido, sin sacudidas de
  pantalla ni partículas; el juego sigue siendo jugable.
- **D-044:** los efectos de sonido son recetas en `src/app/services/game/sfx-synth.ts`; su spec ya prueba TODAS las
  recetas (suena, no satura, < 1 s): una receta nueva queda probada sola.
- Presupuesto de estilos por componente: aviso a 2 kB, error a 4 kB (`angular.json`). Por eso la pantalla se parte
  en componentes pequeños.
- `MapPage` para el GPS al salir (D-038): en el encuentro `LocationService.position()` tiene la ÚLTIMA posición, que
  es la que se manda si el servidor responde 403 (D-041).

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `src/app/game/encounter-scene/encounter-layout.ts` (+ spec) | F2-04a | Altura real, distancia, XS/XL, URLs del arte (shiny) |
| `src/app/game/encounter-scene/art-texture.ts` (+ spec) | F2-04a | Primera textura que cargue de la lista |
| `src/app/game/encounter-scene/encounter-scene.ts` (+ spec) | F2-04a → F2-07 | Escena three.js (sin renderer) |
| `src/app/game/encounter-scene/encounter-stage.ts` | F2-04a | `WebGLRenderer` + bucle; un contexto que se suelta |
| `src/app/services/ar/camera.service.ts` (+ spec) | F2-04a | Cámara trasera principal, recordada, que se suelta |
| `src/app/services/ar/orientation.service.ts` (+ spec) | F2-04a | Sensor → evento, retraso 80 ms |
| `src/app/services/game/encounter-api.service.ts` (+ spec) | F2-04a → F2-05 | `GET` encuentro; `POST` lanzamiento con reintentos |
| `src/app/services/game/settings.service.ts` (+ spec) | F2-04a | `arEnabled` |
| `src/app/features/encounter/encounter.page.ts` (+ spec) | F2-04a → F2-07 | Pantalla `/encuentro/:id` (sustituye la provisional) |
| `src/app/features/encounter/encounter-hud.component.ts` | F2-04a | Huir, placa del Pokémon, interruptor AR |
| `src/app/game/encounter-scene/personality.ts` (+ spec) | F2-04b | Agilidad, inquietud, vuelo, fantasma, tipo |
| `src/app/game/encounter-scene/pokemon-motion.ts` (+ spec) | F2-04b | Aterrizaje, respiración, saltos programados |
| `src/app/game/encounter-scene/type-fx.ts` (+ spec) | F2-04b | Partículas por tipo |
| `src/app/game/map-scene/pokemon-dom.ts`, `features/map/map.page.ts` | F2-04b | El Pokémon del mapa "crece" hacia el encuentro |
| `src/app/services/game/sfx-synth.ts` | F2-04b → F2-07 | Recetas nuevas: aterrizar, shiny, lanzar, golpe, sacudida, captura, escape |
| `shared/protocol/encounters.ts` + `server/src/encounters/*`, `server/src/bag/bag.service.ts` | F2-05 | Tipos del lanzamiento compartidos |
| `src/app/services/game/bag.service.ts` (+ spec) | F2-05 | `apply(bag)` tras lanzar |
| `src/app/core/auth/auth.service.ts` (+ spec) | F2-05 | `addXp(n)` para el HUD |
| `src/app/services/game/spawn-feed.service.ts` (+ spec) | F2-05 | `hide(id)`: lo resuelto sale del mapa |
| `src/app/game/encounter-scene/throw-gesture.ts` (+ spec) | F2-05 | Velocidad al soltar, curva, potencia y puntería |
| `src/app/game/encounter-scene/throw-physics.ts` (+ spec) | F2-05 | Vuelo, caja del Pokémon, acierto/fallo |
| `src/app/game/encounter-scene/precision-ring.ts` (+ spec) | F2-05 | Aro que encoge, Bien/Genial/Excelente, color |
| `src/app/game/encounter-scene/ball-mesh.ts` | F2-05 | Poké/Super/Ultra Ball low-poly |
| `src/app/features/encounter/throw-bar.component.ts` | F2-05 | Bola elegida (con cuántas quedan) y Frambu |
| `src/app/game/encounter-scene/capture-sequence.ts` (+ spec) | F2-07 | Coreografía: absorber, caer, sacudidas, clic/escape/huida |
| `shared/data/natures-es.ts` (+ spec) | F2-07 | Naturalezas en español (de PokéAPI) |
| `src/app/features/encounter/caught-card.component.ts` | F2-07 | "¡Capturado!" con los datos del individuo y la XP |

---

## F2-04a · Escena del encuentro en AR (base)

**Criterio:** `/encuentro/:id` definitivo en vez del provisional: cámara trasera **principal** de fondo (o fondo
ilustrado si no hay permiso, no hay cámara o la AR está apagada); el Pokémon del encuentro a su **tamaño real**
(altura de PokéAPI × XS/XL) en el suelo, delante de donde se miraba al entrar, **quieto en el mundo al girar el
móvil**; placa con nombre, ✦ shiny, nivel y XS/XL; "Huir"; estados de carga, error y "ya resuelto"; cámara y sensores
se sueltan al salir y en segundo plano. **Android:** ≥ 55 fps; mapa ↔ encuentro ×3 sin perder el contexto WebGL.

### Paso 1 — Tamaño y sitio del Pokémon

**Files:** Create `src/app/game/encounter-scene/encounter-layout.ts`, Test `src/app/game/encounter-scene/encounter-layout.spec.ts`

- [ ] **1a. Test que falla:**

```ts
import { artUrls, encounterDistance, pokemonHeightM, sizeClass } from './encounter-layout';

describe('encounter-layout', () => {
  it('pokemonHeightM: decímetros × escala individual', () => {
    expect(pokemonHeightM(4, 1)).toBeCloseTo(0.4, 6); // Pikachu
    expect(pokemonHeightM(4, 1.5)).toBeCloseTo(0.6, 6);
    expect(pokemonHeightM(0, 1)).toBe(0.1); // nunca invisible
  });

  it('encounterDistance: 2 m los pequeños, 1,8 × altura los medianos y como mucho 12 m', () => {
    expect(encounterDistance(0.4)).toBe(2);
    expect(encounterDistance(2.1)).toBeCloseTo(3.78, 6); // Snorlax
    expect(encounterDistance(14.5)).toBe(12); // Wailord: no cabe, como en VISION
  });

  it('sizeClass: XS por debajo de 0,6, XL por encima de 1,4', () => {
    expect(sizeClass(0.55)).toBe('XS');
    expect(sizeClass(1)).toBeNull();
    expect(sizeClass(1.45)).toBe('XL');
  });

  it('artUrls: home → official-artwork → normal, y las de shiny', () => {
    expect(artUrls(25, false)).toEqual([
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/25.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    ]);
    expect(artUrls(25, true)[0]).toContain('/other/home/shiny/25.png');
    expect(artUrls(25, true)[2]).toContain('/pokemon/shiny/25.png');
  });
});
```

- [ ] **1b.** `npx ng test --include=src/app/game/encounter-scene/encounter-layout.spec.ts --watch=false` → FALLA (no existe el módulo).
- [ ] **1c. Implementación:**

```ts
/**
 * Tamaño y sitio del Pokémon en la escena del encuentro (F2-04a, D-045). Metros; la cámara (el móvil) está en el
 * origen y el suelo a −EYE_HEIGHT_M.
 */

/** Altura a la que se sostiene el móvil: el suelo está a esta distancia por debajo de la cámara. */
export const EYE_HEIGHT_M = 1.4;
/** `heightScale` del servidor va de 0,5 a 1,5 (D-028): por debajo de esto es XS y por encima XL. */
export const XS_MAX = 0.6;
export const XL_MIN = 1.4;
const MIN_HEIGHT_M = 0.1;
const MIN_DISTANCE_M = 2;
/** Los enormes no caben (VISION: "un Wailord no cabe en la pantalla"): no se alejan más de esto. */
const MAX_DISTANCE_M = 12;

/** Altura real en metros: la de PokéAPI (decímetros) por la variación individual. */
export const pokemonHeightM = (heightDm: number, heightScale: number): number =>
  Math.max(MIN_HEIGHT_M, (heightDm / 10) * heightScale);

/** Distancia a la que aparece: que quepa pero se note el tamaño (los pequeños a 2 m, los grandes más lejos). */
export const encounterDistance = (heightM: number): number =>
  Math.min(MAX_DISTANCE_M, Math.max(MIN_DISTANCE_M, heightM * 1.8));

export function sizeClass(heightScale: number): 'XS' | 'XL' | null {
  if (heightScale < XS_MAX) return 'XS';
  if (heightScale > XL_MIN) return 'XL';
  return null;
}

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Arte grande con el orden de prueba de CLAUDE.md (no todas las especies tienen todos), en shiny si toca. */
export function artUrls(id: number, shiny: boolean): string[] {
  const s = shiny ? '/shiny' : '';
  return [
    `${SPRITES}/other/home${s}/${id}.png`,
    `${SPRITES}/other/official-artwork${s}/${id}.png`,
    `${SPRITES}${s}/${id}.png`,
  ];
}
```

- [ ] **1d.** El mismo comando → PASA (4 tests).
- [ ] **1e.** Commit `F2-04a: tamaño, distancia y arte del Pokémon del encuentro` + push (`/guardar`).

### Paso 2 — Cargar el arte (con su cadena de alternativas)

**Files:** Create `src/app/game/encounter-scene/art-texture.ts`, Test `art-texture.spec.ts`

- [ ] **2a. Test que falla:**

```ts
import * as THREE from 'three';
import { loadFirstTexture } from './art-texture';

describe('loadFirstTexture', () => {
  it('prueba en orden y se queda con la primera que carga (en sRGB)', async () => {
    const tex = new THREE.Texture();
    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url === 'b') return tex;
        throw new Error('404');
      }),
    };
    expect(await loadFirstTexture(['a', 'b', 'c'], loader)).toBe(tex);
    expect(loader.loadAsync.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('null si no carga ninguna', async () => {
    const loader = { loadAsync: vi.fn(async () => Promise.reject(new Error('404'))) };
    expect(await loadFirstTexture(['a', 'b'], loader)).toBeNull();
  });
});
```

- [ ] **2b.** `npx ng test --include=src/app/game/encounter-scene/art-texture.spec.ts --watch=false` → FALLA.
- [ ] **2c. Implementación:**

```ts
import * as THREE from 'three';

/** Lo que se usa de `THREE.TextureLoader` (para los tests). */
export interface TextureLoaderLike {
  loadAsync(url: string): Promise<THREE.Texture>;
}

/**
 * Primera textura que cargue de la lista (`artUrls`: home → official-artwork → normal; no todas las especies tienen
 * todas). null si no carga ninguna: la escena enseña la silueta de "?" y el encuentro sigue.
 */
export async function loadFirstTexture(
  urls: readonly string[],
  loader: TextureLoaderLike = new THREE.TextureLoader().setCrossOrigin('anonymous'),
): Promise<THREE.Texture | null> {
  for (const url of urls) {
    try {
      const tex = await loader.loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      // siguiente
    }
  }
  return null;
}
```

- [ ] **2d.** → PASA (2 tests). Commit `F2-04a: carga del arte con alternativas` + push.

### Paso 3 — La escena three.js (sin renderer)

Como `MapScene`, la escena no crea el renderer: así se prueba en jsdom. Sin AR la cámara se queda **mirando al
Pokémon** (si mirara al horizonte, un Pikachu a 2 m quedaría por debajo de la pantalla) y `horizonY()` da la altura del
horizonte para que el fondo ilustrado coincida. La sombra es una `DataTexture` (sin canvas: D-038 y sin avisos de jsdom).

**Files:** Create `src/app/game/encounter-scene/encounter-scene.ts`, Test `encounter-scene.spec.ts`

- [ ] **3a. Test que falla:**

```ts
import * as THREE from 'three';
import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
import { EncounterScene, blobTexture } from './encounter-scene';

describe('EncounterScene', () => {
  it('no se ve hasta colocarlo; colocado está en el suelo, delante, a su distancia', () => {
    const s = new EncounterScene(0.4);
    expect(s.anchor.visible).toBe(false);
    s.placeAt(0);
    expect(s.isPlaced).toBe(true);
    expect(s.anchor.visible).toBe(true);
    expect(s.anchor.position.x).toBeCloseTo(0, 6);
    expect(s.anchor.position.y).toBe(-EYE_HEIGHT_M);
    expect(s.anchor.position.z).toBeCloseTo(-encounterDistance(0.4), 6);
    s.dispose();
  });

  it('siempre mira a la cámara (gira sobre Y)', () => {
    const s = new EncounterScene(1);
    s.placeAt(Math.PI / 2); // a la izquierda (−X)
    s.update(null);
    expect(s.anchor.rotation.y).toBeCloseTo(Math.PI / 2, 6);
    s.dispose();
  });

  it('mide su altura real (el arte tiene un 10 % de margen)', () => {
    const s = new EncounterScene(2.1);
    s.placeAt(0);
    s.update(null);
    expect(s.body.scale.y * 0.8).toBeCloseTo(2.1, 6);
    s.dispose();
  });

  it('al elevarse sube el cuerpo, no los pies, y la sombra encoge', () => {
    const s = new EncounterScene(0.4);
    s.placeAt(0);
    s.update(null);
    const ground = { body: s.body.position.y, shadow: s.shadow.scale.x };
    s.update(null, { lift: 0.6, squash: 1, lean: 0 });
    expect(s.body.position.y).toBeCloseTo(ground.body + 0.6, 6);
    expect(s.anchor.position.y).toBe(-EYE_HEIGHT_M);
    expect(s.shadow.scale.x).toBeLessThan(ground.shadow);
    s.dispose();
  });

  it('sin AR mira al Pokémon: el horizonte sube más cuanto más pequeño y cerca está', () => {
    const pika = new EncounterScene(0.4);
    pika.setViewport(390, 844);
    pika.placeAt(0);
    pika.aimAtPokemon();
    const snorlax = new EncounterScene(2.1);
    snorlax.setViewport(390, 844);
    snorlax.placeAt(0);
    snorlax.aimAtPokemon();
    expect(snorlax.horizonY()).toBeGreaterThan(0.3);
    expect(snorlax.horizonY()).toBeLessThan(0.5);
    expect(pika.horizonY()).toBeLessThan(snorlax.horizonY());
    // El centro del Pokémon queda en el centro de la pantalla.
    const c = pika.anchor.position
      .clone()
      .setY(pika.anchor.position.y + 0.2)
      .project(pika.camera);
    expect(c.x).toBeCloseTo(0, 6);
    expect(c.y).toBeCloseTo(0, 6);
    pika.dispose();
    snorlax.dispose();
  });

  it('la cámara copia la orientación del móvil', () => {
    const s = new EncounterScene(0.4);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1);
    s.update(q);
    expect(s.camera.quaternion.angleTo(q)).toBeCloseTo(0, 6);
    s.dispose();
  });

  it('la sombra es una mancha: opaca en el centro y transparente en el borde', () => {
    const tex = blobTexture(9);
    const alpha = (x: number, y: number) => tex.image.data![(y * 9 + x) * 4 + 3];
    expect(alpha(4, 4)).toBe(127);
    expect(alpha(0, 4)).toBe(0);
    expect(alpha(2, 4)).toBeGreaterThan(0);
    tex.dispose();
  });

  it('la proporción del arte sale de la textura', () => {
    const s = new EncounterScene(0.4);
    s.setTexture(new THREE.Texture({ width: 512, height: 256 } as unknown as HTMLImageElement));
    expect(s.artAspect).toBe(2);
    s.dispose();
  });
});
```

- [ ] **3b.** `npx ng test --include=src/app/game/encounter-scene/encounter-scene.spec.ts --watch=false` → FALLA.
- [ ] **3c. Implementación** (ojo: `project()` usa la matriz de la cámara y `lookAt()` no la actualiza: por eso los
  `updateMatrixWorld()`):

```ts
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
```

- [ ] **3d.** → PASA (8 tests). Commit `F2-04a: escena del encuentro (Pokémon a tamaño real, sombra, sin AR)` + push.

### Paso 4 — El escenario (renderer y bucle)

Sin test unitario (WebGL no existe en jsdom): la página lo recibe por un token y en los tests le dan un doble.

**Files:** Create `src/app/game/encounter-scene/encounter-stage.ts`

- [ ] **4a.** Crear:

```ts
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
```

- [ ] **4b.** `npm run build` → compila. Commit `F2-04a: escenario del encuentro (un contexto WebGL que se suelta)` + push.

### Paso 5 — Cámara principal

**Files:** Create `src/app/services/ar/camera.service.ts`, Test `src/app/services/ar/camera.service.spec.ts`

- [ ] **5a. Test que falla** (el doble de `getUserMedia` abre el gran angular con `facingMode`, como el A36):

```ts
import { TestBed } from '@angular/core/testing';
import { CameraService, MEDIA_DEVICES } from './camera.service';

class FakeTrack {
  stopped = false;
  constructor(readonly deviceId: string) {}
  stop() {
    this.stopped = true;
  }
  getSettings() {
    return { deviceId: this.deviceId };
  }
}
const streamOf = (id: string) => {
  const track = new FakeTrack(id);
  return {
    track,
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream & {
    track: FakeTrack;
  };
};
const DEVICES = [
  { kind: 'videoinput', label: 'camera 1, facing front', deviceId: 'cam1' },
  { kind: 'videoinput', label: 'camera 2, facing back', deviceId: 'cam2' },
  { kind: 'videoinput', label: 'camera 0, facing back', deviceId: 'cam0' },
  { kind: 'audioinput', label: 'mic', deviceId: 'mic' },
] as MediaDeviceInfo[];

describe('CameraService', () => {
  let opened: (MediaStream & { track: FakeTrack })[];
  let media: { getUserMedia: ReturnType<typeof vi.fn>; enumerateDevices: ReturnType<typeof vi.fn> };

  const setup = (m: unknown = media) => {
    TestBed.configureTestingModule({ providers: [{ provide: MEDIA_DEVICES, useValue: m }] });
    return TestBed.inject(CameraService);
  };

  beforeEach(() => {
    localStorage.clear();
    opened = [];
    media = {
      // facingMode abre el gran angular, como en el A36 (D-045)
      getUserMedia: vi.fn(async (c: MediaStreamConstraints) => {
        const v = c.video as MediaTrackConstraints;
        const s = streamOf((v.deviceId as { exact: string } | undefined)?.exact ?? 'cam2');
        opened.push(s);
        return s;
      }),
      enumerateDevices: vi.fn(async () => DEVICES),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('la primera vez cambia del gran angular a la principal y la recuerda', async () => {
    const cam = setup();
    const s = (await cam.open()) as MediaStream & { track: FakeTrack };
    expect(s.track.deviceId).toBe('cam0');
    expect(opened[0].track.stopped).toBe(true); // el gran angular se soltó
    expect(cam.state()).toBe('on');
    expect(localStorage.getItem('pokecrud.camera.v1')).toBe('cam0');
  });

  it('las siguientes veces abre directa la guardada', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'cam0');
    const cam = setup();
    await cam.open();
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(media.enumerateDevices).not.toHaveBeenCalled();
  });

  it('si la guardada ya no existe, la olvida y elige otra vez', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'vieja');
    media.getUserMedia.mockRejectedValueOnce(new DOMException('no', 'OverconstrainedError'));
    const cam = setup();
    const s = (await cam.open()) as MediaStream & { track: FakeTrack };
    expect(s.track.deviceId).toBe('cam0');
  });

  it('permiso denegado → denied y null', async () => {
    media.getUserMedia.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    const cam = setup();
    expect(await cam.open()).toBeNull();
    expect(cam.state()).toBe('denied');
  });

  it('sin mediaDevices → unavailable', async () => {
    const cam = setup(null);
    expect(await cam.open()).toBeNull();
    expect(cam.state()).toBe('unavailable');
  });

  it('close suelta la cámara; cerrar mientras abre no deja ninguna encendida', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'cam0');
    const cam = setup();
    await cam.open();
    cam.close();
    expect(opened[0].track.stopped).toBe(true);
    expect(cam.state()).toBe('off');
    const pending = cam.open();
    cam.close();
    expect(await pending).toBeNull();
    expect(opened[1].track.stopped).toBe(true);
  });
});
```

- [ ] **5b.** `npx ng test --include=src/app/services/ar/camera.service.spec.ts --watch=false` → FALLA.
- [ ] **5c. Implementación:**

```ts
import { Injectable, InjectionToken, inject, signal } from '@angular/core';

/** `off` sin abrir · `starting` pidiendo · `on` con imagen · `denied` sin permiso · `unavailable` no hay / falló. */
export type CameraState = 'off' | 'starting' | 'on' | 'denied' | 'unavailable';

/** `navigator.mediaDevices` (token para los tests, D-016). null si el WebView no lo tiene. */
export const MEDIA_DEVICES = new InjectionToken<Pick<
  MediaDevices,
  'getUserMedia' | 'enumerateDevices'
> | null>('MEDIA_DEVICES', {
  providedIn: 'root',
  factory: () => (typeof navigator !== 'undefined' ? (navigator.mediaDevices ?? null) : null),
});

const KEY = 'pokecrud.camera.v1';

const loadId = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const saveId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: se elige otra vez la próxima */
  }
};
const stop = (s: MediaStream): void => s.getTracks().forEach((t) => t.stop());

/**
 * Cámara trasera PRINCIPAL para la AR (D-045). `facingMode: 'environment'` abre el gran angular en el Samsung A36, así
 * que la primera vez se abre con `facingMode` (para tener permiso y etiquetas), se busca la trasera de número menor
 * ("camera 0, facing back") y, si no era esa, se cambia; su `deviceId` se guarda y las siguientes veces se abre
 * directa. 720p a 30 fps. El permiso lo pide Capacitor (diálogo de Android); denegado → `denied`.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly media = inject(MEDIA_DEVICES);
  private readonly _state = signal<CameraState>('off');
  private stream: MediaStream | null = null;
  /** Cada apertura lleva su número: si se cierra (o se abre otra) antes de responder, la vieja se suelta. */
  private gen = 0;

  readonly state = this._state.asReadonly();

  async open(): Promise<MediaStream | null> {
    this.close();
    const gen = ++this.gen;
    if (!this.media?.getUserMedia) {
      this._state.set('unavailable');
      return null;
    }
    this._state.set('starting');
    const saved = loadId();
    try {
      let stream = await this.get(saved);
      if (gen !== this.gen) return this.discard(stream);
      if (!saved) {
        const main = await this.mainBackCamera();
        const opened = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        if (main && main !== opened) {
          stop(stream);
          stream = await this.get(main);
          if (gen !== this.gen) return this.discard(stream);
        }
        saveId(main ?? opened);
      }
      this.stream = stream;
      this._state.set('on');
      return stream;
    } catch (err) {
      if (gen !== this.gen) return null;
      const name = err instanceof DOMException ? err.name : '';
      if (saved && (name === 'OverconstrainedError' || name === 'NotFoundError')) {
        saveId(null); // la cámara guardada ya no existe (otro móvil, datos borrados): se elige otra vez
        return this.open();
      }
      console.warn('[camera]', name, err);
      this._state.set(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable',
      );
      return null;
    }
  }

  /** Suelta la cámara (al salir de la pantalla o pasar a segundo plano, D-045). */
  close(): void {
    this.gen++;
    if (this.stream) stop(this.stream);
    this.stream = null;
    if (this._state() === 'on' || this._state() === 'starting') this._state.set('off');
  }

  private get(deviceId: string | null): Promise<MediaStream> {
    return this.media!.getUserMedia({
      audio: false,
      video: {
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } }),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });
  }

  /** La trasera de número menor según la etiqueta ("camera 0, facing back"); undefined si no hay etiquetas. */
  private async mainBackCamera(): Promise<string | undefined> {
    const devices = await this.media!.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput' && /back/i.test(d.label))
      .map((d) => ({ n: Number(/(\d+)/.exec(d.label)?.[1] ?? 99), id: d.deviceId }))
      .sort((a, b) => a.n - b.n)[0]?.id;
  }

  private discard(stream: MediaStream): null {
    stop(stream);
    return null;
  }
}
```

- [ ] **5d.** → PASA (6 tests). Commit `F2-04a: CameraService (cámara trasera principal, D-045)` + push.

### Paso 6 — Orientación

**Files:** Create `src/app/services/ar/orientation.service.ts`, Test `orientation.service.spec.ts`

- [ ] **6a. Test que falla:**

```ts
import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';
import {
  ORIENTATION_SENSOR,
  OrientationService,
  type OrientationSensorLike,
} from './orientation.service';

/** Sensor falso: el test decide cuándo hay lectura o error. */
class FakeSensor extends EventTarget implements OrientationSensorLike {
  static last: FakeSensor | null = null;
  quaternion: number[] | null = null;
  started = false;
  stopped = false;
  constructor(readonly opts: { frequency: number; referenceFrame: string }) {
    super();
    FakeSensor.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  read(q: number[]) {
    this.quaternion = q;
    this.dispatchEvent(new Event('reading'));
  }
}

/** Cámara mirando al horizonte (−Z): el móvil de pie = 90° sobre el eje este. */
const UPRIGHT = (() => {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  return [q.x, q.y, q.z, q.w];
})();
const forward = (q: THREE.Quaternion) => new THREE.Vector3(0, 0, -1).applyQuaternion(q);
const later = () => performance.now() + 10_000;

describe('OrientationService', () => {
  const setup = (Sensor: unknown) => {
    TestBed.configureTestingModule({
      providers: [{ provide: ORIENTATION_SENSOR, useValue: Sensor }],
    });
    return TestBed.inject(OrientationService);
  };

  beforeEach(() => {
    FakeSensor.last = null;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('usa RelativeOrientationSensor a 60 Hz en el marco del móvil', () => {
    const o = setup(FakeSensor);
    o.start();
    expect(FakeSensor.last!.opts).toEqual({ frequency: 60, referenceFrame: 'device' });
    expect(FakeSensor.last!.started).toBe(true);
    expect(o.source()).toBe('sensor');
    expect(o.ready()).toBe(false);
    FakeSensor.last!.read(UPRIGHT);
    expect(o.ready()).toBe(true);
    const q = new THREE.Quaternion();
    expect(o.pose(later(), q)).toBe(true);
    expect(forward(q).distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0, 6);
    o.stop();
  });

  it('si el sensor falla pasa a deviceorientation', () => {
    const o = setup(FakeSensor);
    o.start();
    FakeSensor.last!.dispatchEvent(new Event('error'));
    expect(FakeSensor.last!.stopped).toBe(true);
    expect(o.source()).toBe('event');
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    const q = new THREE.Quaternion();
    expect(o.pose(later(), q)).toBe(true);
    expect(forward(q).distanceTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0, 6);
    o.stop();
  });

  it('sin la Generic Sensor API usa el evento; los eventos sin datos no cuentan', () => {
    const o = setup(null);
    o.start();
    expect(o.source()).toBe('event');
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: null, beta: null, gamma: null }),
    );
    expect(o.ready()).toBe(false);
    o.stop();
  });

  it('stop deja de escuchar y olvida la orientación', () => {
    const o = setup(null);
    o.start();
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    o.stop();
    window.dispatchEvent(
      Object.assign(new Event('deviceorientation'), { alpha: 0, beta: 90, gamma: 0 }),
    );
    expect(o.ready()).toBe(false);
    expect(o.pose(later(), new THREE.Quaternion())).toBe(false);
    expect(o.source()).toBe('none');
  });
});
```

- [ ] **6b.** `npx ng test --include=src/app/services/ar/orientation.service.spec.ts --watch=false` → FALLA.
- [ ] **6c. Implementación:**

```ts
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import * as THREE from 'three';

import { deviceEventQuaternion, sensorQuaternion } from '../../game/encounter-scene/device-pose';
import { PoseDelay } from '../../game/encounter-scene/pose-delay';

/** Lo mínimo de la Generic Sensor API (no está en lib.dom de TypeScript). */
export interface OrientationSensorLike extends EventTarget {
  quaternion?: ArrayLike<number> | null;
  start(): void;
  stop(): void;
}
export type OrientationSensorCtor = new (opts: {
  frequency: number;
  referenceFrame: 'device' | 'screen';
}) => OrientationSensorLike;

/** `RelativeOrientationSensor` del WebView (token para los tests, D-016); null si no existe. */
export const ORIENTATION_SENSOR = new InjectionToken<OrientationSensorCtor | null>(
  'ORIENTATION_SENSOR',
  {
    providedIn: 'root',
    factory: () =>
      (globalThis as { RelativeOrientationSensor?: OrientationSensorCtor })
        .RelativeOrientationSensor ?? null,
  },
);

/** El vídeo llega ~80 ms tarde respecto a los sensores en el A36: se retrasa la orientación lo mismo (D-045). */
export const ORIENTATION_DELAY_MS = 80;

export type OrientationSource = 'sensor' | 'event' | 'none';

const screenAngle = (): number =>
  (typeof screen !== 'undefined' ? screen.orientation?.angle : 0) ?? 0;

/**
 * Orientación del móvil para la AR (D-045): `RelativeOrientationSensor` a 60 Hz (más suave) y, si no existe o falla,
 * el evento `deviceorientation` (que deja de llegar con el móvil quieto: por eso se guarda la última). Solo
 * orientación: si el jugador camina, el Pokémon no se queda en su sitio.
 */
@Injectable({ providedIn: 'root' })
export class OrientationService {
  private readonly Sensor = inject(ORIENTATION_SENSOR);
  private readonly _source = signal<OrientationSource>('none');
  private readonly _ready = signal(false);
  private buffer = new PoseDelay();
  private sensor: OrientationSensorLike | null = null;
  private running = false;
  private readonly tmp = new THREE.Quaternion();

  /** De dónde sale la orientación ahora. */
  readonly source = this._source.asReadonly();
  /** Ya llegó al menos una lectura (si tras ~1,5 s sigue en false: sin giroscopio). */
  readonly ready = this._ready.asReadonly();

  start(): void {
    if (this.running) return;
    this.running = true;
    if (!this.Sensor) return this.useEvent();
    try {
      const sensor = new this.Sensor({ frequency: 60, referenceFrame: 'device' });
      sensor.addEventListener('reading', this.onReading);
      sensor.addEventListener('error', this.onSensorError);
      sensor.start();
      this.sensor = sensor;
      this._source.set('sensor');
    } catch (err) {
      console.warn('[orientation] RelativeOrientationSensor', err);
      this.useEvent();
    }
  }

  stop(): void {
    this.running = false;
    this.dropSensor();
    window.removeEventListener('deviceorientation', this.onEvent);
    this.buffer = new PoseDelay();
    this._source.set('none');
    this._ready.set(false);
  }

  /** Orientación de hace `ORIENTATION_DELAY_MS` (a la par del vídeo) en `out`; false si aún no hay ninguna. */
  pose(now: number, out: THREE.Quaternion): boolean {
    return this.buffer.sample(now - ORIENTATION_DELAY_MS, out);
  }

  private useEvent(): void {
    this.dropSensor();
    window.addEventListener('deviceorientation', this.onEvent);
    this._source.set('event');
  }

  private dropSensor(): void {
    if (!this.sensor) return;
    this.sensor.removeEventListener('reading', this.onReading);
    this.sensor.removeEventListener('error', this.onSensorError);
    this.sensor.stop();
    this.sensor = null;
  }

  private readonly onReading = () => {
    const q = this.sensor?.quaternion;
    if (q) this.push(sensorQuaternion(q, screenAngle(), this.tmp));
  };

  private readonly onSensorError = (e: Event) => {
    console.warn(
      '[orientation] RelativeOrientationSensor',
      (e as Event & { error?: unknown }).error,
    );
    if (this.running) this.useEvent();
  };

  private readonly onEvent = (e: Event) => {
    const { alpha, beta, gamma } = e as DeviceOrientationEvent;
    if (alpha === null || beta === null || gamma === null) return;
    this.push(deviceEventQuaternion(alpha, beta, gamma, screenAngle(), this.tmp));
  };

  private push(q: THREE.Quaternion): void {
    this.buffer.push(performance.now(), q);
    if (!this._ready()) this._ready.set(true);
  }
}
```

- [ ] **6d.** → PASA (4 tests). Commit `F2-04a: OrientationService (sensor → evento, 80 ms)` + push.

### Paso 7 — Abrir el encuentro desde el servidor

En F2-04a el servicio solo tiene `view()`; F2-05 lo amplía con `throw()` (paso 3 de F2-05).

**Files:** Create `src/app/services/game/encounter-api.service.ts`, Test `encounter-api.service.spec.ts`

- [ ] **7a. Test que falla:**

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { EncounterApiService } from './encounter-api.service';

describe('EncounterApiService', () => {
  let api: EncounterApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(EncounterApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('view pide el encuentro con el id codificado', async () => {
    const done = api.view('c1:99:0');
    http.expectOne(`${environment.serverUrl}/encounters/c1%3A99%3A0`).flush({ id: 'c1:99:0' });
    expect(await done).toEqual({ id: 'c1:99:0' });
  });
});
```

- [ ] **7b.** → FALLA. **7c. Implementación:**

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { EncounterView } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Como el resto de llamadas al servidor: Render gratis tarda ~1 min en despertar. */
export const ENCOUNTER_TIMEOUT_MS = 70_000;

/** Encuentro con el servidor (F2-04a: abrirlo; F2-05 añade `throw`). El servidor decide todo. */
@Injectable({ providedIn: 'root' })
export class EncounterApiService {
  private readonly http = inject(HttpClient);

  view(id: string): Promise<EncounterView> {
    return firstValueFrom(
      this.http.get<EncounterView>(this.url(id)).pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
    );
  }

  private url(id: string): string {
    return `${environment.serverUrl}/encounters/${encodeURIComponent(id)}`;
  }
}
```

- [ ] **7d.** → PASA (1 test). Commit `F2-04a: EncounterApiService.view` + push.

### Paso 8 — Ajuste "AR activada"

**Files:** Modify `src/app/services/game/settings.service.ts`, `settings.service.spec.ts`

- [ ] **8a.** Test (añadir `arEnabled: true` a lo esperado en "arranca con los valores por defecto") y código:

```diff
--- a/src/app/services/game/settings.service.spec.ts
+++ b/src/app/services/game/settings.service.spec.ts
@@ -16,6 +16,7 @@ describe('SettingsService', () => {
       reduceEffects: false,
       joystickMode: false,
       haptics: true,
+      arEnabled: true,
     });
   });
--- a/src/app/services/game/settings.service.ts
+++ b/src/app/services/game/settings.service.ts
@@ -7,6 +7,8 @@ export interface GameSettings {
   reduceEffects: boolean;
   joystickMode: boolean;
   haptics: boolean;
+  /** Encuentro con la cámara (AR). Apagada → fondo ilustrado y cámara quieta (DISENO §6, F2-04a). */
+  arEnabled: boolean;
 }
 
 const KEY = 'pokecrud.settings.v1';
@@ -17,6 +19,7 @@ const DEFAULTS: GameSettings = {
   reduceEffects: false,
   joystickMode: false,
   haptics: true,
+  arEnabled: true,
 };
 
 /** Preferencias del jugador (no sensibles) persistidas en localStorage. */
```

- [ ] **8b.** `npx ng test --include=src/app/services/game/settings.service.spec.ts --watch=false` → PASA (4). Commit + push.

### Paso 9 — Cabecera del encuentro

**Files:** Create `src/app/features/encounter/encounter-hud.component.ts`

- [ ] **9a.** Crear (la prueba la hace el spec de la página, paso 10):

```ts
import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/**
 * Cabecera del encuentro (F2-04a): huir (arriba a la izquierda), la placa del Pokémon (nombre, ✦ si es shiny, nivel,
 * XS/XL) y el interruptor de la AR. Solo pinta: la página decide.
 */
@Component({
  selector: 'app-encounter-hud',
  imports: [IonIcon, GlassPanelComponent],
  template: `
    <button type="button" class="btn" aria-label="Huir" (click)="flee.emit()">
      <ion-icon name="arrow-back" aria-hidden="true" />
    </button>
    <app-glass-panel class="tag">
      <span class="name"
        >{{ name() }}
        @if (shiny()) {
          <span class="shiny" aria-label="variocolor">✦</span>
        }
      </span>
      <span class="meta"
        >Nv. {{ level() }}
        @if (size(); as s) {
          <span class="size">{{ s }}</span>
        }
      </span>
    </app-glass-panel>
    <button
      type="button"
      class="btn btn--ar"
      [class.is-on]="ar()"
      [attr.aria-pressed]="ar()"
      aria-label="Realidad aumentada"
      (click)="toggleAr.emit()"
    >
      AR
    </button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--s-2);
    }
    .btn {
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font: 700 0.85rem/1 var(--font-display);
      box-shadow: var(--shadow-sm);
      transition: transform var(--dur-press) var(--ease-out);
    }
    .btn:active {
      transform: scale(0.94);
    }
    .btn--ar.is-on {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .tag {
      text-align: center;
      padding: var(--s-2) var(--s-4);
    }
    .name {
      display: block;
      font: 700 1.15rem/1.1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .shiny {
      color: var(--gold);
    }
    .meta {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
    }
    .size {
      margin-left: var(--s-1);
      padding: 0 var(--s-2);
      border-radius: var(--r-chip);
      background: var(--ink);
      color: var(--paper);
      font-weight: 700;
    }
  `,
})
export class EncounterHudComponent {
  readonly name = input.required<string>();
  readonly level = input.required<number>();
  readonly shiny = input(false);
  readonly size = input<'XS' | 'XL' | null>(null);
  readonly ar = input(true);
  readonly flee = output<void>();
  readonly toggleAr = output<void>();

  constructor() {
    addIcons({ arrowBack });
  }
}
```

### Paso 10 — La pantalla `/encuentro/:id`

Sustituye ENTERA la provisional de F1-07 (la ruta no cambia). Modos por fotograma: **AR** = hay imagen de la cámara
Y orientación → la cámara de la escena sigue al móvil; si no → cámara quieta mirando al Pokémon y fondo ilustrado con
el horizonte de la escena. Al pasar de un modo al otro el Pokémon se vuelve a poner delante.

**Files:** Modify (reescribir) `src/app/features/encounter/encounter.page.ts`, `encounter.page.spec.ts`

- [ ] **10a. Test que falla** (reescribir el spec entero; los dobles evitan WebGL, cámara y sensores):

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EncounterView } from '@shared/protocol/encounters';

import { CameraService, type CameraState } from '../../services/ar/camera.service';
import { OrientationService } from '../../services/ar/orientation.service';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { EncounterApiService } from '../../services/game/encounter-api.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SettingsService } from '../../services/game/settings.service';
import { ENCOUNTER_STAGE, EncounterPage, NO_GYRO_MS, encounterErrorText } from './encounter.page';

const view: EncounterView = {
  id: '12:34:5',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: false,
  heightScale: 1.45,
  expiresAt: '2026-10-12T20:10:00Z',
  status: 'open',
};

describe('encounterErrorText (D-028)', () => {
  it('cada error del servidor tiene su texto', () => {
    expect(encounterErrorText(403)).toBe('Estás demasiado lejos.');
    expect(encounterErrorText(410)).toBe('Se ha ido…');
    expect(encounterErrorText(409)).toBe('Ya lo intentaste.');
    expect(encounterErrorText(404)).toBe('Este Pokémon ya no está.');
    expect(encounterErrorText(undefined)).toContain('conexión');
  });
});

describe('EncounterPage', () => {
  const api = { view: vi.fn() };
  const playCry = vi.fn(() => Promise.resolve(true));
  const camState = signal<CameraState>('off');
  const camera = { state: camState, open: vi.fn(async () => null), close: vi.fn() };
  const orientation = { start: vi.fn(), stop: vi.fn(), pose: vi.fn(() => false) };
  const stage = {
    onFrame: null as ((now: number) => void) | null,
    start: vi.fn(),
    stop: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const createStage = vi.fn(() => stage);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    camState.set('off');
    stage.onFrame = null;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      imports: [EncounterPage],
      providers: [
        provideRouter([]),
        { provide: EncounterApiService, useValue: api },
        { provide: AudioService, useValue: { playCry } },
        // El plugin real de Capacitor no existe en web.
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        {
          provide: DatasetService,
          useValue: {
            load: () => Promise.resolve(),
            species: () =>
              new Map([[25, { names: { es: 'Pikachu' }, height: 4, types: ['electric'] }]]),
          },
        },
        { provide: CameraService, useValue: camera },
        { provide: OrientationService, useValue: orientation },
        { provide: ENCOUNTER_STAGE, useValue: createStage },
      ],
    });
  });

  const open = async (result: Promise<EncounterView>) => {
    api.view.mockReturnValueOnce(result);
    const f = TestBed.createComponent(EncounterPage);
    f.componentRef.setInput('id', '12:34:5');
    f.detectChanges();
    f.componentInstance.ionViewWillEnter();
    await settle(f);
    return f;
  };
  /** Deja correr las promesas (la API es un doble: Angular no las ve como tareas pendientes) y repinta. */
  const settle = async (f: { whenStable(): Promise<unknown> }) => {
    await new Promise((r) => setTimeout(r, 0));
    await f.whenStable();
  };
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('abre el encuentro: nombre, nivel, XL, grito, escena, sensores y cámara', async () => {
    const f = await open(Promise.resolve(view));
    expect(api.view).toHaveBeenCalledWith('12:34:5');
    expect(text(f)).toContain('Pikachu');
    expect(text(f)).toContain('Nv. 12');
    expect(text(f)).toContain('XL');
    expect(playCry).toHaveBeenCalledWith(25);
    expect(createStage).toHaveBeenCalledTimes(1);
    expect(stage.start).toHaveBeenCalled();
    expect(orientation.start).toHaveBeenCalled();
    expect(camera.open).toHaveBeenCalled();
  });

  it('un 403 dice que está demasiado lejos y no monta la escena', async () => {
    const f = await open(Promise.reject(new HttpErrorResponse({ status: 403 })));
    expect(text(f)).toContain('Estás demasiado lejos.');
    expect(createStage).not.toHaveBeenCalled();
  });

  it('si ya lo capturó, lo dice y no monta la escena', async () => {
    const f = await open(Promise.resolve({ ...view, status: 'caught' }));
    expect(text(f)).toContain('Ya lo atrapaste.');
    expect(createStage).not.toHaveBeenCalled();
  });

  it('al salir suelta cámara, sensores y bucle; al destruir, la GPU', async () => {
    const f = await open(Promise.resolve(view));
    f.componentInstance.ionViewWillLeave();
    expect(camera.close).toHaveBeenCalled();
    expect(orientation.stop).toHaveBeenCalled();
    expect(stage.stop).toHaveBeenCalled();
    f.destroy();
    expect(stage.dispose).toHaveBeenCalled();
  });

  it('apagar la AR lo guarda y suelta la cámara', async () => {
    const f = await open(Promise.resolve(view));
    camera.close.mockClear();
    (f.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Realidad aumentada"]')!
      .click();
    expect(TestBed.inject(SettingsService).settings().arEnabled).toBe(false);
    expect(camera.close).toHaveBeenCalled();
  });

  it('sin permiso de cámara o sin giroscopio lo explica', async () => {
    const f = await open(Promise.resolve(view));
    camState.set('denied');
    await settle(f);
    expect(text(f)).toContain('Sin permiso de cámara');
    camState.set('off');
    stage.onFrame!(performance.now() + NO_GYRO_MS + 100);
    await settle(f);
    expect(text(f)).toContain('Sin giroscopio');
  });
});
```

- [ ] **10b.** `npx ng test --include=src/app/features/encounter/encounter.page.spec.ts --watch=false` → FALLA.
- [ ] **10c. Implementación** (reescribir el archivo entero):

```ts
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
import type { EncounterView } from '@shared/protocol/encounters';
import * as THREE from 'three';

import { loadFirstTexture } from '../../game/encounter-scene/art-texture';
import { cameraYaw } from '../../game/encounter-scene/device-pose';
import { artUrls, pokemonHeightM, sizeClass } from '../../game/encounter-scene/encounter-layout';
import { EncounterScene } from '../../game/encounter-scene/encounter-scene';
import {
  EncounterStage,
  type EncounterStageLike,
} from '../../game/encounter-scene/encounter-stage';
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

/** Sin ninguna lectura de orientación en este tiempo → sin giroscopio: cámara quieta mirando al Pokémon. */
export const NO_GYRO_MS = 1500;

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
      >
        <video #video muted playsinline [hidden]="!streaming()"></video>
        <canvas #canvas></canvas>
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
  private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly phase = signal<Phase>('loading');
  protected readonly view = signal<EncounterView | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Hay imagen de la cámara (desde su primer fotograma: vacío, el WebView pinta un póster gris, D-045). */
  protected readonly streaming = signal(false);
  protected readonly noGyro = signal(false);
  /** Altura del horizonte del fondo ilustrado (la de la escena sin AR). */
  protected readonly horizon = signal('34%');
  protected readonly arOn = computed(() => this.settings.settings().arEnabled);
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
      const height = this.dataset.species().get(v.speciesId)?.height ?? 10;
      const world = new EncounterScene(pokemonHeightM(height, v.heightScale));
      this.world = world;
      this.stage = this.createStage(this.canvasEl().nativeElement, world);
      this.stage.onFrame = (now) => this.frame(now);
      this.watchSize();
      this.phase.set('ready');
      void this.audio.playCry(v.speciesId);
      void loadFirstTexture(artUrls(v.speciesId, v.shiny)).then((tex) => {
        if (tex && this.world === world) world.setTexture(tex);
        else tex?.dispose();
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
        world.aimAtPokemon();
        this.horizon.set(`${Math.round(world.horizonY() * 100)}%`);
      }
    }
    if (ar) {
      world.update(this.q);
    } else {
      world.aimAtPokemon();
      world.update(null);
    }
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
```

- [ ] **10d.** → PASA (7 tests). Commit `F2-04a: pantalla del encuentro en AR` + push.

### Paso 11 — Todo en verde

- [ ] **11a.** `npm run lint` · `npm run build` (sin avisos de presupuesto) · `npm test -- --watch=false` · `npm run test:shared`.
  Referencia al escribir el plan: lint OK, build OK, **62 archivos / 306 tests**.

### Paso 12 — Android (criterio)

- [ ] **12a.** `npm run apk -- --install`. Abrir un encuentro real (ver "Para abrir un encuentro" arriba).
- [ ] **12b.** Se ve la cámara **principal** (no deformada; en logcat/CDP no sale "camera 2"), el Pokémon en el suelo
  delante y quieto en el mundo al girar; Pikachu (0,4 m) parece de su tamaño a 2 m. Captura `F2-04a_01_*`.
- [ ] **12c.** fps durante 10 s sin tocar (CDP, en la consola del WebView):
  `await new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 10000 ? requestAnimationFrame(f) : r(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); })`
  → ≥ 55. Anotar en la bitácora.
- [ ] **12d.** Volver al mapa y entrar 3 veces: `adb logcat -d | grep -iE "context lost|robustness|gpu_snapshot"` vacío y el
  mapa sigue en 3D. Botón de inicio con el encuentro abierto → `adb shell dumpsys media.camera | grep -A1 "Active Camera Clients"` = `[]`.
- [ ] **12e.** AR apagada → fondo ilustrado con el horizonte a la altura del suelo de la escena (`F2-04a_02_*`).
  Permiso denegado (`adb shell pm revoke co.edu.fet.pokecrud android.permission.CAMERA`) → "Sin permiso de cámara: modo
  sin AR." y fondo ilustrado (`F2-04a_03_*`). Devolverlo: `adb shell pm grant co.edu.fet.pokecrud android.permission.CAMERA`.
- [ ] **12f.** REGLA 2: ROADMAP `[x]`, ESTADO, BITACORA (salida real), PR a `develop`.

