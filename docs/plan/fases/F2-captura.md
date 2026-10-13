# F2 · Encuentro en AR y captura — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP
> (`F2-04a`, `F2-04b`, `F2-05`, `F2-07`) = **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2.
> Marca las casillas `- [ ]` de TU tarea en TU rama según avances: son el punto de guardado del siguiente compañero.
> Los pasos de código siguen TDD: test que falla → código mínimo → test en verde → commit.
>
> **Qué está verificado (Kenneth, 2026-10-12, al escribir el plan):** TODO el código de este plan se escribió,
> se compiló y se probó capa a capa (F2-04a → F2-04b → F2-05 → F2-07) y después se borró: el plan es solo el plan.
> Estado F2-04a: **lint OK, build OK, 62 archivos / 306 tests**. Estado final (las cuatro tareas): **lint OK, build OK
> sin avisos de presupuesto, app 73 archivos / 393 tests, `shared/` 143, servidor compila y 22 tests**. Además, los
> diffs de este documento aplicados en orden sobre los archivos de F2-04a dan, byte a byte, ese estado final. Lo único
> que NO se ha probado es el móvil: eso es el criterio de cada tarea.

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

- [x] **1a. Test que falla:**

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

- [x] **1b.** `npx ng test --include=src/app/game/encounter-scene/encounter-layout.spec.ts --watch=false` → FALLA (no existe el módulo).
- [x] **1c. Implementación:**

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

- [x] **1d.** El mismo comando → PASA (4 tests).
- [x] **1e.** Commit `F2-04a: tamaño, distancia y arte del Pokémon del encuentro` + push (`/guardar`).

### Paso 2 — Cargar el arte (con su cadena de alternativas)

**Files:** Create `src/app/game/encounter-scene/art-texture.ts`, Test `art-texture.spec.ts`

- [x] **2a. Test que falla:**

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

- [x] **2b.** `npx ng test --include=src/app/game/encounter-scene/art-texture.spec.ts --watch=false` → FALLA.
- [x] **2c. Implementación:**

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

- [x] **2d.** → PASA (2 tests). Commit `F2-04a: carga del arte con alternativas` + push.

### Paso 3 — La escena three.js (sin renderer)

Como `MapScene`, la escena no crea el renderer: así se prueba en jsdom. Sin AR la cámara se queda **mirando al
Pokémon** (si mirara al horizonte, un Pikachu a 2 m quedaría por debajo de la pantalla) y `horizonY()` da la altura del
horizonte para que el fondo ilustrado coincida. La sombra es una `DataTexture` (sin canvas: D-038 y sin avisos de jsdom).

**Files:** Create `src/app/game/encounter-scene/encounter-scene.ts`, Test `encounter-scene.spec.ts`

- [x] **3a. Test que falla:**

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

- [x] **3b.** `npx ng test --include=src/app/game/encounter-scene/encounter-scene.spec.ts --watch=false` → FALLA.
- [x] **3c. Implementación** (ojo: `project()` usa la matriz de la cámara y `lookAt()` no la actualiza: por eso los
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

- [x] **3d.** → PASA (8 tests). Commit `F2-04a: escena del encuentro (Pokémon a tamaño real, sombra, sin AR)` + push.

### Paso 4 — El escenario (renderer y bucle)

Sin test unitario (WebGL no existe en jsdom): la página lo recibe por un token y en los tests le dan un doble.

**Files:** Create `src/app/game/encounter-scene/encounter-stage.ts`

- [x] **4a.** Crear:

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

- [x] **4b.** `npm run build` → compila. Commit `F2-04a: escenario del encuentro (un contexto WebGL que se suelta)` + push.

### Paso 5 — Cámara principal

**Files:** Create `src/app/services/ar/camera.service.ts`, Test `src/app/services/ar/camera.service.spec.ts`

- [x] **5a. Test que falla** (el doble de `getUserMedia` abre el gran angular con `facingMode`, como el A36):

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

- [x] **5b.** `npx ng test --include=src/app/services/ar/camera.service.spec.ts --watch=false` → FALLA.
- [x] **5c. Implementación:**

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

- [x] **5d.** → PASA (6 tests). Commit `F2-04a: CameraService (cámara trasera principal, D-045)` + push.

### Paso 6 — Orientación

**Files:** Create `src/app/services/ar/orientation.service.ts`, Test `orientation.service.spec.ts`

- [x] **6a. Test que falla:**

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

- [x] **6b.** `npx ng test --include=src/app/services/ar/orientation.service.spec.ts --watch=false` → FALLA.
- [x] **6c. Implementación:**

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

- [x] **6d.** → PASA (4 tests). Commit `F2-04a: OrientationService (sensor → evento, 80 ms)` + push.

### Paso 7 — Abrir el encuentro desde el servidor

En F2-04a el servicio solo tiene `view()`; F2-05 lo amplía con `throw()` (paso 3 de F2-05).

**Files:** Create `src/app/services/game/encounter-api.service.ts`, Test `encounter-api.service.spec.ts`

- [x] **7a. Test que falla:**

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

- [x] **7b.** → FALLA. **7c. Implementación:**

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

- [x] **7d.** → PASA (1 test). Commit `F2-04a: EncounterApiService.view` + push.

### Paso 8 — Ajuste "AR activada"

**Files:** Modify `src/app/services/game/settings.service.ts`, `settings.service.spec.ts`

- [x] **8a.** Test (añadir `arEnabled: true` a lo esperado en "arranca con los valores por defecto") y código:

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

- [x] **8b.** `npx ng test --include=src/app/services/game/settings.service.spec.ts --watch=false` → PASA (4). Commit + push.

### Paso 9 — Cabecera del encuentro

**Files:** Create `src/app/features/encounter/encounter-hud.component.ts`

- [x] **9a.** Crear (la prueba la hace el spec de la página, paso 10):

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

- [x] **10a. Test que falla** (reescribir el spec entero; los dobles evitan WebGL, cámara y sensores):

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

- [x] **10b.** `npx ng test --include=src/app/features/encounter/encounter.page.spec.ts --watch=false` → FALLA.
- [x] **10c. Implementación** (reescribir el archivo entero):

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

- [x] **10d.** → PASA (7 tests). Commit `F2-04a: pantalla del encuentro en AR` + push.

### Paso 11 — Todo en verde

- [x] **11a.** `npm run lint` · `npm run build` (sin avisos de presupuesto) · `npm test -- --watch=false` · `npm run test:shared`.
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

---

## F2-04b · Personalidad, efectos del tipo y entrada

**Criterio:** cada Pokémon se mueve según su ficha (VISION: "los rápidos esquivan más… Fantasma semitransparente…
Volador flota"): respira, se balancea si es esquivo, flota si tiene alas, salta de vez en cuando (más a menudo y más
alto si es rápido); partículas del color de su tipo (Fuego sube, Agua cae, Eléctrico chispea…); **entrada**: desde el
mapa el Pokémon crece hacia el centro, destello blanco, cae desde 1,5 m y aterriza con polvo, su grito completo y
vibración **en el mismo fotograma** (DISENO §4.10, §5); un shiny aterriza con destello dorado y su sonido. "Reducir
efectos" → sin partículas ni destellos. **Android:** ≥ 55 fps con partículas; vídeo de la entrada.

> El código de este bloque está verificado (lint, build y tests) sobre el estado de F2-04a.

### Paso 1 — Personalidad desde la ficha

**Files:** Create `src/app/game/encounter-scene/personality.ts`, Test `personality.spec.ts`

- [x] **1a. Test que falla:**

```ts
import type { Species } from '@shared/data/dataset.types';
import { personalityOf } from './personality';

const species = (patch: Partial<Species>): Species =>
  ({
    types: ['normal'],
    baseStats: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    captureRate: 255,
    isLegendary: false,
    isMythical: false,
    shape: 'quadruped',
    ...patch,
  }) as Species;

describe('personalityOf', () => {
  it('agility sale de la velocidad: 20 → 0, 150 → 1', () => {
    expect(
      personalityOf(species({ baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 20 } }))
        .agility,
    ).toBe(0);
    expect(
      personalityOf(species({ baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 150 } }))
        .agility,
    ).toBe(1);
  });

  it('skittish: fácil de capturar 0, legendario casi 1', () => {
    expect(personalityOf(species({ captureRate: 255 })).skittish).toBe(0);
    expect(personalityOf(species({ captureRate: 3, isLegendary: true })).skittish).toBe(1);
  });

  it('los alados flotan 0,6 m, los fantasma 0,3 m y son semitransparentes', () => {
    expect(personalityOf(species({ shape: 'wings' })).hover).toBe(0.6);
    expect(personalityOf(species({ shape: 'bug-wings' })).hover).toBe(0.6);
    const ghost = personalityOf(species({ types: ['ghost', 'poison'], shape: 'ball' }));
    expect(ghost.hover).toBe(0.3);
    expect(ghost.ghostly).toBe(true);
    expect(personalityOf(species({})).hover).toBe(0);
  });

  it('las partículas son del tipo principal', () => {
    expect(personalityOf(species({ types: ['water', 'flying'] })).fx).toBe('water');
  });
});
```

- [x] **1b.** `npx ng test --include=src/app/game/encounter-scene/personality.spec.ts --watch=false` → FALLA.
- [x] **1c. Implementación:**

```ts
import type { Species, TypeName } from '@shared/data/dataset.types';

/**
 * "Personalidad en la captura según la ficha" (VISION): cómo se mueve cada Pokémon en el encuentro (F2-04b). Solo
 * es visual: quién decide si se captura o huye es el servidor (D-027, D-028).
 */
export interface Personality {
  /** 0..1 por su velocidad base: los rápidos saltan más a menudo y más alto (y hacen fallar más lanzamientos). */
  agility: number;
  /** 0..1 por su ratio de captura (y legendario/mítico): los esquivos se mueven más inquietos. */
  skittish: number;
  /** Metros que flota sobre el suelo: los alados vuelan y los fantasma levitan un poco. */
  hover: number;
  /** Tipo Fantasma: semitransparente. */
  ghostly: boolean;
  /** Tipo de sus partículas (el principal). */
  fx: TypeName;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export function personalityOf(s: Species): Personality {
  const flying = s.shape === 'wings' || s.shape === 'bug-wings';
  const ghostly = s.types.includes('ghost');
  return {
    agility: clamp01((s.baseStats.spe - 20) / 130),
    skittish: clamp01(1 - s.captureRate / 255 + (s.isLegendary || s.isMythical ? 0.2 : 0)),
    hover: flying ? 0.6 : ghostly ? 0.3 : 0,
    ghostly,
    fx: s.types[0],
  };
}
```

- [x] **1d.** → PASA (4 tests). Commit `F2-04b: personalidad del Pokémon desde su ficha` + push.

### Paso 2 — Aterrizaje, respiración y saltos programados

Los saltos salen de una semilla (el id del encuentro): F2-05 resuelve un lanzamiento al soltar sabiendo dónde estará
el Pokémon cuando llegue la bola. **D-040:** nada de `velocidad × reloj`; aquí todo es función del tiempo del
encuentro, sin acumular.

**Files:** Create `src/app/game/encounter-scene/pokemon-motion.ts`, Test `pokemon-motion.spec.ts`

- [x] **2a. Test que falla:**

```ts
import {
  JUMP_MS,
  LAND_MS,
  TOUCHDOWN_MS,
  jumpSchedule,
  landingAt,
  motionAt,
} from './pokemon-motion';
import type { Personality } from './personality';

const calm: Personality = { agility: 0, skittish: 0, hover: 0, ghostly: false, fx: 'normal' };
const quick: Personality = { ...calm, agility: 1 };

describe('jumpSchedule', () => {
  it('misma semilla → mismos saltos, ordenados y ninguno durante el aterrizaje', () => {
    const a = jumpSchedule(42, 0.5, 60_000);
    expect(a).toEqual(jumpSchedule(42, 0.5, 60_000));
    expect(a[0]).toBeGreaterThan(2500);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
  });

  it('los rápidos saltan más a menudo', () => {
    expect(jumpSchedule(7, 1, 60_000).length).toBeGreaterThan(
      jumpSchedule(7, 0, 60_000).length * 1.8,
    );
  });
});

describe('motionAt', () => {
  it('quieto: en el suelo, respirando (±2,5 %)', () => {
    for (let t = 0; t < 2000; t += 100) {
      const f = motionAt(t, calm, [], 0.4);
      expect(f.lift).toBe(0);
      expect(f.jumping).toBe(false);
      expect(Math.abs(f.squash - 1)).toBeLessThanOrEqual(0.025 + 1e-9);
    }
  });

  it('los que vuelan flotan alrededor de su altura', () => {
    const f = motionAt(1000, { ...calm, hover: 0.6 }, [], 0.4);
    expect(f.lift).toBeGreaterThan(0.5);
    expect(f.lift).toBeLessThan(0.7);
  });

  it('a mitad del salto está en lo más alto; al acabar vuelve al suelo', () => {
    const mid = motionAt(5000 + JUMP_MS / 2, quick, [5000], 0.4);
    expect(mid.jumping).toBe(true);
    expect(mid.lift).toBeCloseTo((0.3 + 0.25 * 0.4) * 1.6, 6);
    expect(motionAt(5000 + JUMP_MS, quick, [5000], 0.4).jumping).toBe(false);
  });

  it('los rápidos saltan más alto', () => {
    const t = 5000 + JUMP_MS / 2;
    expect(motionAt(t, quick, [5000], 1).lift).toBeGreaterThan(motionAt(t, calm, [5000], 1).lift);
  });
});

describe('landingAt', () => {
  it('cae desde 1,5 m, toca el suelo en TOUCHDOWN_MS, se aplasta y acaba en LAND_MS', () => {
    expect(landingAt(0)).toEqual({ lift: 1.5, squash: 1.06 });
    expect(landingAt(TOUCHDOWN_MS - 1)!.lift).toBeLessThan(0.01);
    const squash = landingAt((TOUCHDOWN_MS + LAND_MS) / 2)!;
    expect(squash.lift).toBe(0);
    expect(squash.squash).toBeCloseTo(0.82, 6);
    expect(landingAt(LAND_MS)).toBeNull();
  });

  it('acaba antes del primer salto posible', () => {
    expect(LAND_MS).toBeLessThan(jumpSchedule(1, 1, 60_000)[0]);
  });
});
```

- [x] **2b.** → FALLA. **2c. Implementación:**

```ts
import { createRng } from '@shared/engine/rng';
import type { Personality } from './personality';

/**
 * Cómo se mueve el Pokémon en el encuentro (F2-04b): respira, se balancea si es inquieto, flota si vuela y salta de
 * vez en cuando (más a menudo y más alto si es rápido). Los saltos están programados con una semilla (el id del
 * encuentro): así un lanzamiento se resuelve al soltar sabiendo dónde estará el Pokémon al llegar (F2-05).
 * Funciones del tiempo, sin estado: el mismo instante da siempre la misma postura.
 */

export const JUMP_MS = 700;
/** Nunca salta en los primeros 2,5 s: es cuando aterriza (F2-04b). */
const FIRST_JUMP_MS = 2500;
const SCHEDULE_MS = 10 * 60_000;

/** Instantes (ms desde que empieza el encuentro) en que el Pokémon empieza a saltar, ordenados. */
export function jumpSchedule(seed: number, agility: number, untilMs = SCHEDULE_MS): number[] {
  const rng = createRng(seed);
  const mean = 6000 - 3500 * agility; // 6 s los tranquilos, 2,5 s los más rápidos
  const out: number[] = [];
  let t = FIRST_JUMP_MS;
  for (;;) {
    t += mean * (0.6 + 0.8 * rng.next());
    if (t > untilMs) return out;
    out.push(t);
  }
}

export interface MotionFrame {
  /** Metros sobre el suelo (vuelo + vaivén + salto). */
  lift: number;
  /** Escala vertical (respirar, agacharse al saltar); la horizontal es `2 − squash`. */
  squash: number;
  /** Inclinación en radianes. */
  lean: number;
  jumping: boolean;
}

export function motionAt(
  tMs: number,
  p: Personality,
  jumps: readonly number[],
  heightM: number,
): MotionFrame {
  const t = tMs / 1000;
  const bob = p.hover > 0 ? 0.06 * Math.sin(t * 1.7) : 0;
  const lean = (0.03 + 0.08 * p.skittish) * Math.sin(t * (1.1 + 1.5 * p.skittish));
  const start = activeJump(tMs, jumps);
  if (start === null) {
    return { lift: p.hover + bob, squash: 1 + 0.025 * Math.sin(t * 2.4), lean, jumping: false };
  }
  const k = (tMs - start) / JUMP_MS; // 0..1
  const height = (0.3 + 0.25 * heightM) * (0.6 + p.agility);
  const squash =
    k < 0.15 ? 1 - 0.15 * Math.sin((Math.PI * k) / 0.15) : 1 + 0.08 * Math.sin(Math.PI * k);
  return { lift: p.hover + bob + height * Math.sin(Math.PI * k), squash, lean, jumping: true };
}

/** Entrada (DISENO §5, "aterriza con polvo"): cae desde 1,5 m y se aplasta al tocar el suelo. */
export const LAND_MS = 700;
/** Instante (ms) en que toca el suelo: ahí van el polvo, el grito y la vibración. */
export const TOUCHDOWN_MS = 500;
const DROP_M = 1.5;

/** Postura durante la entrada (lift sobre su altura normal, y squash); null cuando ya aterrizó. */
export function landingAt(tMs: number): { lift: number; squash: number } | null {
  if (tMs >= LAND_MS) return null;
  if (tMs < TOUCHDOWN_MS) {
    const k = Math.max(0, tMs) / TOUCHDOWN_MS;
    return { lift: DROP_M * (1 - k * k), squash: 1.06 }; // cae acelerando, un poco estirado
  }
  const k = (tMs - TOUCHDOWN_MS) / (LAND_MS - TOUCHDOWN_MS);
  return { lift: 0, squash: 1 - 0.18 * Math.sin(Math.PI * k) }; // se aplasta y recupera
}

/** El salto en curso en `tMs` (búsqueda binaria del último que empezó), o null. */
function activeJump(tMs: number, jumps: readonly number[]): number | null {
  let lo = 0;
  let hi = jumps.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (jumps[mid] <= tMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 && tMs - jumps[found] < JUMP_MS ? jumps[found] : null;
}
```

- [x] **2d.** → PASA (8 tests). Commit `F2-04b: aterrizaje, respiración y saltos del Pokémon` + push.

### Paso 3 — Partículas por tipo

**Files:** Create `src/app/game/encounter-scene/type-fx.ts`, Test `type-fx.spec.ts`

- [x] **3a. Test que falla:**

```ts
import { FX_KIND, particleAt, type FxKind } from './type-fx';

const KINDS: FxKind[] = ['rise', 'fall', 'spark', 'orbit', 'drift'];

describe('type-fx', () => {
  it('todos los tipos tienen partículas', () => {
    expect(Object.keys(FX_KIND)).toHaveLength(18);
  });

  it('el fuego sube y el agua cae (misma partícula dentro de su vida)', () => {
    // s0 = 0, s1 = 0,5 → vida = 0,5·t: en t = 0,2 va por 0,1 y en t = 1 por 0,5
    expect(particleAt('rise', 0, 0.5, 0, 1, 1, 0.5).y).toBeGreaterThan(
      particleAt('rise', 0, 0.5, 0, 0.2, 1, 0.5).y,
    );
    expect(particleAt('fall', 0, 0.5, 0, 1, 1, 0.5).y).toBeLessThan(
      particleAt('fall', 0, 0.5, 0, 0.2, 1, 0.5).y,
    );
  });

  it('siempre cerca del Pokémon y con alfa en [0, 1]', () => {
    for (const kind of KINDS) {
      for (let i = 0; i < 50; i++) {
        const s = [((i * 37) % 100) / 100, ((i * 61) % 100) / 100, ((i * 13) % 100) / 100];
        for (let t = 0; t < 5; t += 0.37) {
          const p = particleAt(kind, s[0], s[1], s[2], t, 1.2, 0.5);
          expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(0.5 * 1.21);
          expect(p.y).toBeGreaterThanOrEqual(-0.11);
          expect(p.y).toBeLessThanOrEqual(1.2 * 1.3 + 0.31);
          expect(p.alpha).toBeGreaterThanOrEqual(0);
          expect(p.alpha).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('es determinista', () => {
    expect(particleAt('spark', 0.3, 0.6, 0.9, 2.5, 1, 0.5)).toEqual(
      particleAt('spark', 0.3, 0.6, 0.9, 2.5, 1, 0.5),
    );
  });
});
```

- [x] **3b.** → FALLA. **3c. Implementación:**

```ts
import type { TypeName } from '@shared/data/dataset.types';

/**
 * Partículas del encuentro según el tipo principal (DISENO §5, VISION: "Fuego deja partículas, Agua salpica…",
 * F2-04b). Posición de cada partícula en función del tiempo y de 3 semillas en [0, 1): sin estado, la escena solo
 * copia el resultado al búfer de `THREE.Points` cada fotograma. Metros respecto a los pies del Pokémon.
 */
export type FxKind = 'rise' | 'fall' | 'spark' | 'orbit' | 'drift';

export const FX_KIND: Readonly<Record<TypeName, FxKind>> = {
  fire: 'rise',
  dragon: 'rise',
  fighting: 'rise',
  water: 'fall',
  ice: 'fall',
  electric: 'spark',
  steel: 'spark',
  ghost: 'orbit',
  psychic: 'orbit',
  fairy: 'orbit',
  dark: 'orbit',
  poison: 'orbit',
  grass: 'drift',
  bug: 'drift',
  flying: 'drift',
  normal: 'drift',
  ground: 'drift',
  rock: 'drift',
};

export const FX_COUNT = 60;

export interface FxPoint {
  x: number;
  y: number;
  z: number;
  /** 0..1 */
  alpha: number;
}

const TAU = Math.PI * 2;
const fract = (n: number): number => n - Math.floor(n);

/** `s0..s2`: semillas de la partícula; `t` en segundos; `radius` ≈ medio ancho del Pokémon. */
export function particleAt(
  kind: FxKind,
  s0: number,
  s1: number,
  s2: number,
  t: number,
  heightM: number,
  radius: number,
  out: FxPoint = { x: 0, y: 0, z: 0, alpha: 0 },
): FxPoint {
  const life = fract(t * (0.3 + 0.4 * s1) + s0);
  let ang: number;
  let r: number;
  switch (kind) {
    case 'rise': // brasas que suben y se apagan
      ang = s2 * TAU + t * (0.4 + s0);
      r = radius * (0.5 + 0.5 * s1) * (1 - 0.4 * life);
      out.y = life * (heightM * 1.3 + 0.3);
      out.alpha = Math.sin(Math.PI * life);
      break;
    case 'fall': // gotas que caen alrededor
      ang = s2 * TAU;
      r = radius * (0.4 + 0.8 * s1);
      out.y = (1 - life) * (heightM * 1.2 + 0.4);
      out.alpha = Math.sin(Math.PI * life);
      break;
    case 'spark': {
      // chispas que saltan de sitio 12 veces por segundo y parpadean
      const tick = Math.floor(t * 12 + s0 * 12);
      const p = fract(Math.sin((tick + 1) * (s1 * 91.7 + s2 * 47.3 + 1)) * 43758.5453);
      ang = p * TAU;
      r = radius * 0.7;
      out.y = heightM * (0.2 + 0.7 * fract(p * 7.13));
      out.alpha = fract(t * 12 + s0 * 12) < 0.3 ? 1 : 0;
      break;
    }
    case 'orbit': // luces que dan vueltas despacio
      ang = s2 * TAU + t * (0.5 + 0.5 * s1);
      r = radius * (0.8 + 0.3 * s0);
      out.y = heightM * (0.2 + 0.8 * s1) + 0.1 * Math.sin(t * 2 + s0 * 6);
      out.alpha = 0.5 + 0.5 * Math.sin(t * 3 + s2 * 6);
      break;
    case 'drift': // hojas/polvo que caen balanceándose
      ang = s2 * TAU + 0.6 * Math.sin(t + s0 * 6);
      r = radius * (0.5 + 0.7 * s1);
      out.y = (1 - life) * (heightM + 0.5);
      out.alpha = 0.8 * Math.sin(Math.PI * life);
      break;
  }
  out.x = Math.cos(ang) * r;
  out.z = Math.sin(ang) * r;
  return out;
}
```

- [x] **3d.** → PASA (4 tests). Commit `F2-04b: partículas por tipo` + push.

### Paso 4 — Colores de los tokens para three.js

three.js no lee variables CSS: se lee el token al crear el material (lo usan la escena, la página y, en F2-05, la bola).

**Files:** Create `src/app/game/encounter-scene/css-color.ts`

- [x] **4a.** Crear (se prueba a través de `ball-mesh.spec.ts` en F2-05: en jsdom devuelve el valor escrito):

```ts
/**
 * Valor de un token CSS de DISENO §2 para three.js (que no lee variables CSS): `[token, valor]`; se usa el valor
 * escrito si no hay documento o el token no está definido (tests en jsdom).
 */
export function cssColor([token, fallback]: readonly [string, string]): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}
```

### Paso 5 — Partículas y ráfagas en la escena

Puntos redondos con una `DataTexture` (sin canvas, D-038) en mezcla aditiva: el color por partícula = color × alfa
(oscuro = transparente). Semillas fijas (nada de `Math.random`). `animate(tSec)` se llama cada fotograma.

**Files:** Modify `src/app/game/encounter-scene/encounter-scene.ts`, `encounter-scene.spec.ts`

- [x] **5a. Tests** (añadir al spec):

```diff
--- a/src/app/game/encounter-scene/encounter-scene.spec.ts
+++ b/src/app/game/encounter-scene/encounter-scene.spec.ts
@@ -1,6 +1,17 @@
 import * as THREE from 'three';
 import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
-import { EncounterScene, blobTexture } from './encounter-scene';
+import { BURST_COUNT, BURST_S, EncounterScene, blobTexture } from './encounter-scene';
+import { FX_COUNT } from './type-fx';
+
+const ys = (p: THREE.Points, n: number) =>
+  Array.from({ length: n }, (_, i) => p.geometry.getAttribute('position').getY(i));
+const radii = (p: THREE.Points, n: number) =>
+  Array.from({ length: n }, (_, i) =>
+    Math.hypot(
+      p.geometry.getAttribute('position').getX(i),
+      p.geometry.getAttribute('position').getZ(i),
+    ),
+  );
 
 describe('EncounterScene', () => {
   it('no se ve hasta colocarlo; colocado está en el suelo, delante, a su distancia', () => {
@@ -89,4 +100,47 @@
     expect(s.artAspect).toBe(2);
     s.dispose();
   });
+
+  it('partículas del tipo: ocultas hasta setFx, se mueven con animate y se apagan con null', () => {
+    const s = new EncounterScene(1);
+    expect(s.fx.visible).toBe(false);
+    s.setFx('rise', '#ee8130');
+    expect(s.fx.visible).toBe(true);
+    s.animate(0.2);
+    const before = ys(s.fx, FX_COUNT);
+    s.animate(0.9);
+    expect(ys(s.fx, FX_COUNT)).not.toEqual(before);
+    s.setFx(null);
+    expect(s.fx.visible).toBe(false);
+    s.dispose();
+  });
+
+  it('ráfaga de polvo: por el suelo, se abre y desaparece a los BURST_S', () => {
+    const s = new EncounterScene(1);
+    s.startBurst(1, '#ffffff', false);
+    s.animate(1.1);
+    expect(Math.max(...ys(s.burst, BURST_COUNT))).toBeLessThan(0.15);
+    const early = Math.max(...radii(s.burst, BURST_COUNT));
+    s.animate(1.6);
+    expect(Math.max(...radii(s.burst, BURST_COUNT))).toBeGreaterThan(early);
+    s.animate(1 + BURST_S + 0.01);
+    expect(s.burst.visible).toBe(false);
+    s.dispose();
+  });
+
+  it('destello shiny: las chispas suben por encima de medio cuerpo', () => {
+    const s = new EncounterScene(1);
+    s.startBurst(0, '#ffcb3d', true);
+    s.animate(0.6);
+    expect(Math.max(...ys(s.burst, BURST_COUNT))).toBeGreaterThan(0.5);
+    s.dispose();
+  });
+
+  it('el punto de luz de las partículas es blanco y opaco en el centro', () => {
+    const tex = blobTexture(9, 255, 255);
+    const at = (x: number, y: number, c: number) => tex.image.data![(y * 9 + x) * 4 + c];
+    expect([at(4, 4, 0), at(4, 4, 3)]).toEqual([255, 255]);
+    expect(at(0, 4, 3)).toBe(0);
+    tex.dispose();
+  });
 });
```

- [x] **5b.** → FALLAN (no existen `setFx`, `startBurst`, `animate`, `BURST_*`). **5c. Implementación:**

```diff
--- a/src/app/game/encounter-scene/encounter-scene.ts
+++ b/src/app/game/encounter-scene/encounter-scene.ts
@@ -2,6 +2,7 @@
 
 import { spotInFront } from './device-pose';
 import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
+import { FX_COUNT, particleAt, type FxKind, type FxPoint } from './type-fx';
 
 /** Postura del Pokémon en un fotograma (la da `motionAt` en F2-04b; quieto hasta entonces). */
 export interface PokemonPose {
@@ -16,6 +17,10 @@
 /** Campo de visión vertical calibrado en el A36 (D-045). */
 export const ENCOUNTER_FOV_DEG = 64;
 
+/** Puntos de una ráfaga (polvo al aterrizar, destello shiny; estrellas de la captura en F2-07). */
+export const BURST_COUNT = 28;
+export const BURST_S = 0.8;
+
 const horizon = new THREE.Vector3();
 
 /**
@@ -30,9 +35,20 @@
   readonly anchor = new THREE.Group();
   readonly body: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
   readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
+  /** Partículas del tipo, alrededor del Pokémon (F2-04b). */
+  readonly fx: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
+  /** Ráfaga: polvo por el suelo o chispas que suben (F2-04b; estrellas en F2-07). */
+  readonly burst: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
   private readonly shadowTex: THREE.Texture;
+  private readonly glowTex: THREE.Texture;
   private aspect = 1;
   private placed = false;
+  private fxKind: FxKind | null = null;
+  private readonly fxColor = new THREE.Color();
+  private readonly burstColor = new THREE.Color();
+  private burstStart = Number.NaN;
+  private burstUp = false;
+  private readonly pt: FxPoint = { x: 0, y: 0, z: 0, alpha: 0 };
 
   constructor(readonly heightM: number) {
     this.body = new THREE.Mesh(
@@ -46,7 +62,12 @@
       new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }),
     );
     this.shadow.position.y = 0.01;
-    this.anchor.add(this.shadow, this.body);
+    this.glowTex = blobTexture(32, 255, 255);
+    this.fx = glowPoints(FX_COUNT, 0.08, this.glowTex);
+    this.burst = glowPoints(BURST_COUNT, 0.12, this.glowTex);
+    this.fx.visible = false;
+    this.burst.visible = false;
+    this.anchor.add(this.shadow, this.body, this.fx, this.burst);
     this.anchor.visible = false;
     this.scene.add(this.anchor);
   }
@@ -124,7 +145,73 @@
     this.shadow.scale.setScalar(Math.max(0.35, this.heightM * 0.9) * (1 - away));
   }
 
+  /** Partículas del tipo (null = ninguna, p. ej. con "reducir efectos"). `color` CSS: '#rrggbb'. */
+  setFx(kind: FxKind | null, color = '#ffffff'): void {
+    this.fxKind = kind;
+    this.fxColor.set(color);
+    this.fx.visible = kind !== null;
+  }
+
+  /** Empieza una ráfaga en `tSec`: `up` = chispas que suben (shiny, estrellas); si no, polvo por el suelo. */
+  startBurst(tSec: number, color: string, up: boolean): void {
+    this.burstStart = tSec;
+    this.burstColor.set(color);
+    this.burstUp = up;
+    this.burst.visible = true;
+  }
+
+  /** Anima partículas y ráfaga; `tSec` = segundos desde que empezó el encuentro. */
+  animate(tSec: number): void {
+    const radius = Math.max(0.25, this.heightM * 0.45 * this.aspect);
+    if (this.fxKind) {
+      const pos = attr(this.fx, 'position');
+      const col = attr(this.fx, 'color');
+      const c = this.fxColor;
+      for (let i = 0; i < FX_COUNT; i++) {
+        const p = particleAt(
+          this.fxKind,
+          seed(i, 0),
+          seed(i, 1),
+          seed(i, 2),
+          tSec,
+          this.heightM,
+          radius,
+          this.pt,
+        );
+        pos.setXYZ(i, p.x, p.y, p.z);
+        col.setXYZ(i, c.r * p.alpha, c.g * p.alpha, c.b * p.alpha); // aditivo: oscuro = transparente
+      }
+      pos.needsUpdate = true;
+      col.needsUpdate = true;
+    }
+    if (!this.burst.visible) return;
+    const k = (tSec - this.burstStart) / BURST_S;
+    if (!(k >= 0 && k < 1)) {
+      this.burst.visible = false;
+      return;
+    }
+    const pos = attr(this.burst, 'position');
+    const col = attr(this.burst, 'color');
+    const c = this.burstColor;
+    for (let i = 0; i < BURST_COUNT; i++) {
+      const ang = (i / BURST_COUNT) * Math.PI * 2;
+      const r = radius * (0.3 + 1.2 * k) * (0.7 + 0.3 * seed(i, 1));
+      const y = this.burstUp
+        ? this.heightM * (0.2 + 1.1 * k * (0.5 + seed(i, 2)))
+        : 0.05 + 0.3 * k * (1 - k);
+      pos.setXYZ(i, Math.cos(ang) * r, y, Math.sin(ang) * r);
+      col.setXYZ(i, c.r * (1 - k), c.g * (1 - k), c.b * (1 - k));
+    }
+    pos.needsUpdate = true;
+    col.needsUpdate = true;
+  }
+
   dispose(): void {
+    for (const p of [this.fx, this.burst]) {
+      p.geometry.dispose();
+      p.material.dispose();
+    }
+    this.glowTex.dispose();
     this.body.geometry.dispose();
     this.body.material.map?.dispose();
     this.body.material.dispose();
@@ -135,19 +222,54 @@
 }
 
 /**
- * Mancha difuminada para la sombra, calculada en un array (sin canvas: ni otro contexto que cuente para el límite
- * del WebView, D-038, ni avisos de jsdom en los tests). Negro con alfa 0,5 en el centro → 0 en el borde.
+ * Mancha difuminada calculada en un array (sin canvas: ni otro contexto que cuente para el límite del WebView, D-038,
+ * ni avisos de jsdom en los tests). Por defecto la sombra: negro con alfa 0,5 en el centro → 0 en el borde; con
+ * `rgb` 255 y `maxAlpha` 255, el punto de luz redondo de las partículas.
  */
-export function blobTexture(size = 64): THREE.DataTexture {
+export function blobTexture(size = 64, rgb = 0, maxAlpha = 127): THREE.DataTexture {
   const data = new Uint8Array(size * size * 4);
   const c = (size - 1) / 2;
   for (let y = 0; y < size; y++) {
     for (let x = 0; x < size; x++) {
       const d = Math.min(1, Math.hypot(x - c, y - c) / c);
-      data[(y * size + x) * 4 + 3] = Math.round(127 * (1 - d) * (1 - d));
+      const i = (y * size + x) * 4;
+      data[i] = data[i + 1] = data[i + 2] = rgb;
+      data[i + 3] = Math.round(maxAlpha * (1 - d) * (1 - d));
     }
   }
   const tex = new THREE.DataTexture(data, size, size);
   tex.needsUpdate = true;
   return tex;
 }
+
+/** Semilla fija en [0, 1) de la partícula `i` (`k` = 0, 1, 2): sin Math.random, la escena es determinista. */
+function seed(i: number, k: number): number {
+  const x = Math.sin((i + 1) * (12.9898 + k * 78.233)) * 43758.5453;
+  return x - Math.floor(x);
+}
+
+function glowPoints(
+  n: number,
+  size: number,
+  map: THREE.Texture,
+): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
+  const g = new THREE.BufferGeometry();
+  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
+  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
+  const p = new THREE.Points(
+    g,
+    new THREE.PointsMaterial({
+      size,
+      map,
+      vertexColors: true,
+      transparent: true,
+      depthWrite: false,
+      blending: THREE.AdditiveBlending,
+    }),
+  );
+  p.frustumCulled = false;
+  return p;
+}
+
+const attr = (p: THREE.Points, name: string): THREE.BufferAttribute =>
+  p.geometry.getAttribute(name) as THREE.BufferAttribute;
```

- [x] **5d.** `npx ng test --include=src/app/game/encounter-scene/encounter-scene.spec.ts --watch=false` → PASA (12). Commit + push.

### Paso 6 — Sonidos de la entrada

**Files:** Modify `src/app/services/game/sfx-synth.ts` (su spec ya prueba TODAS las recetas: que suenen, no saturen y duren < 1 s)

- [x] **6a.** Añadir dentro de `SFX_RECIPES`, antes del `} satisfies …`:

```ts
  /** El Pokémon aterriza en el encuentro (F2-04b): golpe sordo con polvo. */
  land: [
    { wave: 'noise', from: 700, to: 200, start: 0, duration: 0.16, gain: 0.4, attack: 0.003 },
    { wave: 'sine', from: 120, to: 50, start: 0, duration: 0.26, gain: 0.6, attack: 0.004 },
  ],
  /** Aparece un shiny (F2-04b): tres destellos que suben. */
  shiny: [
    { wave: 'triangle', from: 1800, to: 2400, start: 0, duration: 0.12, gain: 0.22 },
    { wave: 'triangle', from: 2400, to: 3200, start: 0.1, duration: 0.15, gain: 0.22 },
    { wave: 'sine', from: 3200, to: 3600, start: 0.22, duration: 0.3, gain: 0.18, attack: 0.01 },
  ],
```

- [x] **6b.** `npx ng test --include=src/app/services/game/sfx-synth.spec.ts --watch=false` → PASA. Commit + push.
  **Ojo:** no llames a una receta `throw`: el spec de `AudioService` usa `'throw'` como sonido de ARCHIVO del catálogo y
  una receta con ese nombre le gana (por eso en F2-05 es `'ball-throw'`).

### Paso 7 — La página: postura, efectos, aterrizaje y destello

El grito pasa de "al abrir" a "al tocar el suelo" (DISENO §5). El reloj del encuentro (`startedAt`) NO se reinicia al
volver de segundo plano (si no, volvería a caer). Una ficha incompleta haría fallar `personalityOf`: el spec usa una
ficha falsa con todo lo que se lee.

**Files:** Modify `src/app/features/encounter/encounter.page.ts`, `encounter.page.spec.ts`

- [x] **7a. Tests:**

```diff
--- a/src/app/features/encounter/encounter.page.spec.ts
+++ b/src/app/features/encounter/encounter.page.spec.ts
@@ -24,6 +24,18 @@
   status: 'open',
 };
 
+/** Lo que la pantalla lee de la ficha (tamaño, tipo y personalidad). */
+const PIKACHU = {
+  names: { es: 'Pikachu' },
+  height: 4,
+  types: ['electric'],
+  baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
+  captureRate: 190,
+  shape: 'quadruped',
+  isLegendary: false,
+  isMythical: false,
+};
+
 describe('encounterErrorText (D-028)', () => {
   it('cada error del servidor tiene su texto', () => {
     expect(encounterErrorText(403)).toBe('Estás demasiado lejos.');
@@ -37,6 +49,7 @@
 describe('EncounterPage', () => {
   const api = { view: vi.fn() };
   const playCry = vi.fn(() => Promise.resolve(true));
+  const playSfx = vi.fn(() => Promise.resolve());
   const camState = signal<CameraState>('off');
   const camera = { state: camState, open: vi.fn(async () => null), close: vi.fn() };
   const orientation = { start: vi.fn(), stop: vi.fn(), pose: vi.fn(() => false) };
@@ -60,15 +73,14 @@
       providers: [
         provideRouter([]),
         { provide: EncounterApiService, useValue: api },
-        { provide: AudioService, useValue: { playCry } },
+        { provide: AudioService, useValue: { playCry, playSfx } },
         // El plugin real de Capacitor no existe en web.
         { provide: HapticsService, useValue: { tap: vi.fn() } },
         {
           provide: DatasetService,
           useValue: {
             load: () => Promise.resolve(),
-            species: () =>
-              new Map([[25, { names: { es: 'Pikachu' }, height: 4, types: ['electric'] }]]),
+            species: () => new Map([[25, PIKACHU]]),
           },
         },
         { provide: CameraService, useValue: camera },
@@ -94,19 +106,34 @@
   };
   const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';
 
-  it('abre el encuentro: nombre, nivel, XL, grito, escena, sensores y cámara', async () => {
+  it('abre el encuentro: nombre, nivel, XL, escena, sensores y cámara', async () => {
     const f = await open(Promise.resolve(view));
     expect(api.view).toHaveBeenCalledWith('12:34:5');
     expect(text(f)).toContain('Pikachu');
     expect(text(f)).toContain('Nv. 12');
     expect(text(f)).toContain('XL');
-    expect(playCry).toHaveBeenCalledWith(25);
     expect(createStage).toHaveBeenCalledTimes(1);
     expect(stage.start).toHaveBeenCalled();
     expect(orientation.start).toHaveBeenCalled();
     expect(camera.open).toHaveBeenCalled();
   });
 
+  it('al tocar el suelo (F2-04b): grito completo y golpe, una sola vez', async () => {
+    await open(Promise.resolve(view));
+    expect(playCry).not.toHaveBeenCalled();
+    stage.onFrame!(performance.now() + 600);
+    stage.onFrame!(performance.now() + 700);
+    expect(playCry).toHaveBeenCalledTimes(1);
+    expect(playCry).toHaveBeenCalledWith(25);
+    expect(playSfx).toHaveBeenCalledWith('land');
+  });
+
+  it('si es shiny suena su destello', async () => {
+    await open(Promise.resolve({ ...view, shiny: true }));
+    stage.onFrame!(performance.now() + 600);
+    expect(playSfx).toHaveBeenCalledWith('shiny');
+  });
+
   it('un 403 dice que está demasiado lejos y no monta la escena', async () => {
     const f = await open(Promise.reject(new HttpErrorResponse({ status: 403 })));
     expect(text(f)).toContain('Estás demasiado lejos.');
```

- [x] **7b.** → FALLAN. **7c. Implementación:**

```diff
--- a/src/app/features/encounter/encounter.page.ts
+++ b/src/app/features/encounter/encounter.page.ts
@@ -12,17 +12,27 @@
 } from '@angular/core';
 import { Router } from '@angular/router';
 import { IonContent } from '@ionic/angular';
+import { hashString } from '@shared/engine/rng';
 import type { EncounterView } from '@shared/protocol/encounters';
 import * as THREE from 'three';
 
 import { loadFirstTexture } from '../../game/encounter-scene/art-texture';
+import { cssColor } from '../../game/encounter-scene/css-color';
 import { cameraYaw } from '../../game/encounter-scene/device-pose';
 import { artUrls, pokemonHeightM, sizeClass } from '../../game/encounter-scene/encounter-layout';
-import { EncounterScene } from '../../game/encounter-scene/encounter-scene';
+import { EncounterScene, type PokemonPose } from '../../game/encounter-scene/encounter-scene';
 import {
   EncounterStage,
   type EncounterStageLike,
 } from '../../game/encounter-scene/encounter-stage';
+import { personalityOf, type Personality } from '../../game/encounter-scene/personality';
+import {
+  TOUCHDOWN_MS,
+  jumpSchedule,
+  landingAt,
+  motionAt,
+} from '../../game/encounter-scene/pokemon-motion';
+import { FX_KIND } from '../../game/encounter-scene/type-fx';
 import { CameraService } from '../../services/ar/camera.service';
 import { OrientationService } from '../../services/ar/orientation.service';
 import { AudioService } from '../../services/game/audio.service';
@@ -63,6 +73,12 @@
 
 type Phase = 'loading' | 'error' | 'resolved' | 'ready';
 
+/** Si la ficha no ha cargado: quieto, en el suelo, sin efectos raros. */
+const CALM: Personality = { agility: 0, skittish: 0, hover: 0, ghostly: false, fx: 'normal' };
+
+const prefersReducedMotion = (): boolean =>
+  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
+
 /**
  * Encuentro en AR (F2-04a, D-045): la cámara trasera principal de fondo y el Pokémon a su tamaño real anclado en el
  * suelo con el giroscopio, delante de donde se miraba al entrar. Sin cámara (permiso, AR apagada) o sin giroscopio:
@@ -82,6 +98,7 @@
       >
         <video #video muted playsinline [hidden]="!streaming()"></video>
         <canvas #canvas></canvas>
+        <div #flash class="flash" aria-hidden="true"></div>
       </div>
       <div class="layer">
         @switch (phase()) {
@@ -150,6 +167,13 @@
     video {
       object-fit: cover;
     }
+    .flash {
+      position: absolute;
+      inset: 0;
+      background: var(--paper);
+      opacity: 0;
+      pointer-events: none;
+    }
     .layer {
       position: absolute;
       inset: 0;
@@ -209,6 +233,7 @@
   private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
   private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');
   private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
+  private readonly flashEl = viewChild.required<ElementRef<HTMLElement>>('flash');
 
   protected readonly phase = signal<Phase>('loading');
   protected readonly view = signal<EncounterView | null>(null);
@@ -219,6 +244,10 @@
   /** Altura del horizonte del fondo ilustrado (la de la escena sin AR). */
   protected readonly horizon = signal('34%');
   protected readonly arOn = computed(() => this.settings.settings().arEnabled);
+  /** "Reducir efectos" (ajustes) o "reducir movimiento" (sistema): sin partículas ni destellos (D-033). */
+  private readonly reduce = computed(
+    () => this.settings.settings().reduceEffects || prefersReducedMotion(),
+  );
   private readonly species = computed(() => {
     const v = this.view();
     return v ? (this.dataset.species().get(v.speciesId) ?? null) : null;
@@ -252,6 +281,11 @@
   private arMode = false;
   private loadSeq = 0;
   private resizeObs?: ResizeObserver;
+  private personality: Personality = CALM;
+  private jumps: number[] = [];
+  /** Cuándo empezó el encuentro (ms): aterrizaje y saltos cuentan desde aquí; NO se reinicia al volver. */
+  private startedAt = 0;
+  private touchedDown = false;
 
   constructor() {
     document.addEventListener('visibilitychange', this.onVisibility);
@@ -310,14 +344,22 @@
         this.phase.set('resolved');
         return;
       }
-      const height = this.dataset.species().get(v.speciesId)?.height ?? 10;
-      const world = new EncounterScene(pokemonHeightM(height, v.heightScale));
+      const sp = this.dataset.species().get(v.speciesId);
+      const world = new EncounterScene(pokemonHeightM(sp?.height ?? 10, v.heightScale));
       this.world = world;
+      // Personalidad de su ficha (F2-04b): saltos con semilla = id del encuentro (siempre los mismos).
+      this.personality = sp ? personalityOf(sp) : CALM;
+      this.jumps = jumpSchedule(hashString(v.id), this.personality.agility);
+      if (this.personality.ghostly) world.setOpacity(0.7);
+      const type = sp?.types[0] ?? 'normal';
+      world.setFx(this.reduce() ? null : FX_KIND[type], cssColor([`--t-${type}`, '#ffffff']));
+      this.startedAt = performance.now();
+      this.touchedDown = false;
       this.stage = this.createStage(this.canvasEl().nativeElement, world);
       this.stage.onFrame = (now) => this.frame(now);
       this.watchSize();
       this.phase.set('ready');
-      void this.audio.playCry(v.speciesId);
+      this.flashIn();
       void loadFirstTexture(artUrls(v.speciesId, v.shiny)).then((tex) => {
         if (tex && this.world === world) world.setTexture(tex);
         else tex?.dispose();
@@ -370,12 +412,50 @@
         this.horizon.set(`${Math.round(world.horizonY() * 100)}%`);
       }
     }
+    const t = now - this.startedAt;
+    if (!this.touchedDown && t >= TOUCHDOWN_MS) this.touchdown(t);
+    const pose = this.poseAt(t, world.heightM);
     if (ar) {
-      world.update(this.q);
+      world.update(this.q, pose);
     } else {
       world.aimAtPokemon();
-      world.update(null);
+      world.update(null, pose);
     }
+    world.animate(t / 1000);
+  }
+
+  /** Postura en `t` ms del encuentro: cae al entrar y después se mueve según su ficha (F2-04b). */
+  private poseAt(t: number, heightM: number): PokemonPose {
+    const land = landingAt(t);
+    if (land) return { lift: this.personality.hover + land.lift, squash: land.squash, lean: 0 };
+    return motionAt(t, this.personality, this.jumps, heightM);
+  }
+
+  /** Toca el suelo (DISENO §5): polvo (o destello dorado si es shiny), su grito completo y vibración, a la vez. */
+  private touchdown(t: number): void {
+    this.touchedDown = true;
+    const v = this.view();
+    if (!v || !this.world) return;
+    if (!this.reduce()) {
+      this.world.startBurst(
+        t / 1000,
+        v.shiny ? cssColor(['--gold', '#ffcb3d']) : cssColor(['--paper-2', '#efe8d8']),
+        v.shiny,
+      );
+    }
+    void this.audio.playSfx(v.shiny ? 'shiny' : 'land');
+    void this.audio.playCry(v.speciesId);
+    this.haptics.tap();
+  }
+
+  /** Entra desde el mapa con un destello blanco que se va (continuidad con el zoom del mapa, DISENO §4.8). */
+  private flashIn(): void {
+    const el = this.flashEl().nativeElement;
+    if (this.reduce() || typeof el.animate !== 'function') return;
+    el.animate([{ opacity: 1 }, { opacity: 0 }], {
+      duration: 350,
+      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
+    });
   }
 
   private async openCamera(): Promise<void> {
```

- [x] **7d.** `npx ng test --include=src/app/features/encounter/encounter.page.spec.ts --watch=false` → PASA (9). Commit + push.

### Paso 8 — Del mapa al encuentro sin corte

`PokemonDom.elementOf(id)` y, en `MapPage.openEncounter`, una copia del Pokémon tocado vuela al centro y crece
mientras se manda la posición (a la vez: no añade espera). Con "reducir efectos/movimiento", sin animación.

**Files:** Modify `src/app/game/map-scene/pokemon-dom.ts`, `pokemon-dom.spec.ts`, `src/app/features/map/map.page.ts`

- [x] **8a.** Test de `elementOf` y código:

```diff
diff --git a/src/app/features/map/map.page.ts b/src/app/features/map/map.page.ts
index 1232fd5..6accebb 100644
--- a/src/app/features/map/map.page.ts
+++ b/src/app/features/map/map.page.ts
@@ -26,6 +26,7 @@ import { nearestN } from '../../game/map-scene/spawn-diff';
 import { AudioService } from '../../services/game/audio.service';
 import { BagService } from '../../services/game/bag.service';
 import { HapticsService } from '../../services/game/haptics.service';
+import { SettingsService } from '../../services/game/settings.service';
 import { SpawnFeedService } from '../../services/game/spawn-feed.service';
 import { CompassService } from '../../services/location/compass.service';
 import { DEFAULT_CENTER, LocationService } from '../../services/location/location.service';
@@ -185,6 +186,7 @@ export class MapPage implements ViewDidEnter, ViewWillLeave, OnDestroy {
   private readonly audio = inject(AudioService);
   private readonly haptics = inject(HapticsService);
   private readonly router = inject(Router);
+  private readonly settings = inject(SettingsService);
 
   protected readonly night = signal(isNightLocal(new Date()));
   /** Por qué no se pudo cargar Google Maps (la pantalla de estados lo muestra con "Reintentar"). */
@@ -556,13 +558,60 @@ export class MapPage implements ViewDidEnter, ViewWillLeave, OnDestroy {
     if (this.opening || !pos) return;
     this.opening = true;
     try {
-      await this.spawnFeed.reportPosition({ lat: pos.lat, lng: pos.lng });
+      await Promise.all([
+        this.spawnFeed.reportPosition({ lat: pos.lat, lng: pos.lng }),
+        this.zoomToEncounter(id),
+      ]);
       await this.router.navigateByUrl(`/encuentro/${encodeURIComponent(id)}`);
     } finally {
       this.opening = false;
     }
   }
 
+  /**
+   * Continuidad mapa → encuentro (DISENO §4.8, F2-04b): una copia del Pokémon tocado crece hacia el centro y se funde
+   * en blanco; el encuentro empieza con un destello blanco que se va. Sin animación con "reducir efectos/movimiento".
+   */
+  private async zoomToEncounter(id: string): Promise<void> {
+    const img = this.pokemonDom?.elementOf(id);
+    const reduce =
+      this.settings.settings().reduceEffects ||
+      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
+    if (!img || reduce || typeof img.animate !== 'function') return;
+    const r = img.getBoundingClientRect();
+    const ghost = img.cloneNode() as HTMLImageElement;
+    Object.assign(ghost.style, {
+      position: 'fixed',
+      left: `${r.left}px`,
+      top: `${r.top}px`,
+      width: `${r.width}px`,
+      height: `${r.height}px`,
+      transform: 'none',
+      zIndex: '1000',
+      pointerEvents: 'none',
+    });
+    document.body.append(ghost);
+    const dx = innerWidth / 2 - (r.left + r.width / 2);
+    const dy = innerHeight / 2 - (r.top + r.height / 2);
+    try {
+      await ghost.animate(
+        [
+          { transform: 'translate(0, 0) scale(1)', opacity: 1, filter: 'brightness(1)' },
+          {
+            transform: `translate(${dx}px, ${dy}px) scale(3)`,
+            opacity: 0,
+            filter: 'brightness(3)',
+          },
+        ],
+        { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
+      ).finished;
+    } catch {
+      // cancelada: da igual, se abre el encuentro
+    } finally {
+      ghost.remove();
+    }
+  }
+
   /** Dónde poner la cámara al crear el mapa: el avatar si ya hay posición, si no el centro por defecto. */
   private cameraCenter(): LatLng {
     const p = this.location.position();
diff --git a/src/app/game/map-scene/pokemon-dom.spec.ts b/src/app/game/map-scene/pokemon-dom.spec.ts
index dc56792..58f6526 100644
--- a/src/app/game/map-scene/pokemon-dom.spec.ts
+++ b/src/app/game/map-scene/pokemon-dom.spec.ts
@@ -48,6 +48,13 @@ describe('PokemonDom', () => {
 
   const imgs = () => [...box.querySelectorAll('img')];
 
+  it('elementOf: el <img> de ese Pokémon (o nada si no está)', () => {
+    const dom = new PokemonDom(box, () => undefined);
+    dom.render([vis()], mvp(), 400, 800);
+    expect(dom.elementOf('a')).toBe(imgs()[0]);
+    expect(dom.elementOf('zz')).toBeUndefined();
+  });
+
   it('un <img> por Pokémon, colocado con transform y su opacidad; se quita cuando se va', () => {
     const dom = new PokemonDom(box, () => undefined);
     dom.render([vis(), vis({ id: 'b', x: 5, opacity: 0.5 })], mvp(), 400, 800);
diff --git a/src/app/game/map-scene/pokemon-dom.ts b/src/app/game/map-scene/pokemon-dom.ts
index a35e8a7..bf29e9a 100644
--- a/src/app/game/map-scene/pokemon-dom.ts
+++ b/src/app/game/map-scene/pokemon-dom.ts
@@ -76,6 +76,11 @@ export class PokemonDom {
     }
   }
 
+  /** El `<img>` de un Pokémon (la transición al encuentro lo hace crecer, F2-04b). */
+  elementOf(id: string): HTMLImageElement | undefined {
+    return this.items.get(id)?.img;
+  }
+
   /** Sin la capa 3D (fuera del mapa, segundo plano): que no se queden flotando. */
   hideAll(): void {
     for (const { img } of this.items.values()) img.style.visibility = 'hidden';
```

- [x] **8b.** `npx ng test --include=src/app/game/map-scene/pokemon-dom.spec.ts --watch=false` → PASA. Commit + push.

### Paso 9 — Verde y Android

- [x] **9a.** `npm run lint` · `npm run build` · `npm test -- --watch=false` · `npm run test:shared` en verde.
- [ ] **9b.** Android: tocar un Pokémon en el mapa → crece hacia el centro → destello → cae y aterriza con polvo, grito
  y vibración a la vez. Un Volador/Bicho con alas flota; un Fantasma se ve semitransparente; un rápido (p. ej. Rattata)
  salta más a menudo que uno lento (Slowpoke). fps con partículas ≥ 55 (snippet del paso 12c de F2-04a). Vídeo
  corto con `adb shell screenrecord /sdcard/f204b.mp4` (Ctrl+C para parar; `adb pull`), evidencias `F2-04b_*`.
- [ ] **9c.** REGLA 2 y PR.

---

## F2-05 · Lanzamiento

**Criterio:** la Poké Ball se agarra en la mano y sigue al dedo 1:1 respetando dónde se agarró; al soltar hacia
arriba vuela con física (gravedad real, normalizada por distancia: el mismo gesto vale a 2 m y a 12 m), con **curva**
si antes se giró el dedo alrededor de la bola; el **aro de precisión** encoge una y otra vez con el color de la
probabilidad (verde/amarillo/naranja/rojo) y, si la bola entra dentro, "¡Bien! / ¡Genial! / ¡Excelente!"; se elige
Poké/Super/Ultra (con cuántas quedan) y Frambu; hápticos al agarrar, lanzar y golpear. **Si la bola no toca al
Pokémon no se llama al servidor y no se gasta nada (D-046).** Si toca, `POST /encounters/:id/throw` (reintento con el
mismo `clientThrowId`; si 403, manda la posición y reintenta una vez) y la mochila, la XP del HUD y el mapa se
actualizan con la respuesta. **Android:** lanzar recto acierta, flojo se queda corto, torcido falla; los saltos del
Pokémon rápido hacen fallar alguno; la mochila baja.

> Verificado (lint, build y tests de app, `shared/` y servidor) sobre el estado de F2-04b. Hasta F2-07, el resultado
> del servidor se enseña con un mensaje ("¡Capturado!", "Se escapó…"): la coreografía es F2-07.

### Paso 1 — Los tipos del lanzamiento, compartidos

El servidor los tenía en `encounters.service.ts`/`bag.service.ts`; pasan a `shared/protocol/encounters.ts` (como
`EncounterView` en F1-07) y el servidor los reexporta (sus imports no cambian). Solo tipos: el comportamiento no cambia.

**Files:** Modify `shared/protocol/encounters.ts`, `server/src/encounters/encounters.service.ts`,
`server/src/encounters/encounters.dto.ts`, `server/src/bag/bag.service.ts`

- [x] **1a.** Aplicar:

```diff
--- a/shared/protocol/encounters.ts
+++ b/shared/protocol/encounters.ts
@@ -1,3 +1,6 @@
+import type { BallId, BerryId, ThrowQuality } from '../engine/capture.js';
+import type { ItemId } from '../engine/items.js';
+
 /**
  * Respuesta de `GET /encounters/:id` (F2-06, contrato app↔servidor, ARQUITECTURA §2). `:id` es el id del spawn de
  * `GET /spawns`. Errores (D-028): 404 no existe, 410 su franja acabó, 403 el jugador está lejos, 409 ya resuelto.
@@ -13,3 +16,46 @@ export interface EncounterView {
   /** Si este jugador ya lo resolvió. */
   status: 'open' | 'caught' | 'fled';
 }
+
+/** La mochila entera (`GET /bag` y tras cada lanzamiento). */
+export interface BagView {
+  items: { item: ItemId; qty: number }[];
+}
+
+/** Cuerpo de `POST /encounters/:id/throw` (F2-05). */
+export interface ThrowRequest {
+  ball: BallId;
+  /** Baya usada en ESTE lanzamiento (se gasta aunque falle), o null/ausente. */
+  berry?: BerryId | null;
+  /** Lo que dice el cliente; el servidor puede rebajar un "excellent" inverosímil (D-028). */
+  throwQuality: ThrowQuality;
+  curve: boolean;
+  /** Id de ESTE lanzamiento: si se reintenta por la red, el mismo (no gasta otra bola). */
+  clientThrowId: string;
+}
+
+/** El Pokémon capturado (para la pantalla de "¡Capturado!", F2-07). Sin IVs. */
+export interface CaughtView {
+  id: string;
+  speciesId: number;
+  level: number;
+  gender: 'M' | 'F' | null;
+  shiny: boolean;
+  nature: string;
+  heightScale: number;
+  moves: number[];
+}
+
+/** Respuesta de `POST /encounters/:id/throw`. */
+export interface ThrowResult {
+  clientThrowId: string;
+  captured: boolean;
+  /** Sacudidas que se ven (0-3; 3 también si se captura). */
+  shakes: number;
+  fled: boolean;
+  /** Calidad con la que contó el servidor (puede ser menor que la pedida). */
+  throwQuality: ThrowQuality;
+  xpGained: number;
+  caught: CaughtView | null;
+  bag: BagView;
+}
--- a/server/src/encounters/encounters.service.ts
+++ b/server/src/encounters/encounters.service.ts
@@ -20,14 +20,18 @@ import {
   slotEndsAt,
   slotFor,
 } from '../../../shared/engine/spawns.js';
-import { BagService, type BagView } from '../bag/bag.service.js';
+import { BagService } from '../bag/bag.service.js';
 import { isUniqueViolation } from '../common/prisma-errors.js';
 import { Prisma } from '../generated/prisma/client.js';
 import { LocationService, distanceM } from '../location/location.service.js';
 import { PrismaService } from '../prisma/prisma.service.js';
 import { ProgressionService } from '../progression/progression.service.js';
 import { SpawnsService } from '../spawns/spawns.service.js';
-import type { EncounterView } from '../../../shared/protocol/encounters.js';
+import type {
+  CaughtView,
+  EncounterView,
+  ThrowResult,
+} from '../../../shared/protocol/encounters.js';
 import type { ThrowDto } from './encounters.dto.js';
 
 /**
@@ -62,31 +66,8 @@ const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 };
 const THROW_RETENTION_MS = 7 * 24 * 3600_000;
 const RESULT_RETENTION_MS = 24 * 3600_000;
 
-// El contrato vive en shared/protocol (lo usa también la app, F1-07); se reexporta para no cambiar los imports.
-export type { EncounterView };
-
-export interface CaughtView {
-  id: string;
-  speciesId: number;
-  level: number;
-  gender: 'M' | 'F' | null;
-  shiny: boolean;
-  nature: string;
-  heightScale: number;
-  moves: number[];
-}
-
-export interface ThrowResult {
-  clientThrowId: string;
-  captured: boolean;
-  shakes: number;
-  fled: boolean;
-  /** Calidad con la que contó el servidor (puede ser menor que la pedida). */
-  throwQuality: ThrowQuality;
-  xpGained: number;
-  caught: CaughtView | null;
-  bag: BagView;
-}
+// El contrato vive en shared/protocol (lo usa también la app, F1-07 y F2-05); se reexporta para no cambiar los imports.
+export type { CaughtView, EncounterView, ThrowResult };
 
 const caughtView = (c: {
   id: string;
--- a/server/src/encounters/encounters.dto.ts
+++ b/server/src/encounters/encounters.dto.ts
@@ -10,13 +10,14 @@ import type {
   BerryId,
   ThrowQuality,
 } from '../../../shared/engine/capture.js';
+import type { ThrowRequest } from '../../../shared/protocol/encounters.js';
 
 export const BALLS: BallId[] = ['POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL'];
 export const BERRIES: BerryId[] = ['RAZZ_BERRY'];
 export const QUALITIES: ThrowQuality[] = ['none', 'nice', 'great', 'excellent'];
 
 /** `POST /encounters/:id/throw`. Cualquier otro campo → 400 (forbidNonWhitelisted). */
-export class ThrowDto {
+export class ThrowDto implements ThrowRequest {
   @IsIn(BALLS)
   ball: BallId;
--- a/server/src/bag/bag.service.ts
+++ b/server/src/bag/bag.service.ts
@@ -4,11 +4,11 @@ import {
   type ItemId,
   STARTER_KIT,
 } from '../../../shared/engine/items.js';
+import type { BagView } from '../../../shared/protocol/encounters.js';
 import { PrismaService } from '../prisma/prisma.service.js';
 
-export interface BagView {
-  items: { item: ItemId; qty: number }[];
-}
+// El contrato vive en shared/protocol (lo usa también la app, F2-05).
+export type { BagView };
 
 /** Filas del kit inicial para `createMany` (registro y garantía de `get`). */
 export const starterRows = (): { item: ItemId; qty: number }[] =>
```

- [x] **1b.** `cd server && npm run lint && npm run build && npm test` → compila, 22 tests (el único aviso de lint,
  `require-array-sort-compare` en `test/auth.e2e-spec.ts`, ya estaba). Commit `F2-05: tipos del lanzamiento en shared/protocol` + push.

### Paso 2 — Lo que se actualiza con la respuesta

`BagService.apply` (la mochila entera que devuelve el servidor), `AuthService.addXp` (la XP que el servidor YA sumó,
para el HUD, con la misma curva `levelForXp`) y `SpawnFeedService.hide` (lo resuelto no se vuelve a pintar en el mapa:
los spawns no se guardan, D-025, y el servidor lo seguiría dando).

**Files:** Modify `src/app/services/game/bag.service.ts` (+ spec), `src/app/core/auth/auth.service.ts` (+ spec),
`src/app/services/game/spawn-feed.service.ts` (+ spec)

- [x] **2a. Tests:**

```diff
--- a/src/app/services/game/bag.service.spec.ts
+++ b/src/app/services/game/bag.service.spec.ts
@@ -57,6 +57,13 @@ describe('BagService', () => {
     expect(bag.error()).toBe('No se pudo cargar la mochila.');
   });
 
+  it('apply: la mochila que manda el servidor tras lanzar (lo que falta, a 0) y borra el error', () => {
+    bag.apply({ items: [{ item: 'POKE_BALL', qty: 29 }] });
+    expect(bag.qty()).toEqual({ POKE_BALL: 29, GREAT_BALL: 0, ULTRA_BALL: 0, RAZZ_BERRY: 0 });
+    expect(bag.balls()).toBe(29);
+    expect(bag.error()).toBeNull();
+  });
+
   it('al cambiar de jugador o cerrar sesión se vacía', async () => {
     await flushBag();
     player.set(null);
--- a/src/app/core/auth/auth.service.spec.ts
+++ b/src/app/core/auth/auth.service.spec.ts
@@ -80,6 +80,21 @@ describe('AuthService (app)', () => {
     expect(auth.isAdmin()).toBe(true);
   });
 
+  it('addXp: suma la XP que ya sumó el servidor y sube de nivel con la misma curva (F2-07)', async () => {
+    auth.addXp(100); // sin sesión no hace nada
+    expect(auth.player()).toBeNull();
+    const done = auth.login({ email: PLAYER.email, password: 'clave-segura-123' });
+    http
+      .expectOne(`${AUTH}/login`)
+      .flush({ accessToken: 'acc-1', refreshToken: 'ref-1', player: { ...PLAYER, xp: 900 } });
+    await done;
+    auth.addXp(160); // 1060 ≥ 1000 = nivel 2 (D-026: 500·(L−1)·L)
+    expect(auth.player()).toMatchObject({ xp: 1060, level: 2 });
+    auth.addXp(0);
+    auth.addXp(-5);
+    expect(auth.player()?.xp).toBe(1060);
+  });
+
   it('restore sin token guardado → anónimo y sin peticiones', async () => {
     await auth.restore();
     expect(auth.status()).toBe('anonymous');
--- a/src/app/services/game/spawn-feed.service.spec.ts
+++ b/src/app/services/game/spawn-feed.service.spec.ts
@@ -121,6 +121,22 @@ describe('SpawnFeedService', () => {
     expect(await done).toBe(false);
   });
 
+  it('hide: el resuelto deja de salir, también en las respuestas siguientes', async () => {
+    const two = body({
+      spawns: [
+        { id: 'a', speciesId: 25, lat: O.lat, lng: O.lng },
+        { id: 'b', speciesId: 1, lat: O.lat, lng: O.lng },
+      ],
+    });
+    await respond(feed.tick(O, T0), two);
+    feed.hide('a');
+    expect(feed.spawns().map((s) => s.id)).toEqual(['b']);
+    const again = feed.reportPosition(O, T0 + 1000);
+    http.expectOne((r) => r.url === url).flush(two);
+    await again;
+    expect(feed.spawns().map((s) => s.id)).toEqual(['b']);
+  });
+
   it('al cambiar de jugador se vacía', async () => {
     await respond(feed.tick(O, T0));
     player.set({ id: 'p2' });
```

- [x] **2b.** → FALLAN. **2c. Implementación:**

```diff
--- a/src/app/services/game/bag.service.ts
+++ b/src/app/services/game/bag.service.ts
@@ -1,6 +1,7 @@
 import { HttpClient } from '@angular/common/http';
 import { Injectable, computed, effect, inject, signal } from '@angular/core';
 import { ITEMS, type ItemId } from '@shared/engine/items';
+import type { BagView } from '@shared/protocol/encounters';
 import { firstValueFrom, timeout } from 'rxjs';
 import { environment } from '../../../environments/environment';
 import { AuthService } from '../../core/auth/auth.service';
@@ -39,21 +40,25 @@ export class BagService {
 
   async load(): Promise<void> {
     try {
-      const { items } = await firstValueFrom(
-        this.http
-          .get<{ items: { item: ItemId; qty: number }[] }>(`${environment.serverUrl}/bag`)
-          .pipe(timeout(BAG_TIMEOUT_MS)),
+      this.apply(
+        await firstValueFrom(
+          this.http.get<BagView>(`${environment.serverUrl}/bag`).pipe(timeout(BAG_TIMEOUT_MS)),
+        ),
       );
-      const qty = Object.fromEntries(ITEMS.map((i) => [i, 0])) as Record<ItemId, number>;
-      for (const { item, qty: n } of items) if (item in qty) qty[item] = n;
-      this._qty.set(qty);
-      this._error.set(null);
     } catch (err) {
       console.error('[bag] no se pudo cargar la mochila', err);
       this._error.set('No se pudo cargar la mochila.');
     }
   }
 
+  /** La mochila entera que manda el servidor (`GET /bag` o la respuesta de un lanzamiento, F2-05). */
+  apply(view: BagView): void {
+    const qty = Object.fromEntries(ITEMS.map((i) => [i, 0])) as Record<ItemId, number>;
+    for (const { item, qty: n } of view.items) if (item in qty) qty[item] = n;
+    this._qty.set(qty);
+    this._error.set(null);
+  }
+
   /** Al cerrar sesión: que el siguiente jugador no vea la mochila del anterior. */
   clear(): void {
     this._qty.set(null);
--- a/src/app/core/auth/auth.service.ts
+++ b/src/app/core/auth/auth.service.ts
@@ -1,5 +1,6 @@
 import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
 import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
+import { levelForXp } from '@shared/engine/progression';
 import { firstValueFrom, timeout } from 'rxjs';
 import { environment } from '../../../environments/environment';
 import { TOKEN_STORE } from './token-store';
@@ -88,6 +89,15 @@ export class AuthService {
     return this.accessToken;
   }
 
+  /**
+   * XP que el servidor YA sumó (respuesta de un lanzamiento, F2-07): se suma aquí para que el HUD la enseñe sin otra
+   * petición, con la misma curva que el servidor (`levelForXp`, D-026). Quien manda sigue siendo el servidor.
+   */
+  addXp(n: number): void {
+    if (!(n > 0)) return;
+    this._player.update((p) => (p ? { ...p, xp: p.xp + n, level: levelForXp(p.xp + n) } : p));
+  }
+
   async register(data: Registration): Promise<void> {
     await this.startSession(await this.post<AuthResult>('register', data));
   }
--- a/src/app/services/game/spawn-feed.service.ts
+++ b/src/app/services/game/spawn-feed.service.ts
@@ -1,5 +1,5 @@
 import { HttpClient, HttpErrorResponse } from '@angular/common/http';
-import { Injectable, effect, inject, signal } from '@angular/core';
+import { Injectable, computed, effect, inject, signal } from '@angular/core';
 import type { LatLng } from '@shared/engine/geo';
 import type { Weather } from '@shared/engine/spawns';
 import type { NearbySpawns, VisibleSpawn } from '@shared/protocol/spawns';
@@ -38,7 +38,14 @@ export class SpawnFeedService {
   /** La petición en vuelo (para que `reportPosition` no lance otra a la vez). */
   private pending: Promise<boolean> | null = null;
 
-  readonly spawns = this._spawns.asReadonly();
+  /** Ids que este jugador ya resolvió (capturado o huyó, F2-07): no se vuelven a pintar en el mapa. */
+  private readonly hidden = signal<ReadonlySet<string>>(new Set());
+
+  readonly spawns = computed(() => {
+    const hidden = this.hidden();
+    const all = this._spawns();
+    return hidden.size ? all.filter((s) => !hidden.has(s.id)) : all;
+  });
   readonly weather = this._weather.asReadonly();
   /** Noche según el servidor (la misma que decide los spawns); null hasta la primera respuesta. */
   readonly night = this._night.asReadonly();
@@ -117,9 +124,18 @@ export class SpawnFeedService {
     }
   }
 
+  /**
+   * Ya resuelto por este jugador (F2-07): fuera del mapa aunque el servidor lo siga dando (los spawns no se guardan,
+   * D-025). Los ids llevan la franja, así que no hace falta limpiarlos: los de franjas viejas ya no vuelven.
+   */
+  hide(id: string): void {
+    this.hidden.update((s) => new Set(s).add(id));
+  }
+
   /** Al cerrar sesión o cambiar de jugador. */
   clear(): void {
     this.state = emptyState();
+    this.hidden.set(new Set());
     this._spawns.set([]);
     this._weather.set(null);
     this._night.set(null);
```

- [x] **2d.** `npx ng test --include=src/app/services/game/bag.service.spec.ts --include=src/app/core/auth/auth.service.spec.ts --include=src/app/services/game/spawn-feed.service.spec.ts --watch=false`
  → PASA (4 + 14 + 9). Commit `F2-05: mochila, XP y mapa se actualizan tras lanzar` + push.

### Paso 3 — `EncounterApiService.throw`

Un id por lanzamiento (`crypto.randomUUID`); sin red o con 5xx, hasta 2 reintentos con el **mismo** id (el servidor no
gasta otra bola, D-028); 403 → manda la última posición (D-041) y lo intenta una vez más; 409 y el resto, al que llama.

**Files:** Modify (reescribir) `src/app/services/game/encounter-api.service.ts`, `encounter-api.service.spec.ts`

- [x] **3a. Test que falla** (reescribir el spec):

```ts
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ThrowResult } from '@shared/protocol/encounters';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LocationService } from '../location/location.service';
import { BagService } from './bag.service';
import {
  CLIENT_THROW_ID,
  EncounterApiService,
  THROW_RETRY_DELAY_MS,
} from './encounter-api.service';
import { SpawnFeedService } from './spawn-feed.service';

const ID = 'c1:99:0';
const URL = `${environment.serverUrl}/encounters/${encodeURIComponent(ID)}`;
const RESULT: ThrowResult = {
  clientThrowId: 'tid-1',
  captured: true,
  shakes: 3,
  fled: false,
  throwQuality: 'great',
  xpGained: 150,
  caught: null,
  bag: { items: [{ item: 'POKE_BALL', qty: 29 }] },
};
const REQ = {
  ball: 'POKE_BALL' as const,
  berry: null,
  throwQuality: 'great' as const,
  curve: false,
};

describe('EncounterApiService', () => {
  let api: EncounterApiService;
  let http: HttpTestingController;
  const bag = { apply: vi.fn() };
  const auth = { addXp: vi.fn(), player: signal({ id: 'p1' }) };
  const feed = { hide: vi.fn(), reportPosition: vi.fn(async () => true) };
  const position = signal<{ lat: number; lng: number } | null>({ lat: 2.9, lng: -75.3 });

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BagService, useValue: bag },
        { provide: AuthService, useValue: auth },
        { provide: SpawnFeedService, useValue: feed },
        { provide: LocationService, useValue: { position } },
        { provide: CLIENT_THROW_ID, useValue: () => 'tid-1' },
        { provide: THROW_RETRY_DELAY_MS, useValue: 0 },
      ],
    });
    api = TestBed.inject(EncounterApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** El siguiente POST de lanzamiento (puede salir tras un reintento asíncrono). */
  const nextThrow = () => vi.waitFor(() => http.expectOne({ method: 'POST', url: `${URL}/throw` }));

  it('view pide el encuentro con el id codificado', async () => {
    const done = api.view(ID);
    http.expectOne(URL).flush({ id: ID });
    expect(await done).toEqual({ id: ID });
  });

  it('throw manda el lanzamiento con su id y reparte la respuesta', async () => {
    const done = api.throw(ID, REQ);
    const req = await nextThrow();
    expect(req.request.body).toEqual({ ...REQ, clientThrowId: 'tid-1' });
    req.flush(RESULT);
    expect(await done).toEqual(RESULT);
    expect(bag.apply).toHaveBeenCalledWith(RESULT.bag);
    expect(auth.addXp).toHaveBeenCalledWith(150);
    expect(feed.hide).toHaveBeenCalledWith(ID);
  });

  it('si se escapa sin huir, el Pokémon sigue en el mapa', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).flush({ ...RESULT, captured: false, shakes: 1 });
    await done;
    expect(feed.hide).not.toHaveBeenCalled();
  });

  it('sin red reintenta con el MISMO clientThrowId', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).error(new ProgressEvent('error'));
    const again = await nextThrow();
    expect(again.request.body.clientThrowId).toBe('tid-1');
    again.flush(RESULT);
    expect((await done).captured).toBe(true);
  });

  it('tras 3 intentos con 5xx se rinde', async () => {
    const done = api.throw(ID, REQ);
    const failed = expect(done).rejects.toBeInstanceOf(HttpErrorResponse);
    for (let i = 0; i < 3; i++) {
      (await nextThrow()).flush('caído', { status: 502, statusText: 'Bad Gateway' });
    }
    await failed;
  });

  it('403 (lejos): manda la posición de ahora y lo intenta una vez más', async () => {
    const done = api.throw(ID, REQ);
    (await nextThrow()).flush({}, { status: 403, statusText: 'Forbidden' });
    const again = await nextThrow();
    expect(feed.reportPosition).toHaveBeenCalledWith({ lat: 2.9, lng: -75.3 });
    again.flush(RESULT);
    expect((await done).captured).toBe(true);
  });

  it('409 (sin bolas / ya resuelto) no se reintenta', async () => {
    const done = api.throw(ID, REQ);
    const failed = expect(done).rejects.toMatchObject({ status: 409 });
    (await nextThrow()).flush({}, { status: 409, statusText: 'Conflict' });
    await failed;
  });
});
```

- [x] **3b.** → FALLA. **3c. Implementación** (reescribir el archivo):

```ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import type { EncounterView, ThrowRequest, ThrowResult } from '@shared/protocol/encounters';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LocationService } from '../location/location.service';
import { BagService } from './bag.service';
import { SpawnFeedService } from './spawn-feed.service';

/** Como el resto de llamadas al servidor: Render gratis tarda ~1 min en despertar. */
export const ENCOUNTER_TIMEOUT_MS = 70_000;
/** Reintentos por fallo de red o 5xx, con el MISMO `clientThrowId`: el servidor no gasta otra bola (D-028). */
export const THROW_NETWORK_RETRIES = 2;

/** Id de cada lanzamiento (token para que los tests lo fijen). */
export const CLIENT_THROW_ID = new InjectionToken<() => string>('CLIENT_THROW_ID', {
  providedIn: 'root',
  factory: () => () => crypto.randomUUID(),
});
/** Espera entre reintentos (0 en los tests). */
export const THROW_RETRY_DELAY_MS = new InjectionToken<number>('THROW_RETRY_DELAY_MS', {
  providedIn: 'root',
  factory: () => 1500,
});

/**
 * Encuentro con el servidor (F2-04a: abrirlo; F2-05: lanzar). El servidor decide todo (captura, huida, gasto, XP);
 * aquí se reintenta sin gastar de más y se reparte la respuesta: mochila, XP del HUD y Pokémon fuera del mapa.
 */
@Injectable({ providedIn: 'root' })
export class EncounterApiService {
  private readonly http = inject(HttpClient);
  private readonly bag = inject(BagService);
  private readonly auth = inject(AuthService);
  private readonly feed = inject(SpawnFeedService);
  private readonly location = inject(LocationService);
  private readonly newThrowId = inject(CLIENT_THROW_ID);
  private readonly retryDelay = inject(THROW_RETRY_DELAY_MS);

  view(id: string): Promise<EncounterView> {
    return firstValueFrom(
      this.http.get<EncounterView>(this.url(id)).pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
    );
  }

  async throw(id: string, req: Omit<ThrowRequest, 'clientThrowId'>): Promise<ThrowResult> {
    const body: ThrowRequest = { ...req, clientThrowId: this.newThrowId() };
    let relocated = false;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await firstValueFrom(
          this.http
            .post<ThrowResult>(`${this.url(id)}/throw`, body)
            .pipe(timeout(ENCOUNTER_TIMEOUT_MS)),
        );
        this.bag.apply(res.bag);
        this.auth.addXp(res.xpGained);
        if (res.captured || res.fled) this.feed.hide(id);
        return res;
      } catch (err) {
        // Sin respuesta (red caída, timeout de rxjs) cuenta como 0.
        const status = err instanceof HttpErrorResponse ? err.status : 0;
        if (status === 403 && !relocated) {
          // Lejos o con la ubicación de hace > 5 min (D-028): se manda la de ahora y se prueba otra vez (D-041).
          relocated = true;
          const pos = this.location.position();
          if (pos && (await this.feed.reportPosition({ lat: pos.lat, lng: pos.lng }))) continue;
        }
        if ((status === 0 || status >= 500) && attempt < THROW_NETWORK_RETRIES) {
          await new Promise((r) => setTimeout(r, this.retryDelay));
          continue;
        }
        throw err;
      }
    }
  }

  private url(id: string): string {
    return `${environment.serverUrl}/encounters/${encodeURIComponent(id)}`;
  }
}
```

- [x] **3d.** → PASA (7). Commit `F2-05: EncounterApiService.throw (reintentos sin gastar de más)` + push.

### Paso 4 — El gesto

**Files:** Create `src/app/game/encounter-scene/throw-gesture.ts`, Test `throw-gesture.spec.ts`

- [x] **4a. Test que falla:**

```ts
import {
  MIN_FLICK_PX_S,
  REF_FLICK_PX_S,
  curveOf,
  releaseVelocity,
  spinAngle,
  swipeToThrow,
  type GestureSample,
} from './throw-gesture';

/** Un círculo de radio 40 px alrededor de (200, 700) en `n` muestras, `turns` vueltas (+ horario). */
const circle = (turns: number, n = 40): GestureSample[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * turns * 2 * Math.PI;
    return { x: 200 + 40 * Math.cos(a), y: 700 + 40 * Math.sin(a), t: i * 10 };
  });

describe('releaseVelocity', () => {
  it('usa solo los últimos 80 ms', () => {
    const s: GestureSample[] = [
      { x: 0, y: 800, t: 0 }, // lento al principio
      { x: 0, y: 790, t: 300 },
      { x: 0, y: 750, t: 340 },
      { x: 0, y: 700, t: 380 },
    ];
    // de t = 300 a 380: 90 px en 0,08 s
    expect(releaseVelocity(s)).toEqual({ vx: 0, vy: -1125 });
  });

  it('null con menos de dos muestras o sin tiempo', () => {
    expect(releaseVelocity([{ x: 0, y: 0, t: 0 }])).toBeNull();
    expect(
      releaseVelocity([
        { x: 0, y: 0, t: 5 },
        { x: 0, y: -10, t: 5 },
      ]),
    ).toBeNull();
  });
});

describe('curva', () => {
  it('una vuelta en sentido horario = curva 1; al revés −1', () => {
    expect(spinAngle(circle(1), 200, 700)).toBeCloseTo(2 * Math.PI, 6);
    expect(curveOf(circle(1), 200, 700)).toBe(1);
    expect(curveOf(circle(-1), 200, 700)).toBe(-1);
  });

  it('media vuelta no basta', () => {
    expect(curveOf(circle(0.5), 200, 700)).toBe(0);
  });
});

describe('swipeToThrow', () => {
  it('hacia abajo o muy lento no es un lanzamiento', () => {
    expect(swipeToThrow({ vx: 0, vy: 500 })).toBeNull();
    expect(swipeToThrow({ vx: 0, vy: -(MIN_FLICK_PX_S - 1) })).toBeNull();
  });

  it('recto y firme = potencia 1 y puntería 0', () => {
    expect(swipeToThrow({ vx: 0, vy: -REF_FLICK_PX_S })).toEqual({ power: 1, aim: 0 });
  });

  it('en diagonal apunta a ese lado (con tope de 45°) y la potencia sale de lo vertical', () => {
    const t = swipeToThrow({ vx: 900, vy: -900 })!;
    expect(t.aim).toBeCloseTo(Math.PI / 4, 6);
    expect(t.power).toBeCloseTo(0.5, 6);
    expect(swipeToThrow({ vx: 3000, vy: -400 })!.aim).toBeCloseTo(Math.PI / 4, 6);
  });
});
```

- [x] **4b.** → FALLA. **4c. Implementación:**

```ts
/**
 * Gesto de lanzar la Poké Ball (F2-05, DISENO §4.6): el dedo arrastra la bola 1:1 y al soltarla sale con la
 * velocidad de los últimos ~80 ms. Si antes de lanzar se hace girar la bola (casi una vuelta con el dedo alrededor de
 * ella), sale con efecto (curva, ×1,7 en la captura, D-027). Píxeles CSS y ms, con la Y de la pantalla hacia abajo.
 */
export interface GestureSample {
  x: number;
  y: number;
  t: number;
}

/** Velocidad al soltar, px/s (vy < 0 = hacia arriba). */
export interface Release {
  vx: number;
  vy: number;
}

export const RELEASE_WINDOW_MS = 80;
/** Por debajo de esto hacia arriba no es un lanzamiento: la bola vuelve a la mano. */
export const MIN_FLICK_PX_S = 350;
/** Un lanzamiento "firme" en un móvil: con esta velocidad la bola llega justo al centro del Pokémon. */
export const REF_FLICK_PX_S = 1800;
export const MAX_AIM_RAD = Math.PI / 4;
/** ~0,9 vueltas alrededor de la bola = con efecto. */
export const CURVE_MIN_SPIN_RAD = Math.PI * 1.8;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Velocidad entre la muestra más vieja de la ventana y la última; null si no hay movimiento medible. */
export function releaseVelocity(
  samples: readonly GestureSample[],
  windowMs = RELEASE_WINDOW_MS,
): Release | null {
  if (samples.length < 2) return null;
  const last = samples[samples.length - 1];
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0 && last.t - samples[i].t <= windowMs; i--)
    first = samples[i];
  const dt = (last.t - first.t) / 1000;
  if (dt < 0.008) return null;
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** Ángulo total (radianes, + = sentido horario en pantalla) que recorre el dedo alrededor de (cx, cy). */
export function spinAngle(samples: readonly GestureSample[], cx: number, cy: number): number {
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    let d =
      Math.atan2(samples[i].y - cy, samples[i].x - cx) -
      Math.atan2(samples[i - 1].y - cy, samples[i - 1].x - cx);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    total += d;
  }
  return total;
}

/** Sentido de la curva: 1 si giró en sentido horario (se abre a la derecha), −1 al revés, 0 sin efecto. */
export function curveOf(samples: readonly GestureSample[], cx: number, cy: number): -1 | 0 | 1 {
  const a = spinAngle(samples, cx, cy);
  if (Math.abs(a) < CURVE_MIN_SPIN_RAD) return 0;
  return a > 0 ? 1 : -1;
}

/** Potencia (1 = justo al centro) y puntería (radianes, + = derecha) del lanzamiento; null si no es hacia arriba. */
export function swipeToThrow(r: Release): { power: number; aim: number } | null {
  if (-r.vy < MIN_FLICK_PX_S) return null;
  return {
    power: clamp(-r.vy / REF_FLICK_PX_S, 0.3, 2),
    aim: clamp(Math.atan2(r.vx, -r.vy), -MAX_AIM_RAD, MAX_AIM_RAD),
  };
}
```

- [x] **4d.** → PASA (7). Commit `F2-05: gesto de lanzar (velocidad al soltar, curva)` + push.

### Paso 5 — La física del vuelo

**Files:** Create `src/app/game/encounter-scene/throw-physics.ts`, Test `throw-physics.spec.ts`

- [x] **5a. Test que falla:**

```ts
import { EYE_HEIGHT_M } from './encounter-layout';
import { flightPos, hitBox, planFlight, resolveFlight, type TargetBox } from './throw-physics';

const GROUND = -EYE_HEIGHT_M;

/** Pokémon de `heightM` delante a `d` metros, con los pies a `lift` metros del suelo. */
function target(heightM: number, d: number, lift = 0, lat = 0): TargetBox {
  return { fwd: d, lat, baseY: GROUND + lift, groundY: GROUND, ...hitBox(heightM, 1) };
}
const centerY = (b: TargetBox) => b.baseY + b.height / 2;

describe('throw-physics', () => {
  it('potencia 1 y recto: al centro del Pokémon, a 2 m y a 10 m', () => {
    for (const d of [2, 10]) {
      const box = target(0.4, d);
      const hit = resolveFlight(planFlight(1, 0, 0, d, centerY(box)), box);
      expect(hit.kind).toBe('hit');
      if (hit.kind === 'hit') {
        expect(hit.u).toBeCloseTo(0, 6);
        expect(hit.v).toBeCloseTo(0, 6);
      }
    }
  });

  it('flojo se queda corto (cae al suelo antes de llegar)', () => {
    const box = target(0.4, 2);
    const hit = resolveFlight(planFlight(0.5, 0, 0, 2, centerY(box)), box);
    expect(hit.kind).toBe('miss');
    if (hit.kind === 'miss') expect(hit.fwd).toBeLessThan(2);
  });

  it('demasiado fuerte pasa por encima de uno pequeño pero da en la cabeza de uno grande', () => {
    const small = target(0.4, 2);
    expect(resolveFlight(planFlight(1.6, 0, 0, 2, centerY(small)), small).kind).toBe('miss');
    const snorlax = target(2.1, 3.78);
    const hit = resolveFlight(planFlight(1.2, 0, 0, 3.78, centerY(snorlax)), snorlax);
    expect(hit.kind).toBe('hit');
    if (hit.kind === 'hit') expect(hit.v).toBeGreaterThan(0.5);
  });

  it('torcido 25° no le da a uno pequeño a 3 m', () => {
    const box = target(0.4, 3);
    expect(resolveFlight(planFlight(1, (25 * Math.PI) / 180, 0, 3, centerY(box)), box).kind).toBe(
      'miss',
    );
  });

  it('con efecto se abre a un lado y vuelve: llega al centro igual', () => {
    const box = target(0.4, 3);
    const f = planFlight(1, 0, 1, 3, centerY(box));
    expect(flightPos(f, f.tArrive / 2).lat).toBeCloseTo(0.6, 6);
    const hit = resolveFlight(f, box);
    expect(hit.kind).toBe('hit');
    if (hit.kind === 'hit') expect(hit.u).toBeCloseTo(0, 6);
  });

  it('si salta justo cuando llega la bola, la bola pasa por debajo', () => {
    const still = target(0.4, 2);
    const f = planFlight(1, 0, 0, 2, centerY(still));
    expect(resolveFlight(f, target(0.4, 2, 0.6)).kind).toBe('miss');
  });

  it('hitBox: los diminutos tienen una caja mínima', () => {
    expect(hitBox(0.1, 1)).toEqual({ height: 0.35, halfWidth: 0.18 });
    expect(hitBox(2, 1)).toEqual({ height: 2, halfWidth: 0.7 });
  });
});
```

- [x] **5b.** → FALLA. **5c. Implementación:**

```ts
/**
 * Vuelo de la Poké Ball (F2-05). Se calcula entero AL SOLTAR: dónde está el Pokémon cuando llegue la bola se sabe
 * (sus saltos están programados, `pokemon-motion.ts`), así que acierto/fallo y el punto de impacto se conocen ya y la
 * animación solo lo reproduce (y la petición al servidor sale antes, D-046).
 *
 * Marco del lanzamiento: `fwd` = metros hacia donde apuntaba el móvil (horizontal), `lat` = a su derecha, `up` =
 * altura respecto a la cámara (el suelo está en −EYE_HEIGHT_M). Gravedad real.
 *
 * Normalizado por distancia (como Pokémon GO): con potencia 1 y puntería 0 la bola llega al centro del Pokémon esté
 * a 2 m o a 12 m. Con más potencia pasa por encima; con menos se queda corta.
 */
export const GRAVITY = 9.8;
/** La bola en la mano: un poco por debajo de la cámara. */
export const HAND_Y = -0.35;
/** Cuánto se abre la bola con efecto antes de volver a su línea (llega al mismo sitio, con más bonus). */
export const CURVE_SWING_M = 0.6;
/** Caja mínima del Pokémon: a los diminutos (Joltik, 0,1 m) también se les puede dar. */
export const MIN_HALF_WIDTH_M = 0.18;
export const MIN_BOX_HEIGHT_M = 0.35;

export const flightTime = (distance: number): number => 0.55 + 0.06 * distance;

export interface Flight {
  /** m/s hacia delante, a la derecha y hacia arriba al salir. */
  vf: number;
  vl: number;
  vu: number;
  /** Segundos hasta recorrer la distancia del Pokémon. */
  tArrive: number;
  curve: -1 | 0 | 1;
  startY: number;
}

export function planFlight(
  power: number,
  aim: number,
  curve: -1 | 0 | 1,
  distance: number,
  targetY: number,
  startY = HAND_Y,
): Flight {
  const T = flightTime(distance);
  const vf = (distance / T) * power;
  const vu = ((targetY - startY + 0.5 * GRAVITY * T * T) / T) * power;
  return { vf, vl: vf * Math.tan(aim), vu, tArrive: distance / vf, curve, startY };
}

export interface FlightPos {
  fwd: number;
  lat: number;
  up: number;
}

export function flightPos(
  f: Flight,
  t: number,
  out: FlightPos = { fwd: 0, lat: 0, up: 0 },
): FlightPos {
  out.fwd = f.vf * t;
  out.lat = f.vl * t + f.curve * CURVE_SWING_M * Math.sin(Math.PI * Math.min(1, t / f.tArrive));
  out.up = f.startY + f.vu * t - 0.5 * GRAVITY * t * t;
  return out;
}

/** Caja del Pokémon en el marco del lanzamiento, en el instante en que llega la bola. */
export interface TargetBox {
  fwd: number;
  lat: number;
  /** Altura de sus pies (suelo + vuelo + salto). */
  baseY: number;
  height: number;
  halfWidth: number;
  groundY: number;
}

/** Caja de un Pokémon de `heightM` con arte de proporción `aspect` (ancho/alto), con mínimos para los pequeños. */
export const hitBox = (heightM: number, aspect: number): { height: number; halfWidth: number } => ({
  height: Math.max(MIN_BOX_HEIGHT_M, heightM),
  halfWidth: Math.max(MIN_HALF_WIDTH_M, 0.35 * heightM * aspect),
});

/** Acierto con el punto de impacto normalizado (u, v en [−1, 1] desde el centro de la caja) o fallo con dónde cae. */
export type ThrowHit =
  | { kind: 'hit'; t: number; u: number; v: number }
  | { kind: 'miss'; t: number; fwd: number; lat: number };

/** Segundos hasta que la bola cruza la distancia `fwd` (para saber dónde estará el Pokémon entonces). */
export const impactTime = (f: Flight, fwd: number): number => fwd / f.vf;

/** Segundos hasta que la bola toca el suelo. */
export function groundTime(f: Flight, groundY: number): number {
  const a = 0.5 * GRAVITY;
  return (f.vu + Math.sqrt(f.vu * f.vu + 4 * a * (f.startY - groundY))) / (2 * a);
}

export function resolveFlight(f: Flight, box: TargetBox): ThrowHit {
  const tg = groundTime(f, box.groundY);
  const th = impactTime(f, box.fwd);
  if (th < tg) {
    const p = flightPos(f, th);
    const u = (p.lat - box.lat) / box.halfWidth;
    const v = (p.up - (box.baseY + box.height / 2)) / (box.height / 2);
    if (Math.abs(u) <= 1 && Math.abs(v) <= 1) return { kind: 'hit', t: th, u, v };
  }
  const p = flightPos(f, tg);
  return { kind: 'miss', t: tg, fwd: p.fwd, lat: p.lat };
}
```

- [x] **5d.** → PASA (7). Commit `F2-05: física del vuelo y acierto` + push.

### Paso 6 — El aro de precisión

**Files:** Create `src/app/game/encounter-scene/precision-ring.ts`, Test `precision-ring.spec.ts`

- [x] **6a. Test que falla:**

```ts
import { RING_MIN, RING_PERIOD_MS, ringRadius, ringToken, throwQuality } from './precision-ring';

describe('precision-ring', () => {
  it('el aro encoge de 1 a RING_MIN y vuelve a empezar', () => {
    expect(ringRadius(0)).toBe(1);
    expect(ringRadius(RING_PERIOD_MS / 2)).toBeCloseTo((1 + RING_MIN) / 2, 6);
    expect(ringRadius(RING_PERIOD_MS - 1)).toBeCloseTo(RING_MIN, 2);
    expect(ringRadius(RING_PERIOD_MS)).toBe(1);
  });

  it('fuera del aro no hay bonus; dentro, mejor cuanto más pequeño', () => {
    expect(throwQuality(0.5, 0, 0.3)).toBe('none');
    expect(throwQuality(0.1, 0, 0.9)).toBe('nice');
    expect(throwQuality(0.1, 0, 0.5)).toBe('great');
    expect(throwQuality(0.1, 0.1, 0.3)).toBe('excellent');
  });

  it('el color sale de la probabilidad de captura', () => {
    expect(ringToken(0.8)).toBe('--success');
    expect(ringToken(0.4)).toBe('--gold');
    expect(ringToken(0.2)).toBe('--t-fire');
    expect(ringToken(0.05)).toBe('--danger');
  });
});
```

- [x] **6b.** → FALLA. **6c. Implementación:**

```ts
import type { ThrowQuality } from '@shared/engine/capture';

/**
 * Círculo de precisión (F2-05, ARQUITECTURA §6): un aro de color que encoge sobre el Pokémon una y otra vez. Si la
 * bola entra DENTRO del aro, cuanto más pequeño esté el aro en ese momento, mejor: Bien / Genial / Excelente. El
 * radio va en unidades de la caja del Pokémon (1 = toda la caja), igual que el punto de impacto (u, v) de
 * `throw-physics.ts`. El cliente solo lo propone: el servidor rebaja los "excelente" inverosímiles (D-028).
 */
export const RING_PERIOD_MS = 1600;
export const RING_MIN = 0.2;

/** Radio del aro en el instante `tMs`: de 1 a RING_MIN y vuelta a empezar. */
export function ringRadius(tMs: number): number {
  const k = (((tMs % RING_PERIOD_MS) + RING_PERIOD_MS) % RING_PERIOD_MS) / RING_PERIOD_MS;
  return 1 - (1 - RING_MIN) * k;
}

export function throwQuality(u: number, v: number, ring: number): ThrowQuality {
  if (Math.hypot(u, v) > ring) return 'none';
  if (ring > 0.7) return 'nice';
  if (ring > 0.4) return 'great';
  return 'excellent';
}

/** Color del aro por la probabilidad de captura (como Pokémon GO): token de DISENO §2. */
export function ringToken(chance: number): '--success' | '--gold' | '--t-fire' | '--danger' {
  if (chance >= 0.6) return '--success';
  if (chance >= 0.3) return '--gold';
  if (chance >= 0.15) return '--t-fire';
  return '--danger';
}

export const QUALITY_TEXT: Readonly<Record<ThrowQuality, string>> = {
  none: '',
  nice: '¡Bien!',
  great: '¡Genial!',
  excellent: '¡Excelente!',
};
```

- [x] **6d.** → PASA (3). Commit `F2-05: aro de precisión` + push.

### Paso 7 — La bola en 3D

**Files:** Create `src/app/game/encounter-scene/ball-mesh.ts`, Test `ball-mesh.spec.ts`

- [x] **7a. Test que falla:**

```ts
import * as THREE from 'three';
import { BALL_RADIUS_M, createBall, disposeBall } from './ball-mesh';

const topColor = (g: THREE.Group) =>
  ((g.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial).color.getHexString();

describe('createBall', () => {
  it('Poké Ball: arriba roja, abajo crema, franja y botón (sin banda)', () => {
    const g = createBall('POKE_BALL');
    expect(g.children).toHaveLength(4);
    expect(topColor(g)).toBe('ff4d4d');
    disposeBall(g);
  });

  it('Super y Ultra llevan banda y su color', () => {
    const great = createBall('GREAT_BALL');
    const ultra = createBall('ULTRA_BALL');
    expect(great.children).toHaveLength(5);
    expect(topColor(great)).toBe('6390f0');
    expect(topColor(ultra)).toBe('0f1a2b');
    disposeBall(great);
    disposeBall(ultra);
  });

  it('mide BALL_RADIUS_M de radio', () => {
    const box = new THREE.Box3().setFromObject(createBall('POKE_BALL'));
    expect(box.max.y).toBeCloseTo(BALL_RADIUS_M, 6);
  });
});
```

- [x] **7b.** → FALLA. **7c. Implementación:**

```ts
import type { BallId } from '@shared/engine/capture';
import * as THREE from 'three';

import { cssColor } from './css-color';

/** Radio de la bola en la escena: algo más grande que una de verdad para que se vea bien en el aire. */
export const BALL_RADIUS_M = 0.06;

/** Colores de cada bola: [token de DISENO §2, valor del token] (three.js no lee variables CSS: se leen al crearla). */
export const BALL_COLORS: Readonly<
  Record<BallId, { top: [string, string]; band: [string, string] | null }>
> = {
  POKE_BALL: { top: ['--accent', '#ff4d4d'], band: null },
  GREAT_BALL: { top: ['--t-water', '#6390f0'], band: ['--accent', '#ff4d4d'] },
  ULTRA_BALL: { top: ['--ink', '#0f1a2b'], band: ['--gold', '#ffcb3d'] },
};
const PAPER: [string, string] = ['--paper', '#fbf7ee'];
const INK: [string, string] = ['--ink', '#0f1a2b'];

const mat = (c: [string, string]) => new THREE.MeshLambertMaterial({ color: cssColor(c) });

/**
 * Poké/Super/Ultra Ball low-poly (F2-05): mitad de arriba del color de la bola, de abajo crema, franja oscura y
 * botón al frente (+Z); la Super y la Ultra con su banda. Necesita luz (la escena pone una hemisférica).
 */
export function createBall(id: BallId): THREE.Group {
  const r = BALL_RADIUS_M;
  const { top, band } = BALL_COLORS[id];
  const g = new THREE.Group();
  g.name = id;
  const half = (start: number, c: [string, string]) =>
    new THREE.Mesh(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, start, Math.PI / 2), mat(c));
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.12, 6, 24).rotateX(Math.PI / 2),
    mat(INK),
  );
  const button = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 16), mat(PAPER));
  button.position.z = r * 1.02;
  g.add(half(0, top), half(Math.PI / 2, PAPER), belt, button);
  if (band) {
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.72, r * 0.08, 6, 24).rotateX(Math.PI / 2),
      mat(band),
    );
    stripe.position.y = r * 0.7;
    g.add(stripe);
  }
  return g;
}

export function disposeBall(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}
```

- [x] **7d.** → PASA (3). Commit `F2-05: Poké/Super/Ultra Ball` + push.

### Paso 8 — Aro, bola y caja en la escena

El aro es una **elipse del tamaño de la caja** del Pokémon: lo que se ve es exactamente la zona que cuenta para la
calidad. `throwTarget(yaw, lift)` da la caja en el marco del lanzamiento. Una luz hemisférica solo para la bola (el
Pokémon y los aros son `MeshBasic`).

**Files:** Modify `src/app/game/encounter-scene/encounter-scene.ts`, `encounter-scene.spec.ts`

- [x] **8a. Tests:**

```diff
--- a/src/app/game/encounter-scene/encounter-scene.spec.ts
+++ b/src/app/game/encounter-scene/encounter-scene.spec.ts
@@ -143,4 +143,42 @@
     expect(at(0, 4, 3)).toBe(0);
     tex.dispose();
   });
+
+  it('throwTarget: el Pokémon en el marco del lanzamiento (delante / a la izquierda)', () => {
+    const s = new EncounterScene(0.4);
+    s.placeAt(Math.PI / 2); // a la izquierda, a 2 m
+    const ahead = s.throwTarget(Math.PI / 2, 0.3);
+    expect(ahead.fwd).toBeCloseTo(2, 6);
+    expect(ahead.lat).toBeCloseTo(0, 6);
+    expect(ahead.baseY).toBeCloseTo(-1.4 + 0.3, 6);
+    expect(ahead.height).toBe(0.4);
+    const side = s.throwTarget(0, 0); // lanzando hacia −Z, el Pokémon queda a la izquierda
+    expect(side.fwd).toBeCloseTo(0, 6);
+    expect(side.lat).toBeCloseTo(-2, 6);
+    s.dispose();
+  });
+
+  it('la bola vuela en el marco del lanzamiento', () => {
+    const s = new EncounterScene(0.4);
+    const ball = s.spawnBall('POKE_BALL');
+    s.setBallInThrowFrame(Math.PI / 2, { fwd: 1, lat: 0.5, up: -0.3 }, 0);
+    expect(ball.position.x).toBeCloseTo(-1, 6); // adelante = −X
+    expect(ball.position.z).toBeCloseTo(-0.5, 6); // derecha = −Z mirando a −X
+    expect(ball.position.y).toBeCloseTo(-0.3, 6);
+    s.removeBall();
+    expect(s.ball).toBeNull();
+    s.dispose();
+  });
+
+  it('el aro es la caja del Pokémon y el de color encoge con inner', () => {
+    const s = new EncounterScene(0.4);
+    s.setRing(true, '#ff0000');
+    s.updateRing(0.5, 0.5);
+    expect(s.ring.visible).toBe(true);
+    expect(s.ring.position.y).toBeCloseTo(0.5 + 0.2, 6);
+    const [outer, inner] = s.ring.children as THREE.Mesh[];
+    expect(outer.scale.y).toBeCloseTo(0.2, 6);
+    expect(inner.scale.x).toBeCloseTo(outer.scale.x / 2, 6);
+    s.dispose();
+  });
 });
```

- [x] **8b.** → FALLAN. **8c. Implementación:**

```diff
--- a/src/app/game/encounter-scene/encounter-scene.ts
+++ b/src/app/game/encounter-scene/encounter-scene.ts
@@ -1,7 +1,10 @@
+import type { BallId } from '@shared/engine/capture';
 import * as THREE from 'three';
 
+import { createBall, disposeBall } from './ball-mesh';
 import { spotInFront } from './device-pose';
 import { EYE_HEIGHT_M, encounterDistance } from './encounter-layout';
+import { hitBox, type FlightPos, type TargetBox } from './throw-physics';
 import { FX_COUNT, particleAt, type FxKind, type FxPoint } from './type-fx';
 
 /** Postura del Pokémon en un fotograma (la da `motionAt` en F2-04b; quieto hasta entonces). */
@@ -39,6 +42,12 @@
   readonly fx: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
   /** Ráfaga: polvo por el suelo o chispas que suben (F2-04b; estrellas en F2-07). */
   readonly burst: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
+  /** Aro de precisión sobre el Pokémon (F2-05): blanco fijo por fuera, de color y encogiendo por dentro. */
+  readonly ring = new THREE.Group();
+  /** La Poké Ball que vuela (F2-05); null mientras está en la mano (que es HTML). */
+  ball: THREE.Group | null = null;
+  private readonly ringOuter: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
+  private readonly ringInner: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
   private readonly shadowTex: THREE.Texture;
   private readonly glowTex: THREE.Texture;
   private aspect = 1;
@@ -67,9 +76,23 @@
     this.burst = glowPoints(BURST_COUNT, 0.12, this.glowTex);
     this.fx.visible = false;
     this.burst.visible = false;
-    this.anchor.add(this.shadow, this.body, this.fx, this.burst);
+    const ringMat = (color: number, opacity: number) =>
+      new THREE.MeshBasicMaterial({
+        color,
+        transparent: true,
+        opacity,
+        depthWrite: false,
+        depthTest: false,
+      });
+    this.ringOuter = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 48), ringMat(0xffffff, 0.85));
+    this.ringInner = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), ringMat(0x3ccf8e, 0.95));
+    this.ring.add(this.ringOuter, this.ringInner);
+    this.ring.renderOrder = 3;
+    this.ring.visible = false;
+    this.anchor.add(this.shadow, this.body, this.fx, this.burst, this.ring);
     this.anchor.visible = false;
-    this.scene.add(this.anchor);
+    // Luz solo para la bola (el Pokémon y los aros son MeshBasic: no les afecta).
+    this.scene.add(this.anchor, new THREE.HemisphereLight(0xffffff, 0x445566, 2.5));
   }
 
   get isPlaced(): boolean {
@@ -81,6 +104,11 @@
     return this.aspect;
   }
 
+  /** Caja del Pokémon para el lanzamiento (la misma que dibuja el aro). */
+  get box(): { height: number; halfWidth: number } {
+    return hitBox(this.heightM, this.aspect);
+  }
+
   /** Distancia a la que está (D-045: máx(2 m, 1,8 × altura), tope 12 m). */
   get distance(): number {
     return encounterDistance(this.heightM);
@@ -206,7 +234,68 @@
     col.needsUpdate = true;
   }
 
+  setRing(visible: boolean, color = '#3ccf8e'): void {
+    this.ring.visible = visible;
+    this.ringInner.material.color.set(color);
+  }
+
+  /**
+   * Aro centrado en la caja del Pokémon con los pies a `lift`; `inner` = radio del de color (`ringRadius`, 0..1).
+   * Es una elipse del tamaño de la caja: así lo que se ve es justo la zona que cuenta (`throwQuality`).
+   */
+  updateRing(lift: number, inner: number): void {
+    const { height, halfWidth } = this.box;
+    this.ring.position.set(0, lift + height / 2, 0.02);
+    this.ringOuter.scale.set(halfWidth, height / 2, 1);
+    this.ringInner.scale.set(halfWidth * inner, (height / 2) * inner, 1);
+  }
+
+  /** Caja del Pokémon en el marco de un lanzamiento hecho mirando a `yaw`, con los pies a `lift` (throw-physics). */
+  throwTarget(yaw: number, lift: number): TargetBox {
+    const p = this.anchor.position;
+    return {
+      fwd: -Math.sin(yaw) * p.x - Math.cos(yaw) * p.z,
+      lat: Math.cos(yaw) * p.x - Math.sin(yaw) * p.z,
+      baseY: p.y + lift,
+      groundY: -EYE_HEIGHT_M,
+      ...this.box,
+    };
+  }
+
+  /** Saca a la escena una bola nueva (la de la mano es HTML); si había otra, se tira. */
+  spawnBall(id: BallId): THREE.Group {
+    this.removeBall();
+    this.ball = createBall(id);
+    this.scene.add(this.ball);
+    return this.ball;
+  }
+
+  removeBall(): void {
+    if (!this.ball) return;
+    this.scene.remove(this.ball);
+    disposeBall(this.ball);
+    this.ball = null;
+  }
+
+  /** Bola en un punto del vuelo (marco del lanzamiento hecho mirando a `yaw`), girando `spin` rad hacia delante. */
+  setBallInThrowFrame(yaw: number, p: FlightPos, spin: number): void {
+    if (!this.ball) return;
+    const fx = -Math.sin(yaw);
+    const fz = -Math.cos(yaw);
+    this.ball.position.set(
+      fx * p.fwd + Math.cos(yaw) * p.lat,
+      p.up,
+      fz * p.fwd - Math.sin(yaw) * p.lat,
+    );
+    this.ball.rotation.set(-spin, 0, 0);
+  }
+
   dispose(): void {
+    this.removeBall();
+    for (const m of [this.ringOuter, this.ringInner]) {
+      m.geometry.dispose();
+      m.material.dispose();
+    }
     for (const p of [this.fx, this.burst]) {
       p.geometry.dispose();
       p.material.dispose();
```

- [x] **8d.** → PASA (15). Commit + push.

### Paso 9 — Sonidos del lanzamiento

- [x] **9a.** En `SFX_RECIPES` (`sfx-synth.ts`):

```ts
  /** Lanzar la bola (F2-05): soplido de aire. ("throw" NO: es un sonido de archivo en el spec de AudioService.) */
  'ball-throw': [
    { wave: 'noise', from: 800, to: 4000, start: 0, duration: 0.25, gain: 0.3, attack: 0.05 },
  ],
  /** La bola golpea al Pokémon (F2-05): "pop". */
  'ball-hit': [
    { wave: 'square', from: 900, to: 300, start: 0, duration: 0.07, gain: 0.2, attack: 0.002 },
    { wave: 'noise', from: 3000, to: 800, start: 0, duration: 0.06, gain: 0.3, attack: 0.001 },
  ],
```

- [x] **9b.** `npx ng test --include=src/app/services/game/sfx-synth.spec.ts --watch=false` → PASA. Commit + push.

### Paso 10 — La mano: bola y baya

Componente aparte (gesto y estilos fuera de la página: presupuesto de 2-4 kB por componente). La bola en la mano es
HTML (un círculo con los colores de los tokens); la que vuela, 3D.

**Files:** Create `src/app/features/encounter/throw-dock.component.ts`, Test `throw-dock.component.spec.ts`

- [x] **10a. Test que falla** (jsdom no tiene `PointerEvent`: `MouseEvent` con el nombre del evento y el `timeStamp` fijado):

```ts
import { TestBed } from '@angular/core/testing';
import { ThrowDockComponent, type ThrowIntent } from './throw-dock.component';

/** Evento de puntero con la hora que diga el test (jsdom no tiene PointerEvent y su timeStamp es "ahora"). */
function pointer(type: string, x: number, y: number, t: number): Event {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  return e;
}

describe('ThrowDockComponent', () => {
  const setup = (inputs: Record<string, unknown> = {}) => {
    const f = TestBed.createComponent(ThrowDockComponent);
    f.componentRef.setInput('ball', 'POKE_BALL');
    f.componentRef.setInput('qty', { POKE_BALL: 3, GREAT_BALL: 0, ULTRA_BALL: 0, RAZZ_BERRY: 1 });
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    const thrown: ThrowIntent[] = [];
    f.componentInstance.thrown.subscribe((t) => thrown.push(t));
    const hand = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('.hand')!;
    return { f, hand, thrown };
  };

  it('un lanzamiento recto hacia arriba sale con su potencia, sin puntería ni curva', () => {
    const { hand, thrown } = setup();
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointermove', 200, 680, 20));
    hand.dispatchEvent(pointer('pointermove', 200, 620, 60));
    hand.dispatchEvent(pointer('pointerup', 200, 556, 80)); // 144 px en 80 ms = 1800 px/s
    expect(thrown).toHaveLength(1);
    expect(thrown[0].power).toBeCloseTo(1, 6);
    expect(thrown[0].aim).toBeCloseTo(0, 6);
    expect(thrown[0].curve).toBe(0);
  });

  it('arrastrar hacia abajo no lanza y la bola vuelve a la mano', () => {
    const { hand, thrown } = setup();
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointermove', 200, 740, 40));
    hand.dispatchEvent(pointer('pointerup', 200, 760, 80));
    expect(thrown).toHaveLength(0);
    expect(hand.style.transform).toBe('');
  });

  it('sin bola en la mano (disabled) no se puede agarrar', () => {
    const { hand, thrown } = setup({ disabled: true });
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointerup', 200, 556, 80));
    expect(thrown).toHaveLength(0);
  });

  it('las bolas que no quedan no se pueden elegir', () => {
    const { f } = setup();
    const buttons = [...(f.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.map((b) => b.disabled)).toEqual([false, true, true, false]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [x] **10b.** → FALLA. **10c. Implementación:**

```ts
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import type { BallId } from '@shared/engine/capture';
import { ITEM_NAMES, type ItemId } from '@shared/engine/items';

import {
  curveOf,
  releaseVelocity,
  swipeToThrow,
  type GestureSample,
} from '../../game/encounter-scene/throw-gesture';

export interface ThrowIntent {
  power: number;
  aim: number;
  curve: -1 | 0 | 1;
}

const BALLS: BallId[] = ['POKE_BALL', 'GREAT_BALL', 'ULTRA_BALL'];
/** Muestras que se guardan del gesto (de sobra para ~1 vuelta y el lanzamiento). */
const MAX_SAMPLES = 120;

/**
 * Abajo del encuentro (F2-05): qué bola y si con Frambu (con cuántas quedan) y la bola en la mano. La bola sigue al
 * dedo 1:1 respetando dónde se agarró (DISENO §4.6); al soltar hacia arriba emite `thrown` (potencia, puntería y
 * curva si antes se giró el dedo alrededor de la bola). Hacia abajo o lento: vuelve a la mano.
 */
@Component({
  selector: 'app-throw-dock',
  template: `
    <div class="items" role="group" aria-label="Bola y baya">
      @for (b of balls; track b) {
        <button
          type="button"
          class="chip"
          [class.is-on]="ball() === b"
          [attr.aria-pressed]="ball() === b"
          [disabled]="!count(b)"
          (click)="pick.emit(b)"
        >
          <span class="dot" [attr.data-ball]="b" aria-hidden="true"></span>{{ names[b] }}
          <b>{{ qty() ? count(b) : '–' }}</b>
        </button>
      }
      <button
        type="button"
        class="chip"
        [class.is-on]="berry()"
        [attr.aria-pressed]="berry()"
        [disabled]="!count('RAZZ_BERRY')"
        (click)="toggleBerry.emit()"
      >
        Frambu <b>{{ qty() ? count('RAZZ_BERRY') : '–' }}</b>
      </button>
    </div>
    <div
      #hand
      class="hand"
      role="button"
      tabindex="-1"
      aria-label="Desliza hacia arriba para lanzar"
      [attr.data-ball]="ball()"
      [class.is-dragging]="dragging()"
      [class.is-off]="disabled()"
      (pointerdown)="grab($event)"
      (pointermove)="drag($event)"
      (pointerup)="release($event)"
      (pointercancel)="cancel()"
    ></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--s-3);
    }
    .items {
      display: flex;
      gap: var(--s-1);
      flex-wrap: wrap;
      justify-content: center;
    }
    .chip {
      min-height: 36px;
      padding: 0 var(--s-3);
      border: 0;
      border-radius: var(--r-chip);
      background: var(--surface-opaque);
      color: var(--surface-text);
      font: 600 0.8rem/1 system-ui;
    }
    .chip.is-on {
      box-shadow: inset 0 0 0 2px var(--accent);
    }
    .chip:disabled {
      opacity: 0.45;
    }
    .dot,
    .hand {
      --top: var(--accent);
      background: linear-gradient(var(--top) 0 46%, var(--ink) 46% 54%, var(--paper) 54%);
      border-radius: 50%;
    }
    [data-ball='GREAT_BALL'] {
      --top: var(--t-water);
    }
    [data-ball='ULTRA_BALL'] {
      --top: var(--ink);
    }
    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-right: var(--s-1);
      vertical-align: -2px;
    }
    .hand {
      width: 72px;
      height: 72px;
      box-shadow: var(--shadow-lg);
      touch-action: none;
      transition: transform var(--dur-panel) var(--ease-out);
    }
    .hand.is-dragging {
      transition: none;
    }
    .hand.is-off {
      opacity: 0;
      pointer-events: none;
    }
  `,
})
export class ThrowDockComponent {
  readonly ball = input.required<BallId>();
  readonly berry = input(false);
  readonly qty = input<Record<ItemId, number> | null>(null);
  /** Sin bola en la mano (vuela, la secuencia, sin bolas de esta clase). */
  readonly disabled = input(false);
  readonly pick = output<BallId>();
  readonly toggleBerry = output<void>();
  readonly grabbed = output<void>();
  readonly thrown = output<ThrowIntent>();

  protected readonly balls = BALLS;
  protected readonly names = ITEM_NAMES;
  protected readonly dragging = signal(false);
  private readonly handEl = viewChild.required<ElementRef<HTMLElement>>('hand');
  private samples: GestureSample[] = [];
  /** Centro de la bola al agarrarla y dónde se agarró respecto a él. */
  private origin = { x: 0, y: 0 };
  private offset = { x: 0, y: 0 };

  protected count(item: ItemId): number {
    return this.qty()?.[item] ?? 0;
  }

  protected grab(e: PointerEvent): void {
    if (this.disabled()) return;
    const el = this.handEl().nativeElement;
    el.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    this.origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.offset = { x: e.clientX - this.origin.x, y: e.clientY - this.origin.y };
    this.samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    this.dragging.set(true);
    this.grabbed.emit();
  }

  protected drag(e: PointerEvent): void {
    if (!this.dragging()) return;
    this.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    // 1:1 con el dedo, sin "saltar" al punto donde se agarró.
    this.handEl().nativeElement.style.transform = `translate(${e.clientX - this.origin.x - this.offset.x}px, ${e.clientY - this.origin.y - this.offset.y}px)`;
  }

  protected release(e: PointerEvent): void {
    if (!this.dragging()) return;
    this.samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    const curve = curveOf(
      this.samples,
      this.origin.x + this.offset.x,
      this.origin.y + this.offset.y,
    );
    const r = releaseVelocity(this.samples);
    const t = r ? swipeToThrow(r) : null;
    this.cancel();
    if (t) this.thrown.emit({ ...t, curve });
  }

  /** La bola vuelve a la mano (transición CSS). */
  protected cancel(): void {
    this.dragging.set(false);
    this.samples = [];
    this.handEl().nativeElement.style.transform = '';
  }
}
```

- [x] **10d.** → PASA (4). Commit `F2-05: la mano (bola, baya y gesto)` + push.

### Paso 11 — La página: aro, lanzamiento y respuesta del servidor

Al soltar se calcula todo (D-046): marco del lanzamiento = rumbo del móvil (`cameraYaw`; sin AR, 0); dónde estará el
Pokémon al llegar (`poseAt` en el instante del impacto, con sus saltos); acierto y punto (`resolveFlight`) y calidad
(`ringRadius` en ese instante). La escena solo reproduce el vuelo. Los tests usan `vi.useFakeTimers({ toFake:
['performance'] })` para saltarse el aterrizaje y dejar volar la bola.

**Files:** Modify `src/app/features/encounter/encounter.page.ts`, `encounter.page.spec.ts`

- [ ] **11a. Tests:**

```diff
--- a/src/app/features/encounter/encounter.page.spec.ts
+++ b/src/app/features/encounter/encounter.page.spec.ts
@@ -7,6 +7,7 @@
 import { CameraService, type CameraState } from '../../services/ar/camera.service';
 import { OrientationService } from '../../services/ar/orientation.service';
 import { AudioService } from '../../services/game/audio.service';
+import { BagService } from '../../services/game/bag.service';
 import { DatasetService } from '../../services/game/dataset.service';
 import { EncounterApiService } from '../../services/game/encounter-api.service';
 import { HapticsService } from '../../services/game/haptics.service';
@@ -47,7 +48,11 @@
 });
 
 describe('EncounterPage', () => {
-  const api = { view: vi.fn() };
+  const api = { view: vi.fn(), throw: vi.fn() };
+  const bag = {
+    qty: signal({ POKE_BALL: 3, GREAT_BALL: 0, ULTRA_BALL: 0, RAZZ_BERRY: 1 }),
+    load: vi.fn(),
+  };
   const playCry = vi.fn(() => Promise.resolve(true));
   const playSfx = vi.fn(() => Promise.resolve());
   const camState = signal<CameraState>('off');
@@ -64,6 +69,7 @@
 
   beforeEach(() => {
     vi.clearAllMocks();
+    vi.useRealTimers();
     localStorage.clear();
     camState.set('off');
     stage.onFrame = null;
@@ -73,9 +79,10 @@
       providers: [
         provideRouter([]),
         { provide: EncounterApiService, useValue: api },
+        { provide: BagService, useValue: bag },
         { provide: AudioService, useValue: { playCry, playSfx } },
         // El plugin real de Capacitor no existe en web.
-        { provide: HapticsService, useValue: { tap: vi.fn() } },
+        { provide: HapticsService, useValue: { tap: vi.fn(), throw: vi.fn() } },
         {
           provide: DatasetService,
           useValue: {
@@ -134,6 +141,39 @@
     expect(playSfx).toHaveBeenCalledWith('shiny');
   });
 
+  /** Lanza tras el aterrizaje (el reloj de `performance` es falso: se adelanta 1 s) y deja volar la bola. */
+  const throwAt = async (
+    f: Awaited<ReturnType<typeof open>>,
+    intent: { power: number; aim: number; curve: -1 | 0 | 1 },
+  ) => {
+    vi.advanceTimersByTime(1000);
+    stage.onFrame!(performance.now()); // coloca al Pokémon (sin AR: delante)
+    (f.componentInstance as unknown as { launch(i: typeof intent): void }).launch(intent);
+    vi.advanceTimersByTime(2000);
+    stage.onFrame!(performance.now()); // la bola llega
+    await settle(f);
+  };
+
+  it('lanzar (F2-05): si le da, el servidor decide con la bola elegida y se enseña lo que diga', async () => {
+    vi.useFakeTimers({ toFake: ['performance'] });
+    api.throw.mockResolvedValueOnce({ captured: true, fled: false, shakes: 3 });
+    const f = await open(Promise.resolve(view));
+    await throwAt(f, { power: 1, aim: 0, curve: 0 });
+    expect(api.throw).toHaveBeenCalledWith(
+      '12:34:5',
+      expect.objectContaining({ ball: 'POKE_BALL', berry: null, curve: false }),
+    );
+    expect(text(f)).toContain('¡Capturado!');
+  });
+
+  it('un lanzamiento flojo no llega y no llama al servidor (D-046)', async () => {
+    vi.useFakeTimers({ toFake: ['performance'] });
+    const f = await open(Promise.resolve(view));
+    await throwAt(f, { power: 0.4, aim: 0, curve: 0 });
+    expect(api.throw).not.toHaveBeenCalled();
+    expect(text(f)).toContain('¡Casi!');
+  });
+
   it('un 403 dice que está demasiado lejos y no monta la escena', async () => {
     const f = await open(Promise.reject(new HttpErrorResponse({ status: 403 })));
     expect(text(f)).toContain('Estás demasiado lejos.');
```

- [ ] **11b.** → FALLAN. **11c. Implementación:**

```diff
--- a/src/app/features/encounter/encounter.page.ts
+++ b/src/app/features/encounter/encounter.page.ts
@@ -12,6 +12,7 @@
 } from '@angular/core';
 import { Router } from '@angular/router';
 import { IonContent } from '@ionic/angular';
+import { captureChance, type BallId, type ThrowQuality } from '@shared/engine/capture';
 import { hashString } from '@shared/engine/rng';
 import type { EncounterView } from '@shared/protocol/encounters';
 import * as THREE from 'three';
@@ -32,10 +33,25 @@
   landingAt,
   motionAt,
 } from '../../game/encounter-scene/pokemon-motion';
+import {
+  QUALITY_TEXT,
+  ringRadius,
+  ringToken,
+  throwQuality,
+} from '../../game/encounter-scene/precision-ring';
+import {
+  flightPos,
+  impactTime,
+  planFlight,
+  resolveFlight,
+  type Flight,
+  type ThrowHit,
+} from '../../game/encounter-scene/throw-physics';
 import { FX_KIND } from '../../game/encounter-scene/type-fx';
 import { CameraService } from '../../services/ar/camera.service';
 import { OrientationService } from '../../services/ar/orientation.service';
 import { AudioService } from '../../services/game/audio.service';
+import { BagService } from '../../services/game/bag.service';
 import { DatasetService } from '../../services/game/dataset.service';
 import { EncounterApiService } from '../../services/game/encounter-api.service';
 import { HapticsService } from '../../services/game/haptics.service';
@@ -43,6 +59,7 @@
 import { GameButtonComponent } from '../../shared/ui/game-button.component';
 import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
 import { EncounterHudComponent } from './encounter-hud.component';
+import { ThrowDockComponent, type ThrowIntent } from './throw-dock.component';
 
 /** Crea el escenario (renderer + bucle). Token para que los tests pongan un doble: jsdom no tiene WebGL. */
 export const ENCOUNTER_STAGE = new InjectionToken<
@@ -76,6 +93,19 @@
 /** Si la ficha no ha cargado: quieto, en el suelo, sin efectos raros. */
 const CALM: Personality = { agility: 0, skittish: 0, hover: 0, ghostly: false, fx: 'normal' };
 
+/** Un lanzamiento en el aire: el vuelo entero, decidido al soltar (D-046). */
+interface InFlight {
+  f: Flight;
+  /** Rumbo del móvil al soltar: el marco del lanzamiento. */
+  yaw: number;
+  start: number;
+  hit: ThrowHit;
+  quality: ThrowQuality;
+  ball: BallId;
+  berry: 'RAZZ_BERRY' | null;
+  curve: boolean;
+}
+
 const prefersReducedMotion = (): boolean =>
   typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
 
@@ -86,7 +116,13 @@
  */
 @Component({
   selector: 'app-encounter',
-  imports: [IonContent, GameButtonComponent, GlassPanelComponent, EncounterHudComponent],
+  imports: [
+    IonContent,
+    GameButtonComponent,
+    GlassPanelComponent,
+    EncounterHudComponent,
+    ThrowDockComponent,
+  ],
   template: `
     <ion-content [scrollY]="false" class="full">
       <div
@@ -120,6 +156,20 @@
             @if (note(); as n) {
               <p class="note" role="status">{{ n }}</p>
             }
+            @if (toast(); as t) {
+              <p class="note toast" role="status">{{ t }}</p>
+            }
+            <app-throw-dock
+              class="dock"
+              [ball]="ball()"
+              [berry]="berry()"
+              [qty]="bag.qty()"
+              [disabled]="!canThrow()"
+              (pick)="ball.set($event)"
+              (toggleBerry)="berry.set(!berry())"
+              (grabbed)="onGrab()"
+              (thrown)="launch($event)"
+            />
           }
           @default {
             <app-glass-panel size="lg" class="card">
@@ -179,7 +229,6 @@
       inset: 0;
       display: flex;
       flex-direction: column;
-      justify-content: space-between;
       gap: var(--s-3);
       padding: calc(var(--ion-safe-area-top, 0px) + var(--s-3)) var(--s-4)
         calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
@@ -192,6 +241,12 @@
     .card {
       margin: auto;
     }
+    .dock {
+      margin-top: auto;
+    }
+    .toast {
+      font: 700 1.1rem/1 var(--font-display);
+    }
     .msg {
       font: 600 1.1rem/1.2 var(--font-display);
       color: var(--paper);
@@ -229,6 +284,7 @@
   private readonly settings = inject(SettingsService);
   private readonly camera = inject(CameraService);
   private readonly orientation = inject(OrientationService);
+  protected readonly bag = inject(BagService);
   private readonly createStage = inject(ENCOUNTER_STAGE);
   private readonly stageEl = viewChild.required<ElementRef<HTMLElement>>('stage');
   private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');
@@ -260,6 +316,28 @@
     return v ? sizeClass(v.heightScale) : null;
   });
   protected readonly typeColor = computed(() => `var(--t-${this.species()?.types[0] ?? 'normal'})`);
+  protected readonly ball = signal<BallId>('POKE_BALL');
+  protected readonly berry = signal(false);
+  /** La bola está en el aire o esperando al servidor: no se lanza otra. */
+  private readonly busy = signal(false);
+  protected readonly toast = signal<string | null>(null);
+  protected readonly canThrow = computed(
+    () => !this.busy() && (this.bag.qty()?.[this.ball()] ?? 0) > 0,
+  );
+  /** Color del aro: probabilidad con esta bola/baya y sin bonus de lanzamiento (como Pokémon GO). */
+  private readonly ringColor = computed(() => {
+    const sp = this.species();
+    const chance = sp
+      ? captureChance({
+          captureRate: sp.captureRate,
+          ball: this.ball(),
+          berry: this.berry() ? 'RAZZ_BERRY' : null,
+          throwQuality: 'none',
+          curve: false,
+        })
+      : 0.5;
+    return cssColor([ringToken(chance), '#3ccf8e']);
+  });
   protected readonly message = computed(() => {
     if (this.phase() !== 'resolved') return this.error() ?? '';
     return this.view()?.status === 'caught' ? 'Ya lo atrapaste.' : 'Ya se te escapó.';
@@ -286,6 +364,8 @@
   /** Cuándo empezó el encuentro (ms): aterrizaje y saltos cuentan desde aquí; NO se reinicia al volver. */
   private startedAt = 0;
   private touchedDown = false;
+  private flight: InFlight | null = null;
+  private toastTimer?: ReturnType<typeof setTimeout>;
 
   constructor() {
     document.addEventListener('visibilitychange', this.onVisibility);
@@ -360,6 +440,7 @@
       this.watchSize();
       this.phase.set('ready');
       this.flashIn();
+      if (this.bag.qty() === null) void this.bag.load();
       void loadFirstTexture(artUrls(v.speciesId, v.shiny)).then((tex) => {
         if (tex && this.world === world) world.setTexture(tex);
         else tex?.dispose();
@@ -422,6 +503,110 @@
       world.update(null, pose);
     }
     world.animate(t / 1000);
+    // F2-05: aro de precisión (solo con una bola en la mano) y bola en vuelo.
+    world.setRing(this.canThrow(), this.ringColor());
+    world.updateRing(pose.lift, ringRadius(t));
+    if (this.flight) this.fly(now);
+  }
+
+  protected onGrab(): void {
+    this.haptics.tap();
+  }
+
+  /**
+   * Suelta la bola (F2-05). El vuelo se calcula entero ahora: dónde estará el Pokémon al llegar se sabe (sus saltos
+   * están programados), así que acierto, punto de impacto y calidad quedan decididos y la escena solo lo reproduce.
+   */
+  protected launch(intent: ThrowIntent): void {
+    const world = this.world;
+    if (!world || !world.isPlaced || !this.canThrow()) return;
+    const now = performance.now();
+    const t0 = now - this.startedAt;
+    // Hacia donde mira el móvil al soltar; sin AR la cámara mira al Pokémon (rumbo 0).
+    const yaw = this.arMode ? cameraYaw(this.q) : 0;
+    const rest = world.throwTarget(yaw, this.personality.hover);
+    const f = planFlight(
+      intent.power,
+      intent.aim,
+      intent.curve,
+      Math.max(0.5, rest.fwd),
+      rest.baseY + rest.height / 2,
+    );
+    const lift = this.poseAt(t0 + impactTime(f, rest.fwd) * 1000, world.heightM).lift;
+    const hit: ThrowHit =
+      rest.fwd > 0.5
+        ? resolveFlight(f, world.throwTarget(yaw, lift))
+        : { kind: 'miss', t: 1.2, fwd: 0, lat: 0 }; // detrás o al lado: ni lo intenta
+    const quality =
+      hit.kind === 'hit' ? throwQuality(hit.u, hit.v, ringRadius(t0 + hit.t * 1000)) : 'none';
+    this.flight = {
+      f,
+      yaw,
+      start: now,
+      hit,
+      quality,
+      ball: this.ball(),
+      berry: this.berry() ? 'RAZZ_BERRY' : null,
+      curve: intent.curve !== 0,
+    };
+    this.busy.set(true);
+    world.spawnBall(this.ball());
+    void this.audio.playSfx('ball-throw');
+    this.haptics.throw();
+  }
+
+  /** Un fotograma del vuelo; al llegar, acierto o fallo. */
+  private fly(now: number): void {
+    const fl = this.flight;
+    const world = this.world;
+    if (!fl || !world) return;
+    const tf = (now - fl.start) / 1000;
+    world.setBallInThrowFrame(fl.yaw, flightPos(fl.f, Math.min(tf, fl.hit.t)), tf * 18);
+    if (tf < fl.hit.t) return;
+    this.flight = null;
+    if (fl.hit.kind === 'miss') this.missed();
+    else void this.hitPokemon(fl);
+  }
+
+  /** No le dio: la bola se queda un momento en el suelo y vuelve otra a la mano. No gasta nada (D-046). */
+  private missed(): void {
+    this.showToast('¡Casi!');
+    setTimeout(() => {
+      this.world?.removeBall();
+      this.busy.set(false);
+    }, 500);
+  }
+
+  /** Le dio: el servidor decide (D-028). F2-07 cambia el mensaje por la coreografía completa. */
+  private async hitPokemon(fl: InFlight): Promise<void> {
+    void this.audio.playSfx('ball-hit');
+    this.haptics.tap();
+    if (fl.quality !== 'none') this.showToast(QUALITY_TEXT[fl.quality]);
+    if (fl.berry) this.berry.set(false); // la baya se gasta con el lanzamiento
+    try {
+      const res = await this.api.throw(this.id(), {
+        ball: fl.ball,
+        berry: fl.berry,
+        throwQuality: fl.quality,
+        curve: fl.curve,
+      });
+      this.showToast(res.captured ? '¡Capturado!' : res.fled ? '¡Huyó!' : 'Se escapó…');
+      if (res.captured || res.fled) {
+        setTimeout(() => this.back(), 1500);
+        return;
+      }
+    } catch (err) {
+      const status = err instanceof HttpErrorResponse ? err.status : undefined;
+      this.showToast(encounterErrorText(status));
+    }
+    this.world?.removeBall();
+    this.busy.set(false);
+  }
+
+  private showToast(text: string, ms = 1400): void {
+    this.toast.set(text);
+    clearTimeout(this.toastTimer);
+    this.toastTimer = setTimeout(() => this.toast.set(null), ms);
   }
 
   /** Postura en `t` ms del encuentro: cae al entrar y después se mueve según su ficha (F2-04b). */
@@ -494,6 +679,9 @@
   }
 
   private teardown(): void {
+    this.flight = null;
+    this.busy.set(false);
+    clearTimeout(this.toastTimer);
     this.stage?.dispose();
     this.world?.dispose();
     this.stage = null;
```

- [ ] **11d.** `npx ng test --include=src/app/features/encounter/encounter.page.spec.ts --watch=false` → PASA (11). Commit + push.

### Paso 12 — Verde y Android

- [ ] **12a.** `npm run lint` · `npm run build` · `npm test -- --watch=false` · `npm run test:shared` · `cd server && npm run build && npm test`.
- [ ] **12b.** Android (con la AR y sin ella): un lanzamiento recto y firme acierta; flojo → "¡Casi!" y NO baja la
  mochila; torcido falla; con una vuelta del dedo antes, la bola hace la curva y vuelve; el aro cambia de color con
  Super/Ultra/Frambu; "¡Genial!" etc. al acertar dentro del aro; la mochila baja una bola por acierto (y la Frambu);
  sin bolas de una clase, su botón se apaga. Con un Pokémon rápido, alguno falla por su salto. Evidencias `F2-05_*`.
- [ ] **12c.** REGLA 2 y PR.

---

## F2-07 · Secuencia de captura, escape, huida y shiny

**Criterio (DISENO §5):** al golpear, el Pokémon se vuelve luz roja y entra en la bola; la bola cae con un botecito;
**1-3 sacudidas** con pausa tensa, "clac" y vibración fuerte en cada una; **capturado**: clic, estrellas doradas,
fanfarria y la tarjeta "¡Capturado!" con los datos del individuo (nivel, naturaleza en español, sexo, tamaño,
movimientos, ✦) y la XP contando; **escape**: la bola se abre, el Pokémon sale con su grito y el encuentro sigue;
**huida**: se desvanece y vuelta al mapa; un fallo del servidor no deja la pantalla colgada. Mientras el servidor
tarda (Render despertando), la bola espera en el suelo balanceándose. Sonido + háptico + animación en el mismo
fotograma. "Reducir efectos": todo al doble de rápido, sin estrellas. **Android:** vídeo de una captura completa.

> Verificado (lint, build y tests) sobre el estado de F2-05. Con todo el plan hecho: **app 73 archivos / 393 tests,
> `shared/` 143 tests, servidor 22**.

### Paso 1 — La coreografía (solo tiempos)

**Files:** Create `src/app/game/encounter-scene/capture-sequence.ts`, Test `capture-sequence.spec.ts`

- [ ] **1a. Test que falla:**

```ts
import {
  SEQ_MS,
  ballDropY,
  preTimeline,
  resultTimeline,
  shakeAngle,
  stepAt,
  timelineEnd,
} from './capture-sequence';

const steps = (items: { step: string }[]) => items.map((i) => i.step);

describe('capture-sequence', () => {
  it('antes del servidor: absorber y caer, seguidos', () => {
    const pre = preTimeline(1000);
    expect(steps(pre)).toEqual(['absorb', 'drop']);
    expect(pre[0].start).toBe(1000);
    expect(pre[1].start).toBe(pre[0].end);
    expect(timelineEnd(pre)).toBe(1000 + SEQ_MS.absorb + SEQ_MS.drop);
  });

  it('capturado: 3 sacudidas y clic', () => {
    const tl = resultTimeline({ captured: true, shakes: 3, fled: false }, 0);
    expect(steps(tl)).toEqual([
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'click',
    ]);
    expect(tl.filter((i) => i.step === 'shake').map((i) => i.index)).toEqual([1, 2, 3]);
  });

  it('se escapa a la primera: sale de la bola y sigue el encuentro', () => {
    expect(steps(resultTimeline({ captured: false, shakes: 0, fled: false }, 0))).toEqual([
      'pause',
      'burst',
    ]);
  });

  it('se escapa y huye', () => {
    expect(steps(resultTimeline({ captured: false, shakes: 2, fled: true }, 0))).toEqual([
      'pause',
      'shake',
      'pause',
      'shake',
      'pause',
      'burst',
      'flee',
    ]);
  });

  it('sin huecos y al doble de rápido con speed 2', () => {
    const slow = resultTimeline({ captured: true, shakes: 3, fled: false }, 500);
    const fast = resultTimeline({ captured: true, shakes: 3, fled: false }, 500, 2);
    for (let i = 1; i < slow.length; i++) expect(slow[i].start).toBe(slow[i - 1].end);
    expect(timelineEnd(fast) - 500).toBeCloseTo((timelineEnd(slow) - 500) / 2, 6);
  });

  it('stepAt: el paso en curso y su avance', () => {
    const tl = preTimeline(0);
    expect(stepAt(tl, 300)).toEqual({ item: tl[0], k: 0.5 });
    expect(stepAt(tl, SEQ_MS.absorb)!.item.step).toBe('drop');
    expect(stepAt(tl, timelineEnd(tl))).toBeNull();
  });
});

describe('ballDropY y shakeAngle', () => {
  it('la bola cae de donde golpeó al suelo, bota un poco y se queda', () => {
    expect(ballDropY(0, -1, -1.34)).toBe(-1);
    expect(ballDropY(0.6, -1, -1.34)).toBeCloseTo(-1.34, 6);
    expect(ballDropY(0.8, -1, -1.34)).toBeCloseTo(-1.34 + 0.08, 6);
    expect(ballDropY(1, -1, -1.34)).toBeCloseTo(-1.34, 6);
  });

  it('cada sacudida empieza y acaba derecha', () => {
    expect(shakeAngle(0)).toBe(0);
    expect(shakeAngle(1)).toBeCloseTo(0, 6);
    expect(Math.abs(shakeAngle(0.125))).toBeGreaterThan(0.3);
  });
});
```

- [ ] **1b.** → FALLA. **1c. Implementación:**

```ts
/**
 * Coreografía de la captura (F2-07, DISENO §5): qué pasa y cuánto dura desde que la bola golpea al Pokémon.
 *
 *   golpe → absorb (luz roja hacia dentro) → drop (cae con rebote) → [espera al servidor] →
 *   (pause → shake) × sacudidas → pause → click (¡capturado!) | burst (se escapa) [→ flee (huye)]
 *
 * La primera parte se conoce al golpear (`preTimeline`); el resto, cuando responde el servidor (`resultTimeline`),
 * que empieza donde acabe la primera o cuando llegue la respuesta si tarda más. Solo tiempos: la escena pinta.
 */
export type SeqStep = 'absorb' | 'drop' | 'pause' | 'shake' | 'click' | 'burst' | 'flee';

export interface SeqItem {
  step: SeqStep;
  /** ms (mismo reloj que el resto de la escena). */
  start: number;
  end: number;
  /** Número de sacudida (1..3) en `shake`. */
  index?: number;
}

export const SEQ_MS: Readonly<Record<SeqStep, number>> = {
  absorb: 600,
  drop: 700,
  pause: 350,
  shake: 500,
  click: 1000,
  burst: 600,
  flee: 900,
};
/** Pausa tensa antes del final (más larga que entre sacudidas). */
const FINAL_PAUSE_MS = 450;

export interface SeqResult {
  captured: boolean;
  shakes: number;
  fled: boolean;
}

/** `speed` 2 = el doble de rápido ("reducir efectos", D-033). */
export function preTimeline(start: number, speed = 1): SeqItem[] {
  const items: SeqItem[] = [];
  let t = start;
  for (const step of ['absorb', 'drop'] as const) {
    items.push({ step, start: t, end: t + SEQ_MS[step] / speed });
    t += SEQ_MS[step] / speed;
  }
  return items;
}

export function resultTimeline(r: SeqResult, start: number, speed = 1): SeqItem[] {
  const items: SeqItem[] = [];
  let t = start;
  const push = (step: SeqStep, ms: number, index?: number) => {
    items.push({ step, start: t, end: t + ms / speed, ...(index ? { index } : {}) });
    t += ms / speed;
  };
  const shakes = Math.max(0, Math.min(3, r.shakes));
  for (let i = 1; i <= shakes; i++) {
    push('pause', SEQ_MS.pause);
    push('shake', SEQ_MS.shake, i);
  }
  push('pause', FINAL_PAUSE_MS);
  if (r.captured) {
    push('click', SEQ_MS.click);
  } else {
    push('burst', SEQ_MS.burst);
    if (r.fled) push('flee', SEQ_MS.flee);
  }
  return items;
}

export const timelineEnd = (items: readonly SeqItem[]): number => items[items.length - 1].end;

/** Paso en curso en `t` y su avance 0..1; null antes del primero o después del último. */
export function stepAt(items: readonly SeqItem[], t: number): { item: SeqItem; k: number } | null {
  for (const item of items) {
    if (t >= item.start && t < item.end)
      return { item, k: (t - item.start) / (item.end - item.start) };
  }
  return null;
}

/** Altura de la bola al caer (paso `drop`, k 0..1): cae acelerando hasta `restY` y da un botecito. */
export function ballDropY(k: number, fromY: number, restY: number): number {
  if (k < 0.6) {
    const f = k / 0.6;
    return fromY + (restY - fromY) * f * f;
  }
  return restY + 0.08 * Math.sin((Math.PI * (k - 0.6)) / 0.4);
}

/** Inclinación de la bola en una sacudida (paso `shake`, k 0..1): dos vaivenes que se apagan. */
export const shakeAngle = (k: number): number => 0.45 * Math.sin(k * Math.PI * 4) * (1 - k);
```

- [ ] **1d.** → PASA (8). Commit `F2-07: coreografía de la captura` + push.

### Paso 2 — Naturalezas en español

El dataset no trae naturalezas: nombres sacados de PokéAPI (`/nature/{1..25}`, `names[es]`) el 2026-10-12. No se
inventa nada (REGLA 3).

**Files:** Create `shared/data/natures-es.ts`, Test `shared/data/natures-es.spec.ts`

- [ ] **2a. Test que falla:**

```ts
import { NATURES } from '../engine/spawns.js';
import { NATURE_NAMES_ES, natureNameEs } from './natures-es.js';

describe('NATURE_NAMES_ES', () => {
  it('tiene las 25 naturalezas de los spawns, sin repetir nombre', () => {
    expect(Object.keys(NATURE_NAMES_ES).sort()).toEqual([...NATURES].sort());
    expect(new Set(Object.values(NATURE_NAMES_ES)).size).toBe(25);
  });

  it('nombres de PokéAPI en español', () => {
    expect(natureNameEs('adamant')).toBe('Firme');
    expect(natureNameEs('jolly')).toBe('Alegre');
  });

  it('una desconocida sale tal cual', () => {
    expect(natureNameEs('nueva')).toBe('nueva');
  });
});
```

- [ ] **2b.** `npm run test:shared -- natures` → FALLA. **2c. Implementación:**

```ts
import type { Nature } from '../engine/spawns.js';

/**
 * Nombre en español de cada naturaleza (F2-07, ficha del capturado). Sacados de PokéAPI (`/nature/{1..25}`,
 * `names[language = es]`) el 2026-10-12: el dataset no trae naturalezas y no se inventa nada (REGLA 3).
 */
export const NATURE_NAMES_ES: Readonly<Record<Nature, string>> = {
  hardy: 'Fuerte',
  lonely: 'Huraña',
  brave: 'Audaz',
  adamant: 'Firme',
  naughty: 'Pícara',
  bold: 'Osada',
  docile: 'Dócil',
  relaxed: 'Plácida',
  impish: 'Agitada',
  lax: 'Floja',
  timid: 'Miedosa',
  hasty: 'Activa',
  serious: 'Seria',
  jolly: 'Alegre',
  naive: 'Ingenua',
  modest: 'Modesta',
  mild: 'Afable',
  quiet: 'Mansa',
  bashful: 'Tímida',
  rash: 'Alocada',
  calm: 'Serena',
  gentle: 'Amable',
  sassy: 'Grosera',
  careful: 'Cauta',
  quirky: 'Rara',
};

/** Nombre en español; si llega una naturaleza desconocida, la clave tal cual (nunca `undefined` en pantalla). */
export const natureNameEs = (nature: string): string =>
  (NATURE_NAMES_ES as Record<string, string>)[nature] ?? nature;
```

- [ ] **2d.** → PASA (3). Commit `F2-07: naturalezas en español (PokéAPI)` + push.

### Paso 3 — Absorción y bola quieta en la escena

**Files:** Modify `src/app/game/encounter-scene/encounter-scene.ts`, `encounter-scene.spec.ts`

- [ ] **3a. Tests:**

```diff
--- a/src/app/game/encounter-scene/encounter-scene.spec.ts
+++ b/src/app/game/encounter-scene/encounter-scene.spec.ts
@@ -181,4 +181,32 @@
     expect(inner.scale.x).toBeCloseTo(outer.scale.x / 2, 6);
     s.dispose();
   });
+
+  it('absorción: encoge y se tiñe de rojo; (0, 0) lo deja como estaba', () => {
+    const s = new EncounterScene(1);
+    s.placeAt(0);
+    s.update(null);
+    const full = s.body.scale.y;
+    s.setCaptureLook(0.5, 1);
+    s.update(null);
+    expect(s.body.scale.y).toBeCloseTo(full / 2, 6);
+    expect(s.body.material.color.g).toBeCloseTo(0.25, 6);
+    s.setCaptureLook(1, 1);
+    expect(s.body.visible).toBe(false);
+    s.setCaptureLook(0, 0);
+    s.update(null);
+    expect(s.body.visible).toBe(true);
+    expect(s.body.scale.y).toBeCloseTo(full, 6);
+    expect(s.body.material.color.getHexString()).toBe('ffffff');
+    s.dispose();
+  });
+
+  it('poseBall: la bola en un punto, de cara a la cámara y ladeada', () => {
+    const s = new EncounterScene(1);
+    const ball = s.spawnBall('ULTRA_BALL');
+    s.poseBall(0, -1.34, -2, 0.3);
+    expect(ball.position.toArray()).toEqual([0, -1.34, -2]);
+    expect(ball.rotation.z).toBeCloseTo(0.3, 6);
+    s.dispose();
+  });
 });
```

- [ ] **3b.** → FALLAN. **3c. Implementación:**

```diff
--- a/src/app/game/encounter-scene/encounter-scene.ts
+++ b/src/app/game/encounter-scene/encounter-scene.ts
@@ -52,6 +52,8 @@
   private readonly glowTex: THREE.Texture;
   private aspect = 1;
   private placed = false;
+  /** 0 = normal; 1 = absorbido del todo en la bola (F2-07). */
+  private shrink = 0;
   private fxKind: FxKind | null = null;
   private readonly fxColor = new THREE.Color();
   private readonly burstColor = new THREE.Color();
@@ -165,12 +167,13 @@
     const a = this.anchor;
     a.rotation.y = Math.atan2(-a.position.x, -a.position.z);
     const h = this.heightM / ART_FILL;
-    this.body.scale.set(h * this.aspect * (2 - pose.squash), h * pose.squash, 1);
+    const k = Math.max(0.001, 1 - this.shrink);
+    this.body.scale.set(h * this.aspect * (2 - pose.squash) * k, h * pose.squash * k, 1);
     this.body.position.y = pose.lift - h * (1 - ART_FILL) * 0.5;
     this.body.rotation.z = pose.lean;
     // La sombra se queda en el suelo y encoge cuanto más alto está.
     const away = Math.min(0.6, pose.lift / (this.heightM + 0.5));
-    this.shadow.scale.setScalar(Math.max(0.35, this.heightM * 0.9) * (1 - away));
+    this.shadow.scale.setScalar(Math.max(0.35, this.heightM * 0.9) * (1 - away) * k);
   }
 
   /** Partículas del tipo (null = ninguna, p. ej. con "reducir efectos"). `color` CSS: '#rrggbb'. */
@@ -262,6 +265,24 @@
     };
   }
 
+  /**
+   * Absorción (F2-07): `shrink` 0..1 encoge al Pokémon hacia sus pies y `red` 0..1 lo tiñe de luz roja (el color del
+   * material multiplica el arte). (0, 0) = normal.
+   */
+  setCaptureLook(shrink: number, red: number): void {
+    this.shrink = Math.min(1, Math.max(0, shrink));
+    const r = Math.min(1, Math.max(0, red));
+    this.body.material.color.setRGB(1, 1 - 0.75 * r, 1 - 0.75 * r);
+    this.body.visible = this.shrink < 0.999;
+  }
+
+  /** Bola quieta en un punto de la escena con una inclinación lateral (sacudidas de F2-07). */
+  poseBall(x: number, y: number, z: number, tilt: number): void {
+    if (!this.ball) return;
+    this.ball.position.set(x, y, z);
+    this.ball.rotation.set(0, Math.atan2(-x, -z), tilt);
+  }
+
   /** Saca a la escena una bola nueva (la de la mano es HTML); si había otra, se tira. */
   spawnBall(id: BallId): THREE.Group {
     this.removeBall();
```

- [ ] **3d.** → PASA (17). Commit + push.

### Paso 4 — Sonidos de la captura

- [ ] **4a.** En `SFX_RECIPES` (`sfx-synth.ts`):

```ts
  /** El Pokémon se convierte en luz y entra en la bola (F2-07). */
  absorb: [
    { wave: 'saw', from: 200, to: 1200, start: 0, duration: 0.55, gain: 0.12, attack: 0.05 },
    { wave: 'sine', from: 400, to: 1600, start: 0, duration: 0.55, gain: 0.15, attack: 0.05 },
  ],
  /** Cada sacudida de la bola (F2-07): clac seco. */
  shake: [
    { wave: 'noise', from: 1500, to: 400, start: 0, duration: 0.06, gain: 0.35, attack: 0.001 },
    { wave: 'sine', from: 200, to: 120, start: 0, duration: 0.12, gain: 0.4, attack: 0.002 },
  ],
  /** ¡Capturado! (F2-07): clic y fanfarria corta Sol-Do-Mi-Sol. */
  capture: [
    { wave: 'square', from: 1500, to: 1500, start: 0, duration: 0.04, gain: 0.2, attack: 0.001 },
    { wave: 'square', from: 784, to: 784, start: 0.15, duration: 0.1, gain: 0.13 },
    { wave: 'square', from: 1047, to: 1047, start: 0.25, duration: 0.1, gain: 0.13 },
    { wave: 'square', from: 1319, to: 1319, start: 0.35, duration: 0.1, gain: 0.13 },
    { wave: 'square', from: 1568, to: 1568, start: 0.45, duration: 0.3, gain: 0.15 },
    { wave: 'triangle', from: 784, to: 784, start: 0.45, duration: 0.3, gain: 0.2 },
  ],
  /** Se escapa de la bola (F2-07): la bola se abre de golpe. */
  escape: [
    { wave: 'square', from: 600, to: 1400, start: 0, duration: 0.08, gain: 0.18, attack: 0.002 },
    { wave: 'noise', from: 2000, to: 600, start: 0.05, duration: 0.3, gain: 0.3, attack: 0.01 },
  ],
```

- [ ] **4b.** `npx ng test --include=src/app/services/game/sfx-synth.spec.ts --watch=false` → PASA (24). Regenerar los
  `.wav` para escucharlos como en F2-08 (`docs/evidencias/F2-08_sfx/`) y añadir los nuevos. Commit + push.

### Paso 5 — La tarjeta "¡Capturado!"

**Files:** Create `src/app/features/encounter/caught-card.component.ts`, Test `caught-card.component.spec.ts`

- [ ] **5a. Test que falla:**

```ts
import { TestBed } from '@angular/core/testing';
import type { CaughtView } from '@shared/protocol/encounters';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { CaughtCardComponent, XP_COUNT_MS } from './caught-card.component';

const CAUGHT: CaughtView = {
  id: 'c1',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: true,
  nature: 'adamant',
  heightScale: 1.45,
  moves: [85, 98],
};

describe('CaughtCardComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  const setup = (instant = false) => {
    const f = TestBed.createComponent(CaughtCardComponent);
    f.componentRef.setInput('caught', CAUGHT);
    f.componentRef.setInput('name', 'Pikachu');
    f.componentRef.setInput('moveNames', ['Rayo', 'Ataque Rápido']);
    f.componentRef.setInput('xp', 160);
    f.componentRef.setInput('instant', instant);
    f.detectChanges();
    return f;
  };
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('enseña al individuo: nombre, ✦, nivel, naturaleza en español, sexo, tamaño y movimientos', () => {
    const f = setup();
    expect(text(f)).toContain('¡Capturado!');
    expect(text(f)).toContain('Pikachu');
    expect(text(f)).toContain('✦');
    expect(text(f)).toContain('12');
    expect(text(f)).toContain('Firme');
    expect(text(f)).toContain('♂ Macho');
    expect(text(f)).toContain('XL');
    expect(text(f)).toContain('Rayo · Ataque Rápido');
    const img = (f.nativeElement as HTMLElement).querySelector('img')!;
    expect(img.getAttribute('src')).toContain('/other/home/shiny/25.png');
  });

  it('la XP cuenta desde 0 hasta lo ganado', () => {
    const f = setup();
    expect(text(f)).toContain('+0 XP');
    vi.advanceTimersByTime(XP_COUNT_MS);
    f.detectChanges();
    expect(text(f)).toContain('+160 XP');
  });

  it('con "reducir efectos" sale ya contada', () => {
    expect(text(setup(true))).toContain('+160 XP');
  });

  it('si el arte no carga prueba el siguiente', () => {
    const f = setup();
    const img = (f.nativeElement as HTMLElement).querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(img.getAttribute('src')).toContain('/official-artwork/shiny/25.png');
  });

  it('"Volver al mapa" avisa a la página', () => {
    const f = setup();
    const done = vi.fn();
    f.componentInstance.done.subscribe(done);
    (f.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(done).toHaveBeenCalled();
  });
});
```

- [ ] **5b.** → FALLA. **5c. Implementación:**

```ts
import { Component, OnDestroy, computed, effect, input, output, signal } from '@angular/core';
import { natureNameEs } from '@shared/data/natures-es';
import type { CaughtView } from '@shared/protocol/encounters';

import { artUrls, sizeClass } from '../../game/encounter-scene/encounter-layout';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';

/** La XP cuenta hacia arriba en este tiempo (DISENO §5: "XP contando"), en pasos de ~40 ms. */
export const XP_COUNT_MS = 800;
const XP_STEPS = 20;

/**
 * "¡Capturado!" (F2-07, DISENO §5): el individuo que dio el servidor (`CaughtView`, sin IVs) con su arte, nivel,
 * naturaleza en español, sexo, tamaño y movimientos, y la XP ganada contando. Solo pinta: la página decide.
 */
@Component({
  selector: 'app-caught-card',
  imports: [GameButtonComponent, GlassPanelComponent],
  template: `
    <app-glass-panel size="lg" class="card" role="dialog" aria-label="Pokémon capturado">
      <p class="title">¡Capturado!</p>
      <img class="art" [src]="art()" [alt]="name()" width="160" height="160" (error)="nextArt()" />
      <h2 class="name">
        {{ name() }}
        @if (caught().shiny) {
          <span class="shiny" aria-label="variocolor">✦</span>
        }
      </h2>
      <dl class="facts">
        <div>
          <dt>Nivel</dt>
          <dd>{{ caught().level }}</dd>
        </div>
        <div>
          <dt>Naturaleza</dt>
          <dd>{{ nature() }}</dd>
        </div>
        @if (gender(); as g) {
          <div>
            <dt>Sexo</dt>
            <dd>{{ g }}</dd>
          </div>
        }
        @if (size(); as s) {
          <div>
            <dt>Tamaño</dt>
            <dd>{{ s }}</dd>
          </div>
        }
      </dl>
      @if (moveNames().length) {
        <p class="moves">{{ moveNames().join(' · ') }}</p>
      }
      <p class="xp">+{{ xpShown() }} XP</p>
      <app-game-button label="Volver al mapa" [block]="true" (pressed)="done.emit()" />
    </app-glass-panel>
  `,
  styles: `
    .card {
      display: grid;
      justify-items: center;
      gap: var(--s-2);
      text-align: center;
    }
    .title {
      margin: 0;
      font: 700 2rem/1.05 var(--font-display);
      letter-spacing: -0.02em;
      color: var(--gold);
      text-shadow: 0 2px 0 var(--ink);
    }
    .art {
      width: 160px;
      height: 160px;
      object-fit: contain;
    }
    .name {
      margin: 0;
      font: 700 1.4rem/1.1 var(--font-display);
    }
    .shiny {
      color: var(--gold);
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--s-2) var(--s-4);
      margin: 0;
    }
    dt {
      font-size: 0.75rem;
      color: var(--ink-2);
    }
    dd {
      margin: 0;
      font-weight: 700;
    }
    .moves {
      margin: 0;
      font-size: 0.85rem;
    }
    .xp {
      margin: 0;
      font: 700 1.2rem/1 var(--font-display);
      font-variant-numeric: tabular-nums;
      color: var(--success);
    }
  `,
})
export class CaughtCardComponent implements OnDestroy {
  readonly caught = input.required<CaughtView>();
  readonly name = input.required<string>();
  /** Nombres en español de sus movimientos (la página los saca del dataset). */
  readonly moveNames = input<string[]>([]);
  readonly xp = input(0);
  /** Sin animación ("reducir efectos"). */
  readonly instant = input(false);
  readonly done = output<void>();

  private readonly artIndex = signal(0);
  protected readonly art = computed(
    () => artUrls(this.caught().speciesId, this.caught().shiny)[this.artIndex()] ?? '',
  );
  protected readonly nature = computed(() => natureNameEs(this.caught().nature));
  protected readonly gender = computed(() => {
    const g = this.caught().gender;
    return g === 'M' ? '♂ Macho' : g === 'F' ? '♀ Hembra' : null;
  });
  protected readonly size = computed(() => sizeClass(this.caught().heightScale));
  protected readonly xpShown = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => this.countUp(this.xp(), this.instant()));
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  /** Si el arte no carga, el siguiente de la lista (CLAUDE.md: no todas las especies tienen todos). */
  protected nextArt(): void {
    this.artIndex.update((i) => i + 1);
  }

  private countUp(to: number, instant: boolean): void {
    clearInterval(this.timer);
    if (instant || to <= 0) {
      this.xpShown.set(Math.max(0, to));
      return;
    }
    let step = 0;
    this.xpShown.set(0);
    this.timer = setInterval(() => {
      step++;
      this.xpShown.set(Math.round((to * step) / XP_STEPS));
      if (step >= XP_STEPS) clearInterval(this.timer);
    }, XP_COUNT_MS / XP_STEPS);
  }
}
```

- [ ] **5d.** → PASA (5). Commit `F2-07: tarjeta de capturado` + push.

### Paso 6 — La página: la coreografía entera

Sustituye el mensaje provisional de F2-05 (`hitPokemon`). Al golpear empieza `preTimeline` (absorber, caer) y a la
vez sale la petición; con la respuesta se añade `resultTimeline` (desde donde acabe lo anterior o desde que llegue).
Cada paso suena y vibra en el fotograma en que empieza (`stepStarted`). Un error: la bola se abre sin sacudidas con
su mensaje; 404/410: el Pokémon se va. El test avanza fotograma a fotograma (cada 100 ms): con un único fotograma al
final, los pasos intermedios no "empiezan" y no suenan.

**Files:** Modify `src/app/features/encounter/encounter.page.ts`, `encounter.page.spec.ts`

- [ ] **6a. Tests:**

```diff
--- a/src/app/features/encounter/encounter.page.spec.ts
+++ b/src/app/features/encounter/encounter.page.spec.ts
@@ -82,12 +82,16 @@
         { provide: BagService, useValue: bag },
         { provide: AudioService, useValue: { playCry, playSfx } },
         // El plugin real de Capacitor no existe en web.
-        { provide: HapticsService, useValue: { tap: vi.fn(), throw: vi.fn() } },
+        {
+          provide: HapticsService,
+          useValue: { tap: vi.fn(), throw: vi.fn(), shake: vi.fn(), success: vi.fn() },
+        },
         {
           provide: DatasetService,
           useValue: {
             load: () => Promise.resolve(),
             species: () => new Map([[25, PIKACHU]]),
+            moves: () => new Map([[85, { names: { es: 'Rayo' } }]]),
           },
         },
         { provide: CameraService, useValue: camera },
@@ -154,16 +158,68 @@
     await settle(f);
   };
 
-  it('lanzar (F2-05): si le da, el servidor decide con la bola elegida y se enseña lo que diga', async () => {
+  /** Deja acabar la coreografía (F2-07, como mucho ~5 s) con un fotograma cada 100 ms; el reloj de `performance` es falso. */
+  const finish = async (f: Awaited<ReturnType<typeof open>>) => {
+    for (let i = 0; i < 80; i++) {
+      vi.advanceTimersByTime(100); // fotograma a fotograma, como en el móvil: cada paso suena al empezar
+      stage.onFrame!(performance.now());
+    }
+    await settle(f);
+  };
+  const result = (over: object) => ({
+    clientThrowId: 't',
+    captured: false,
+    shakes: 0,
+    fled: false,
+    throwQuality: 'none',
+    xpGained: 0,
+    caught: null,
+    bag: { items: [] },
+    ...over,
+  });
+
+  it('lanzar: si le da, el servidor decide con la bola elegida y, capturado, sale la tarjeta (F2-07)', async () => {
     vi.useFakeTimers({ toFake: ['performance'] });
-    api.throw.mockResolvedValueOnce({ captured: true, fled: false, shakes: 3 });
+    api.throw.mockResolvedValueOnce(
+      result({
+        captured: true,
+        shakes: 3,
+        xpGained: 160,
+        caught: { ...view, id: 'c1', nature: 'adamant', moves: [85] },
+      }),
+    );
     const f = await open(Promise.resolve(view));
     await throwAt(f, { power: 1, aim: 0, curve: 0 });
     expect(api.throw).toHaveBeenCalledWith(
       '12:34:5',
       expect.objectContaining({ ball: 'POKE_BALL', berry: null, curve: false }),
     );
+    expect(text(f)).not.toContain('¡Capturado!'); // aún se sacude
+    await finish(f);
     expect(text(f)).toContain('¡Capturado!');
+    expect(text(f)).toContain('Firme');
+    expect(text(f)).toContain('Rayo');
+    expect(playSfx).toHaveBeenCalledWith('capture');
+  });
+
+  it('se escapa: vuelve a haber bola en la mano', async () => {
+    vi.useFakeTimers({ toFake: ['performance'] });
+    api.throw.mockResolvedValueOnce(result({ shakes: 1 }));
+    const f = await open(Promise.resolve(view));
+    await throwAt(f, { power: 1, aim: 0, curve: 0 });
+    await finish(f);
+    expect(text(f)).toContain('¡Se escapó!');
+    const hand = (f.nativeElement as HTMLElement).querySelector('.hand')!;
+    expect(hand.classList.contains('is-off')).toBe(false);
+  });
+
+  it('huye: lo dice', async () => {
+    vi.useFakeTimers({ toFake: ['performance'] });
+    api.throw.mockResolvedValueOnce(result({ fled: true }));
+    const f = await open(Promise.resolve(view));
+    await throwAt(f, { power: 1, aim: 0, curve: 0 });
+    await finish(f);
+    expect(text(f)).toContain('¡Huyó!');
   });
 
   it('un lanzamiento flojo no llega y no llama al servidor (D-046)', async () => {
```

- [ ] **6b.** → FALLAN. **6c. Implementación:**

```diff
--- a/src/app/features/encounter/encounter.page.ts
+++ b/src/app/features/encounter/encounter.page.ts
@@ -14,13 +14,29 @@
 import { IonContent } from '@ionic/angular';
 import { captureChance, type BallId, type ThrowQuality } from '@shared/engine/capture';
 import { hashString } from '@shared/engine/rng';
-import type { EncounterView } from '@shared/protocol/encounters';
+import type { CaughtView, EncounterView, ThrowResult } from '@shared/protocol/encounters';
 import * as THREE from 'three';
 
 import { loadFirstTexture } from '../../game/encounter-scene/art-texture';
+import { BALL_RADIUS_M } from '../../game/encounter-scene/ball-mesh';
+import {
+  ballDropY,
+  preTimeline,
+  resultTimeline,
+  shakeAngle,
+  stepAt,
+  timelineEnd,
+  type SeqItem,
+  type SeqResult,
+} from '../../game/encounter-scene/capture-sequence';
 import { cssColor } from '../../game/encounter-scene/css-color';
 import { cameraYaw } from '../../game/encounter-scene/device-pose';
-import { artUrls, pokemonHeightM, sizeClass } from '../../game/encounter-scene/encounter-layout';
+import {
+  EYE_HEIGHT_M,
+  artUrls,
+  pokemonHeightM,
+  sizeClass,
+} from '../../game/encounter-scene/encounter-layout';
 import { EncounterScene, type PokemonPose } from '../../game/encounter-scene/encounter-scene';
 import {
   EncounterStage,
@@ -58,6 +74,7 @@
 import { SettingsService } from '../../services/game/settings.service';
 import { GameButtonComponent } from '../../shared/ui/game-button.component';
 import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
+import { CaughtCardComponent } from './caught-card.component';
 import { EncounterHudComponent } from './encounter-hud.component';
 import { ThrowDockComponent, type ThrowIntent } from './throw-dock.component';
 
@@ -106,6 +123,22 @@
   curve: boolean;
 }
 
+/** La coreografía de la captura en curso (F2-07). */
+interface Sequence {
+  items: SeqItem[];
+  speed: number;
+  /** Donde golpeó la bola (de ahí cae al suelo). */
+  at: THREE.Vector3;
+  restY: number;
+  last: SeqItem | null;
+  /** Ya respondió el servidor (o falló). */
+  known: boolean;
+  result: ThrowResult | null;
+  /** El Pokémon ya no está (404/410): se va. */
+  gone: boolean;
+  error: string | null;
+}
+
 const prefersReducedMotion = (): boolean =>
   typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
 
@@ -122,6 +155,7 @@
     GlassPanelComponent,
     EncounterHudComponent,
     ThrowDockComponent,
+    CaughtCardComponent,
   ],
   template: `
     <ion-content [scrollY]="false" class="full">
@@ -159,17 +193,29 @@
             @if (toast(); as t) {
               <p class="note toast" role="status">{{ t }}</p>
             }
-            <app-throw-dock
-              class="dock"
-              [ball]="ball()"
-              [berry]="berry()"
-              [qty]="bag.qty()"
-              [disabled]="!canThrow()"
-              (pick)="ball.set($event)"
-              (toggleBerry)="berry.set(!berry())"
-              (grabbed)="onGrab()"
-              (thrown)="launch($event)"
-            />
+            @if (caught(); as c) {
+              <app-caught-card
+                class="caught"
+                [caught]="c.view"
+                [name]="name()"
+                [moveNames]="caughtMoves()"
+                [xp]="c.xp"
+                [instant]="reduce()"
+                (done)="back()"
+              />
+            } @else {
+              <app-throw-dock
+                class="dock"
+                [ball]="ball()"
+                [berry]="berry()"
+                [qty]="bag.qty()"
+                [disabled]="!canThrow()"
+                (pick)="ball.set($event)"
+                (toggleBerry)="berry.set(!berry())"
+                (grabbed)="onGrab()"
+                (thrown)="launch($event)"
+              />
+            }
           }
           @default {
             <app-glass-panel size="lg" class="card">
@@ -244,6 +290,10 @@
     .dock {
       margin-top: auto;
     }
+    .caught {
+      margin: auto;
+      width: min(100%, 360px);
+    }
     .toast {
       font: 700 1.1rem/1 var(--font-display);
     }
@@ -301,7 +351,7 @@
   protected readonly horizon = signal('34%');
   protected readonly arOn = computed(() => this.settings.settings().arEnabled);
   /** "Reducir efectos" (ajustes) o "reducir movimiento" (sistema): sin partículas ni destellos (D-033). */
-  private readonly reduce = computed(
+  protected readonly reduce = computed(
     () => this.settings.settings().reduceEffects || prefersReducedMotion(),
   );
   private readonly species = computed(() => {
@@ -338,6 +388,13 @@
       : 0.5;
     return cssColor([ringToken(chance), '#3ccf8e']);
   });
+  /** Lo capturado (F2-07): la tarjeta de "¡Capturado!". */
+  protected readonly caught = signal<{ view: CaughtView; xp: number } | null>(null);
+  protected readonly caughtMoves = computed(() =>
+    (this.caught()?.view.moves ?? []).map(
+      (id) => this.dataset.moves().get(id)?.names.es ?? `#${id}`,
+    ),
+  );
   protected readonly message = computed(() => {
     if (this.phase() !== 'resolved') return this.error() ?? '';
     return this.view()?.status === 'caught' ? 'Ya lo atrapaste.' : 'Ya se te escapó.';
@@ -365,6 +422,7 @@
   private startedAt = 0;
   private touchedDown = false;
   private flight: InFlight | null = null;
+  private seq: Sequence | null = null;
   private toastTimer?: ReturnType<typeof setTimeout>;
 
   constructor() {
@@ -507,6 +565,7 @@
     world.setRing(this.canThrow(), this.ringColor());
     world.updateRing(pose.lift, ringRadius(t));
     if (this.flight) this.fly(now);
+    if (this.seq) this.playSequence(now);
   }
 
   protected onGrab(): void {
@@ -565,7 +624,7 @@
     if (tf < fl.hit.t) return;
     this.flight = null;
     if (fl.hit.kind === 'miss') this.missed();
-    else void this.hitPokemon(fl);
+    else this.hitPokemon(fl, now);
   }
 
   /** No le dio: la bola se queda un momento en el suelo y vuelve otra a la mano. No gasta nada (D-046). */
@@ -577,29 +636,153 @@
     }, 500);
   }
 
-  /** Le dio: el servidor decide (D-028). F2-07 cambia el mensaje por la coreografía completa. */
-  private async hitPokemon(fl: InFlight): Promise<void> {
+  /**
+   * Le dio (F2-07): empieza la parte conocida de la coreografía (absorber, caer) y a la vez se pregunta al servidor
+   * (D-028); cuando responde se añaden sus sacudidas y el final. Si tarda (Render despertando), la bola espera en el
+   * suelo balanceándose.
+   */
+  private hitPokemon(fl: InFlight, now: number): void {
+    const world = this.world;
+    if (!world?.ball) return;
     void this.audio.playSfx('ball-hit');
     this.haptics.tap();
     if (fl.quality !== 'none') this.showToast(QUALITY_TEXT[fl.quality]);
     if (fl.berry) this.berry.set(false); // la baya se gasta con el lanzamiento
-    try {
-      const res = await this.api.throw(this.id(), {
+    const speed = this.reduce() ? 2 : 1;
+    const seq: Sequence = {
+      items: preTimeline(now, speed),
+      speed,
+      at: world.ball.position.clone(),
+      restY: -EYE_HEIGHT_M + BALL_RADIUS_M,
+      last: null,
+      known: false,
+      result: null,
+      gone: false,
+      error: null,
+    };
+    this.seq = seq;
+    this.api
+      .throw(this.id(), {
         ball: fl.ball,
         berry: fl.berry,
         throwQuality: fl.quality,
         curve: fl.curve,
-      });
-      this.showToast(res.captured ? '¡Capturado!' : res.fled ? '¡Huyó!' : 'Se escapó…');
-      if (res.captured || res.fled) {
-        setTimeout(() => this.back(), 1500);
+      })
+      .then(
+        (res) => this.addResult(seq, res, res),
+        (err: unknown) => {
+          const status = err instanceof HttpErrorResponse ? err.status : undefined;
+          seq.gone = status === 404 || status === 410;
+          seq.error = encounterErrorText(status);
+          // Sin respuesta válida: la bola se abre sin sacudidas (y si ya no está, se va).
+          this.addResult(seq, { captured: false, shakes: 0, fled: seq.gone }, null);
+        },
+      );
+  }
+
+  private addResult(seq: Sequence, r: SeqResult, res: ThrowResult | null): void {
+    if (this.seq !== seq) return;
+    seq.known = true;
+    seq.result = res;
+    seq.items = [
+      ...seq.items,
+      ...resultTimeline(r, Math.max(timelineEnd(seq.items), performance.now()), seq.speed),
+    ];
+  }
+
+  /** Un fotograma de la coreografía. */
+  private playSequence(now: number): void {
+    const seq = this.seq;
+    const world = this.world;
+    if (!seq || !world) return;
+    const { x, y, z } = seq.at;
+    const cur = stepAt(seq.items, now);
+    if (!cur) {
+      if (now < timelineEnd(seq.items)) return;
+      if (!seq.known) {
+        world.poseBall(x, seq.restY, z, 0.08 * Math.sin(now / 250)); // esperando al servidor
         return;
       }
-    } catch (err) {
-      const status = err instanceof HttpErrorResponse ? err.status : undefined;
-      this.showToast(encounterErrorText(status));
+      this.finishSequence(seq);
+      return;
+    }
+    const { item, k } = cur;
+    if (item !== seq.last) {
+      seq.last = item;
+      this.stepStarted(item, now);
+    }
+    switch (item.step) {
+      case 'absorb':
+        world.setCaptureLook(k, Math.min(1, 2 * k));
+        world.poseBall(x, y, z, 0);
+        break;
+      case 'drop':
+        world.setCaptureLook(1, 1);
+        world.poseBall(x, ballDropY(k, y, seq.restY), z, 0);
+        break;
+      case 'shake':
+        world.poseBall(x, seq.restY, z, shakeAngle(k));
+        break;
+      case 'burst':
+        world.setCaptureLook(1 - k, 1 - k);
+        break;
+      case 'flee':
+        world.setOpacity(1 - k);
+        break;
+      default: // pause, click
+        world.poseBall(x, seq.restY, z, 0);
+    }
+  }
+
+  /** Sonido y vibración en el MISMO fotograma en que empieza cada paso (DISENO §4.10). */
+  private stepStarted(item: SeqItem, now: number): void {
+    switch (item.step) {
+      case 'absorb':
+        void this.audio.playSfx('absorb');
+        break;
+      case 'shake':
+        void this.audio.playSfx('shake');
+        this.haptics.shake();
+        break;
+      case 'click':
+        void this.audio.playSfx('capture');
+        this.haptics.success();
+        if (!this.reduce()) {
+          this.world?.startBurst(
+            (now - this.startedAt) / 1000,
+            cssColor(['--gold', '#ffcb3d']),
+            true,
+          );
+        }
+        break;
+      case 'burst':
+        void this.audio.playSfx('escape');
+        void this.audio.playCry(this.view()?.speciesId ?? 0);
+        this.haptics.tap();
+        this.world?.removeBall();
+        break;
+    }
+  }
+
+  private finishSequence(seq: Sequence): void {
+    this.seq = null;
+    const res = seq.result;
+    if (seq.error) this.showToast(seq.error, 2000);
+    if (res?.captured && res.caught) {
+      this.world?.removeBall();
+      this.caught.set({ view: res.caught, xp: res.xpGained });
+      return; // la tarjeta decide (Volver al mapa)
+    }
+    if (res?.fled || seq.gone) {
+      if (!seq.error) this.showToast('¡Huyó!');
+      setTimeout(() => this.back(), 1500);
+      return;
     }
+    // Se escapó: el encuentro sigue.
+    this.world?.setCaptureLook(0, 0);
+    this.world?.setOpacity(this.personality.ghostly ? 0.7 : 1);
     this.world?.removeBall();
+    if (!seq.error) this.showToast('¡Se escapó!');
     this.busy.set(false);
   }
 
@@ -680,6 +863,8 @@
 
   private teardown(): void {
     this.flight = null;
+    this.seq = null;
+    this.caught.set(null);
     this.busy.set(false);
     clearTimeout(this.toastTimer);
     this.stage?.dispose();
```

- [ ] **6d.** `npx ng test --include=src/app/features/encounter/encounter.page.spec.ts --watch=false` → PASA (13). Commit + push.

### Paso 7 — Verde y Android

- [ ] **7a.** `npm run lint` · `npm run build` · `npm test -- --watch=false` (referencia: **73 archivos / 393 tests**) ·
  `npm run test:shared` (**143**) · `cd server && npm run build && npm test` (**22**).
- [ ] **7b.** Android: grabar (`adb shell screenrecord`) una captura completa (golpe → luz roja → cae → 3 sacudidas con
  vibración → clic con estrellas y fanfarria → tarjeta con la XP contando) y un escape (sale con su grito y se puede
  volver a lanzar). Comprobar que el capturado ya no está en el mapa al volver y que la XP del HUD subió. Con Render
  dormido (tras 15 min), la bola espera balanceándose y la secuencia sigue al despertar. Evidencias `F2-07_*`.
- [ ] **7c.** El shiny se prueba con los tests (y en el móvil si sale: 1/512; forzarlo es el modo demo de F8-05).
- [ ] **7d.** REGLA 2 y PR. Con F2-07 hecho, **F2 está completa** salvo F2-10 (música): siguiente, F4-07 (combate en
  AR), que reutiliza `CameraService`, `OrientationService`, `EncounterStage` y la escena (D-034).

---

## Riesgos y cosas por medir

| Riesgo | Qué hacer |
| --- | --- |
| El FOV de 64° y el retraso de 80 ms se calibraron a ojo en el A36; en otro móvil el Pokémon podría "patinar" | Medir en el Redmi de Samuel con `/dev/ar` (PENDIENTES en ESTADO). Si cambia mucho: ajuste en Ajustes o tabla por modelo (`navigator.userAgent`) |
| La cámara principal se elige por la etiqueta "camera N, facing back" | Si un móvil no pone el número, `mainBackCamera` da `undefined` y se queda con la de `facingMode` (funciona, quizá con el gran angular). Anotar el móvil en D-045 |
| Vídeo a ~24 fps en interior (autoexposición) | Aceptado (D-045): el Pokémon y los efectos van a 60. No forzar exposición manual |
| Calor/batería con cámara + WebGL + sensores | F8-02: 10 min seguidos en el A36 y el Redmi |
| La física "normalizada" puede sentirse demasiado fácil o difícil | Las constantes están en `throw-gesture.ts` (`REF_FLICK_PX_S`) y `throw-physics.ts` (`flightTime`, `MIN_*`): ajustarlas en el móvil y anotar el cambio en D-046 |
| El cliente decide si la bola TOCA | Solo da ventaja dentro de lo que el servidor ya acepta: la captura, la huida y el gasto los decide él; un "excelente" inverosímil lo rebaja (D-028). Fallar no gasta nada: tramposo o no, no gana nada |
| Render dormido en mitad de la captura | La secuencia espera en el suelo (sin límite propio: `ENCOUNTER_TIMEOUT_MS` = 70 s y luego el error) |

## Autorrevisión del plan (writing-plans)

- **Cobertura del ROADMAP:** F2-04 (cámara/fondo ilustrado, tamaño real con XS/XL, idle/esquiva por velocidad,
  efectos por tipo, transición desde el mapa) → F2-04a + F2-04b. F2-05 (gesto 1:1, física, curva, círculo de precisión,
  bolas y bayas, hápticos) → F2-05. F2-07 (absorción, sacudidas, fanfarria, recompensas, "¡Capturado!" con datos del
  individuo, shiny) → F2-07 (el destello shiny de la aparición está en F2-04b). F2-10 (música) queda fuera a propósito.
- **Sin huecos:** todos los pasos de código llevan el código (verificado) y el comando con su resultado esperado.
- **Nombres coherentes** entre tareas (comprobado compilando cada capa encima de la anterior): `EncounterScene`
  (`placeAt`, `update`, `animate`, `setFx`, `startBurst`, `setRing`, `updateRing`, `throwTarget`, `spawnBall`,
  `setBallInThrowFrame`, `poseBall`, `setCaptureLook`, `removeBall`), `EncounterStageLike`, `ENCOUNTER_STAGE`,
  `EncounterApiService.view/throw`, `CameraService.open/close/state`, `OrientationService.start/stop/pose/ready/source`.
