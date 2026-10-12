# F1 · Mapa con GPS — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP
> (`F1-03`, `F1-04`, `F1-05`, `F1-07`) = **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2.
> Marca las casillas `- [ ]` de TU tarea en TU rama según avances: son el punto de guardado del siguiente compañero.
> Los pasos de código siguen TDD: test que falla → código mínimo → test en verde → commit.

**Objetivo:** el mapa es la pantalla principal del juego: Google Maps vectorial inclinado que sigue al jugador por GPS
(o joystick) y gira con su brújula, un avatar 3D que camina/corre según la velocidad real, y los Pokémon de
`GET /spawns` apareciendo entre la hierba, con su grito cerca, y que se tocan para ir al encuentro.

**Arquitectura (ARQUITECTURA §4, D-008, D-022, D-035):**

```
@capacitor/geolocation ─> LocationService ─(GpsFilter)─> position ┐
joystick (modo demo) ───> LocationService.nudge() ────────────────┤
deviceorientationabsolute ─> CompassService ─(smoothAngle)─> heading
                                                                  ▼
MapPage (Angular, /mapa) ── rAF ──> AvatarMotion.step(dt) ──> MapScene (three.js, sin Angular)
   │  google.maps.Map (vector, tilt 67,5°)        ▲                ├─ Avatar3D        (F1-05)
   │  ThreeJSOverlayView(anchor = origen)  ───────┘                └─ SpawnLayer      (F1-07)
   └─ SpawnFeedService ── GET /spawns ──> diffSpawns ──> SpawnLayer.sync()
```

- **Lógica pura y con tests** (sin Angular, sin three.js): `shared/engine/geo.ts`, `src/app/game/geo/*`,
  `src/app/game/map-scene/avatar-motion.ts`, `spawn-diff.ts`, `appear.ts`, `refetch.ts`. Aquí está lo difícil
  (filtros, ángulos, animaciones por tiempo) y es lo que se prueba.
- **Presentación three.js** en `src/app/game/map-scene/` (ARQUITECTURA §2: "motores de presentación, sin Angular").
- **Pantalla** en `src/app/features/map/` (Angular, signals, zoneless).
- **Plan A confirmado (D-035):** `ThreeJSOverlayView`, **como mucho 30 Pokémon dibujados** (los más cercanos).
- **Coordenadas de la escena:** metros locales respecto a un **origen** (el primer fix). `x = este`, `z = −norte`
  (three.js con `upAxis: 'Y'`: +Z apunta al sur), `y = arriba`. Si el jugador se aleja > 1 km del origen se
  re-ancla (`overlay.setAnchor`) y se recalculan las posiciones (precisión de float32).
- **El servidor manda** (REGLA 3): el cliente nunca decide qué Pokémon hay ni si está "cerca" para capturar. El
  alcance de 40 m del cliente es solo UX (el servidor permite 80 m, D-028).

**Tech stack:** Angular 22 (zoneless, signals), Ionic 9 (`@ionic/angular`), Google Maps JS (`@googlemaps/js-api-loader`
2.1.3), `@googlemaps/three` 4.0.13, three 0.186.1, `@capacitor/geolocation` **8.2.3** (nuevo, versión exacta),
Vitest (`ng test` en jsdom para `src/`, `npm run test:shared` en Node para `shared/`).

---

## Orden y paralelismo

```
F1-03 ubicación + brújula + joystick ─> F1-04 pantalla /mapa ─> F1-05 avatar 3D ─> F1-07 Pokémon en el mapa
```

Secuencial: cada una usa lo de la anterior. **Todas necesitan un Android real** para el criterio (GPS, brújula,
fps). En el PC se prueba con el joystick y la vista móvil 390×844.

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `shared/engine/geo.ts` (+ spec) | F1-03 | `LatLng`, `distanceM`, `toLocalM`, `fromLocalM`, `bearingDeg` |
| `src/app/game/geo/gps-filter.ts` (+ spec) | F1-03 | Descarta fixes malos y saltos, suaviza (media ponderada) |
| `src/app/game/geo/angles.ts` (+ spec) | F1-03 | `normDeg`, `deltaDeg`, `smoothAngle`, `headingFromAlpha` |
| `src/app/game/geo/joystick-math.ts` (+ spec) | F1-03 | Vector del joystick → velocidad este/norte según la cámara |
| `src/app/services/location/location.service.ts` (+ spec) | F1-03 | GPS (`watchPosition`), estado, permiso, modo joystick |
| `src/app/services/location/compass.service.ts` (+ spec) | F1-03 | `heading` suavizado desde `deviceorientationabsolute` |
| `src/app/shared/ui/joystick.component.ts` | F1-03 | Joystick en pantalla (Pointer Events) |
| `src/app/game/map-scene/avatar-motion.ts` (+ spec) | F1-03 | Interpolación del avatar a 60 fps, velocidad, marcha |
| `src/app/features/dev-map/dev-map.page.ts` | F1-03 | Modo "Sígueme" para probar F1-03 antes de que exista `/mapa` |
| `shared/protocol/spawns.ts` | F1-04 | Contrato de `GET /spawns` (también lo importa el servidor) |
| `server/src/spawns/spawns.service.ts` (+ e2e) | F1-04 | `weather` y `night` en la respuesta (para el HUD) |
| `src/app/game/map-scene/day-night.ts` (+ spec) | F1-04 | Noche 19:00-6:00 local |
| `src/app/game/map-scene/map-scene.ts` | F1-04 | Escena three.js del mapa (origen, avatar provisional, círculo) |
| `src/app/features/map/map.page.ts` | F1-04 | Pantalla `/mapa`: mapa, overlay, bucle, cámara, estados |
| `src/app/features/map/location-gate.component.ts` | F1-03 | Pedir permiso / denegado / buscando GPS (DISENO §6) |
| `src/app/features/map/map-compass.component.ts` | F1-04 | Brújula del HUD (toca → "norte arriba") |
| `src/app/features/map/weather-chip.component.ts` | F1-04 | Clima del HUD |
| `src/app/features/map/ball-menu.component.ts` | F1-04 | Botón Poké Ball + hoja con el menú (sustituye a las pestañas) |
| `src/app/app.routes.ts`, `core/layout/tabs/**` | F1-04 | `/mapa` principal, `/pokedex`, fuera las pestañas |
| `src/app/game/map-scene/avatar-3d.ts`, `limb-pose.ts` (+ spec) | F1-05 | Personaje low-poly animado, sombra, círculo de alcance |
| `src/app/game/map-scene/spawn-diff.ts` (+ spec) | F1-07 | Altas/bajas entre dos respuestas y los N más cercanos |
| `src/app/game/map-scene/refetch.ts` (+ spec) | F1-07 | Cuándo volver a pedir `/spawns` |
| `src/app/game/map-scene/appear.ts` (+ spec) | F1-07 | Curva de aparición/desaparición (hierba → salto) |
| `src/app/game/map-scene/sprite-textures.ts` | F1-07 | Texturas con fallback `home` → `official-artwork` → `front_default`, LRU |
| `src/app/game/map-scene/spawn-layer.ts` | F1-07 | Sprites, sombras, hierba instanciada, raycast |
| `src/app/services/game/spawn-feed.service.ts` (+ spec) | F1-07 | `GET /spawns` con la política de `refetch.ts` |
| `src/app/services/game/audio.service.ts` (+ spec) | F1-07 | `playCry(id, gain)` para el grito bajito por cercanía |
| `src/app/features/encounter/encounter.page.ts` | F1-07 | `/encuentro/:id` **provisional** (lo sustituye F2-04) |

---

## F1-03 · Ubicación y brújula

**Criterio (ROADMAP):** tests del filtro; el avatar se mueve suave caminando de verdad y con joystick.

### Paso 1 — `shared/engine/geo.ts`

**Files:** Create `shared/engine/geo.ts`, Test `shared/engine/geo.spec.ts`

- [x] **1a. Test que falla** (`shared/engine/geo.spec.ts`):

```ts
import { bearingDeg, distanceM, fromLocalM, toLocalM } from './geo.js';

const NEIVA = { lat: 2.9273, lng: -75.2819 };

describe('geo', () => {
  it('distanceM: 0,001° de latitud ≈ 111,32 m', () => {
    expect(distanceM(NEIVA, { lat: NEIVA.lat + 0.001, lng: NEIVA.lng })).toBeCloseTo(111.32, 1);
  });

  it('distanceM: igual que el servidor (equirectangular) en longitud', () => {
    const p = { lat: NEIVA.lat, lng: NEIVA.lng + 0.001 };
    expect(distanceM(NEIVA, p)).toBeCloseTo(111.32 * Math.cos((NEIVA.lat * Math.PI) / 180), 1);
  });

  it('toLocalM / fromLocalM son inversas', () => {
    const p = fromLocalM(NEIVA, 120, -35);
    const back = toLocalM(NEIVA, p);
    expect(back.east).toBeCloseTo(120, 6);
    expect(back.north).toBeCloseTo(-35, 6);
  });

  it('bearingDeg: norte 0, este 90, sur 180, oeste 270', () => {
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 0, 10))).toBeCloseTo(0, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 10, 0))).toBeCloseTo(90, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, 0, -10))).toBeCloseTo(180, 6);
    expect(bearingDeg(NEIVA, fromLocalM(NEIVA, -10, 0))).toBeCloseTo(270, 6);
  });
});
```

- [x] **1b.** `npm run test:shared -- geo` → FALLA (`Cannot find module './geo.js'`).
- [x] **1c. Implementación** (`shared/engine/geo.ts`):

```ts
/**
 * Geometría para distancias cortas (< 2 km) en el mapa: aproximación equirectangular, la misma que usa el servidor
 * en `server/src/location/location.service.ts` (error despreciable a esas distancias). `east`/`north` en metros.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocalM {
  east: number;
  north: number;
}

export const M_PER_DEG_LAT = 111_320;

const mPerDegLng = (lat: number): number => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

export function toLocalM(origin: LatLng, p: LatLng): LocalM {
  return {
    east: (p.lng - origin.lng) * mPerDegLng((origin.lat + p.lat) / 2),
    north: (p.lat - origin.lat) * M_PER_DEG_LAT,
  };
}

export function fromLocalM(origin: LatLng, east: number, north: number): LatLng {
  const lat = origin.lat + north / M_PER_DEG_LAT;
  return { lat, lng: origin.lng + east / mPerDegLng((origin.lat + lat) / 2) };
}

export function distanceM(a: LatLng, b: LatLng): number {
  const { east, north } = toLocalM(a, b);
  return Math.hypot(east, north);
}

/** Rumbo de `a` hacia `b` en grados: 0 = norte, 90 = este (sentido horario). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const { east, north } = toLocalM(a, b);
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
}
```

- [x] **1d.** `npm run test:shared -- geo` → PASA (4 tests).
- [x] **1e.** Commit `F1-03: geo.ts (distancias y metros locales) con tests` + push (`/guardar`).

### Paso 2 — Filtro del GPS

**Files:** Create `src/app/game/geo/gps-filter.ts`, Test `src/app/game/geo/gps-filter.spec.ts`

Reglas (ARQUITECTURA §4): se ignoran fixes con precisión peor de 50 m (salvo el primero, marcado como débil); se
descartan los **saltos de > 50 m en < 2 s** (errores del GPS); se suaviza con una media de los 4 últimos ponderada por
`1/precisión²`; un fix con hora repetida o anterior se ignora. Señal débil = precisión > 25 m.

- [x] **2a. Test que falla:**

```ts
import { fromLocalM, toLocalM } from '@shared/engine/geo';
import { GpsFilter, type GpsFix } from './gps-filter';

const O = { lat: 2.9273, lng: -75.2819 };
const fix = (east: number, north: number, t: number, accuracy = 5): GpsFix => ({
  ...fromLocalM(O, east, north),
  accuracy,
  timestamp: t,
});

describe('GpsFilter', () => {
  it('el primer fix pasa tal cual', () => {
    const out = new GpsFilter().push(fix(0, 0, 1000))!;
    expect(out.lat).toBeCloseTo(O.lat, 9);
    expect(out.weak).toBe(false);
  });

  it('un primer fix malo (80 m) se acepta pero marcado como débil', () => {
    expect(new GpsFilter().push(fix(0, 0, 1000, 80))!.weak).toBe(true);
  });

  it('con un fix bueno ya, uno de precisión > 50 m se ignora', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000));
    expect(f.push(fix(30, 0, 3000, 60))).toBeNull();
  });

  it('descarta un salto de 120 m en 1 s y acepta el mismo sitio 2 s después', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000));
    expect(f.push(fix(120, 0, 2000))).toBeNull();
    expect(f.push(fix(120, 0, 3000))).not.toBeNull();
  });

  it('ignora fixes con hora repetida o anterior', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 5000));
    expect(f.push(fix(1, 0, 5000))).toBeNull();
    expect(f.push(fix(1, 0, 4000))).toBeNull();
  });

  it('suaviza ruido de ±6 m alrededor del mismo punto (queda a < 3 m)', () => {
    const f = new GpsFilter();
    let out = null;
    for (let i = 0; i < 8; i++) out = f.push(fix(i % 2 ? 6 : -6, 0, 1000 + i * 1000));
    expect(Math.abs(toLocalM(O, out!).east)).toBeLessThan(3);
  });

  it('pondera por precisión: un fix de 4 m pesa más que uno de 20 m', () => {
    const f = new GpsFilter();
    f.push(fix(0, 0, 1000, 20));
    const out = f.push(fix(10, 0, 2000, 4))!;
    expect(toLocalM(O, out).east).toBeGreaterThan(9);
  });
});
```

- [x] **2b.** `npx ng test --watch=false --include src/app/game/geo/gps-filter.spec.ts` → FALLA.
- [x] **2c. Implementación:**

```ts
import { distanceM, type LatLng } from '@shared/engine/geo';

export interface GpsFix extends LatLng {
  /** Radio de error en metros (68 %), como lo da el sistema. */
  accuracy: number;
  /** ms desde epoch. */
  timestamp: number;
}

export interface FilteredFix extends GpsFix {
  /** Precisión peor de WEAK_ACCURACY_M: el HUD avisa "GPS débil" (DISENO §6, sin bloquear). */
  weak: boolean;
}

export const MAX_ACCURACY_M = 50;
export const WEAK_ACCURACY_M = 25;
export const JUMP_M = 50;
export const JUMP_WINDOW_MS = 2000;
const WINDOW = 4;

/** Filtro del GPS (ARQUITECTURA §4). Puro: sin Angular ni Capacitor, para poder probarlo. */
export class GpsFilter {
  private readonly window: GpsFix[] = [];

  /** Devuelve la posición suavizada, o `null` si el fix se descarta. */
  push(fix: GpsFix): FilteredFix | null {
    if (![fix.lat, fix.lng, fix.accuracy, fix.timestamp].every(Number.isFinite)) return null;
    const prev = this.window.at(-1);
    if (prev) {
      if (fix.timestamp <= prev.timestamp) return null;
      if (fix.accuracy > MAX_ACCURACY_M) return null;
      const dt = fix.timestamp - prev.timestamp;
      if (dt < JUMP_WINDOW_MS && distanceM(prev, fix) > JUMP_M) return null;
    }
    this.window.push(fix);
    if (this.window.length > WINDOW) this.window.shift();

    let wSum = 0;
    let lat = 0;
    let lng = 0;
    for (const f of this.window) {
      const w = 1 / Math.max(1, f.accuracy) ** 2;
      wSum += w;
      lat += f.lat * w;
      lng += f.lng * w;
    }
    return {
      lat: lat / wSum,
      lng: lng / wSum,
      accuracy: fix.accuracy,
      timestamp: fix.timestamp,
      weak: fix.accuracy > WEAK_ACCURACY_M,
    };
  }

  reset(): void {
    this.window.length = 0;
  }
}
```

Nota: la media de 4 fixes "arrastra" ~1-2 s al caminar; lo compensa la interpolación del avatar (paso 5), que ya va
detrás del objetivo. Si en el móvil se nota retraso, bajar `WINDOW` a 3 (y anotarlo).

- [x] **2d.** El mismo comando → PASA (7 tests).
- [x] **2e.** Commit `F1-03: filtro del GPS con tests` + `/guardar`.

### Paso 3 — Ángulos y joystick (puros)

**Files:** Create `src/app/game/geo/angles.ts`, `src/app/game/geo/joystick-math.ts`; Tests `angles.spec.ts`,
`joystick-math.spec.ts` (misma carpeta).

- [x] **3a. Tests que fallan:**

```ts
// angles.spec.ts
import { deltaDeg, headingFromAlpha, normDeg, smoothAngle } from './angles';

describe('angles', () => {
  it('normDeg lleva a [0, 360)', () => {
    expect(normDeg(-10)).toBe(350);
    expect(normDeg(725)).toBe(5);
  });
  it('deltaDeg toma el camino corto', () => {
    expect(deltaDeg(350, 10)).toBe(20);
    expect(deltaDeg(10, 350)).toBe(-20);
    expect(deltaDeg(0, 180)).toBe(-180);
  });
  it('smoothAngle cruza el norte sin dar la vuelta por el sur', () => {
    expect(smoothAngle(359, 1, 0.5)).toBeCloseTo(0, 6);
    expect(smoothAngle(350, 10, 0.25)).toBeCloseTo(355, 6);
  });
  it('headingFromAlpha: alpha 90 en vertical = mira al oeste (270); con la pantalla girada 90 = norte', () => {
    expect(headingFromAlpha(90, 0)).toBe(270);
    expect(headingFromAlpha(90, 90)).toBe(0);
  });
});
```

```ts
// joystick-math.spec.ts
import { JOYSTICK_DEADZONE, JOYSTICK_MAX_MS, joystickVelocity } from './joystick-math';

describe('joystickVelocity', () => {
  it('dentro de la zona muerta no se mueve', () => {
    expect(joystickVelocity(JOYSTICK_DEADZONE * 0.9, 0, 0)).toEqual({ east: 0, north: 0 });
  });
  it('arriba del todo con la cámara al norte = norte a la velocidad máxima', () => {
    const v = joystickVelocity(0, -1, 0);
    expect(v.north).toBeCloseTo(JOYSTICK_MAX_MS, 6);
    expect(v.east).toBeCloseTo(0, 6);
  });
  it('arriba con la cámara mirando al este = este', () => {
    const v = joystickVelocity(0, -1, 90);
    expect(v.east).toBeCloseTo(JOYSTICK_MAX_MS, 6);
    expect(v.north).toBeCloseTo(0, 6);
  });
  it('fuera del círculo se recorta a 1', () => {
    const v = joystickVelocity(3, 0, 0);
    expect(Math.hypot(v.east, v.north)).toBeCloseTo(JOYSTICK_MAX_MS, 6);
  });
});
```

- [x] **3b.** `npx ng test --watch=false --include "src/app/game/geo/*.spec.ts"` → FALLA.
- [x] **3c. Implementación:**

```ts
// angles.ts — grados de brújula: 0 = norte, sentido horario.
export const normDeg = (d: number): number => ((d % 360) + 360) % 360;

/** Diferencia más corta de `from` a `to`, en [-180, 180). */
export const deltaDeg = (from: number, to: number): number =>
  normDeg(to - from + 180) - 180;

/** Suavizado circular: avanza `alpha` (0..1) del camino corto hacia `next`. */
export const smoothAngle = (prev: number, next: number, alpha: number): number =>
  normDeg(prev + deltaDeg(prev, next) * alpha);

/**
 * `deviceorientationabsolute.alpha` gira en sentido antihorario desde el norte; el rumbo de brújula es `360 − alpha`,
 * corregido por la rotación de la pantalla (`screen.orientation.angle`).
 */
export const headingFromAlpha = (alpha: number, screenAngle: number): number =>
  normDeg(360 - alpha + screenAngle);
```

```ts
// joystick-math.ts
export const JOYSTICK_DEADZONE = 0.15;
/** Velocidad con el joystick al tope: trote (con la mitad se camina, F1-05 elige la animación por velocidad). */
export const JOYSTICK_MAX_MS = 4;

/**
 * (dx, dy) = desplazamiento del mando en radios (−1..1, y hacia abajo como la pantalla). Arriba = hacia donde mira
 * la cámara (`headingDeg`). Devuelve metros por segundo hacia el este y el norte.
 */
export function joystickVelocity(dx: number, dy: number, headingDeg: number): { east: number; north: number } {
  let mag = Math.hypot(dx, dy);
  if (mag < JOYSTICK_DEADZONE) return { east: 0, north: 0 };
  const scale = Math.min(1, mag) / mag;
  mag = Math.min(1, mag);
  const fwd = -dy * scale; // arriba de la pantalla = adelante
  const right = dx * scale;
  const h = (headingDeg * Math.PI) / 180;
  const speed = JOYSTICK_MAX_MS * ((mag - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE)) / mag;
  return {
    east: (fwd * Math.sin(h) + right * Math.cos(h)) * speed,
    north: (fwd * Math.cos(h) - right * Math.sin(h)) * speed,
  };
}
```

Ojo en el test "arriba del todo": con `dy = -1`, `mag = 1` → `speed = MAX`; la velocidad crece desde 0 al salir de la
zona muerta (sin salto).

- [x] **3d.** Mismo comando → PASA (8 tests).
- [x] **3e.** Commit `F1-03: ángulos y joystick con tests` + `/guardar`.

### Paso 4 — `LocationService` y `CompassService`

**Files:** Create `src/app/services/location/location.service.ts`, `compass.service.ts` (+ specs). Modify
`package.json` (dependencia).

- [x] **4a. Dependencia:** `npm install --save-exact @capacitor/geolocation@8.2.3` y `npx cap sync android`. Los
  permisos ya están en `AndroidManifest.xml` (F0-09). Anotar la versión en el commit.
- [x] **4b. Test que falla** (`location.service.spec.ts`). Plugin por token de inyección (D-016), nada de `vi.mock`:

```ts
import { TestBed } from '@angular/core/testing';
import { fromLocalM } from '@shared/engine/geo';
import { GEOLOCATION_PLUGIN, LocationService, type GeoPlugin } from './location.service';
import { SettingsService } from '../game/settings.service';

const O = { lat: 2.9273, lng: -75.2819 };

function fakePlugin(permission: 'granted' | 'denied' | 'prompt') {
  let cb: ((p: unknown, err?: unknown) => void) | undefined;
  const plugin: GeoPlugin = {
    checkPermissions: async () => ({ location: permission, coarseLocation: permission }),
    requestPermissions: async () => ({ location: permission, coarseLocation: permission }),
    watchPosition: async (_opts, callback) => {
      cb = callback as typeof cb;
      return 'w1';
    },
    clearWatch: async () => undefined,
  };
  const emit = (east: number, north: number, t: number, accuracy = 5) => {
    const p = fromLocalM(O, east, north);
    cb!({ coords: { latitude: p.lat, longitude: p.lng, accuracy }, timestamp: t });
  };
  return { plugin, emit };
}

describe('LocationService', () => {
  // SettingsService guarda en localStorage: sin esto, el modo joystick de un test se arrastra al siguiente.
  beforeEach(() => localStorage.clear());

  function setup(permission: 'granted' | 'denied' | 'prompt') {
    const fake = fakePlugin(permission);
    TestBed.configureTestingModule({ providers: [{ provide: GEOLOCATION_PLUGIN, useValue: fake.plugin }] });
    return { svc: TestBed.inject(LocationService), ...fake };
  }

  it('con permiso: arranca, pasa a "ok" con el primer fix y publica la posición', async () => {
    const { svc, emit } = setup('granted');
    await svc.start();
    expect(svc.status()).toBe('searching');
    emit(0, 0, 1000);
    expect(svc.status()).toBe('ok');
    expect(svc.position()!.lat).toBeCloseTo(O.lat, 6);
  });

  it('sin permiso: estado "denied" y se activa el modo joystick', async () => {
    const { svc } = setup('denied');
    await svc.start();
    expect(svc.status()).toBe('denied');
    expect(TestBed.inject(SettingsService).settings().joystickMode).toBe(true);
  });

  it('el joystick mueve la posición virtual aunque no haya GPS', async () => {
    const { svc } = setup('denied');
    await svc.start();
    svc.useJoystickAt(O);
    svc.nudge(0, 10); // 10 m al norte
    expect(svc.position()!.lat).toBeGreaterThan(O.lat);
    expect(svc.status()).toBe('joystick');
  });

  it('un fix débil pone el estado "weak" (avisa, no bloquea)', async () => {
    const { svc, emit } = setup('granted');
    await svc.start();
    emit(0, 0, 1000, 40);
    expect(svc.status()).toBe('weak');
    expect(svc.position()).not.toBeNull();
  });
});
```

- [x] **4c.** `npx ng test --watch=false --include src/app/services/location/location.service.spec.ts` → FALLA.
- [x] **4d. Implementación** (`location.service.ts`):

```ts
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { fromLocalM, type LatLng } from '@shared/engine/geo';
import { GpsFilter, type FilteredFix } from '../../game/geo/gps-filter';
import { SettingsService } from '../game/settings.service';

/** Lo que se usa del plugin (inyectable para los tests, D-016). */
export type GeoPlugin = Pick<
  typeof Geolocation,
  'checkPermissions' | 'requestPermissions' | 'watchPosition' | 'clearWatch'
>;
export const GEOLOCATION_PLUGIN = new InjectionToken<GeoPlugin>('GEOLOCATION_PLUGIN', {
  providedIn: 'root',
  factory: () => Geolocation,
});

/** idle → (prompt) → searching → ok/weak; denied/unavailable → modo joystick; joystick = posición virtual. */
export type LocationStatus = 'idle' | 'prompt' | 'searching' | 'ok' | 'weak' | 'denied' | 'unavailable' | 'joystick';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly plugin = inject(GEOLOCATION_PLUGIN);
  private readonly settings = inject(SettingsService);
  private readonly filter = new GpsFilter();
  private watchId: string | null = null;

  readonly status = signal<LocationStatus>('idle');
  readonly position = signal<FilteredFix | null>(null);

  /** Pide permiso si hace falta y empieza a escuchar el GPS. Nunca lanza: los fallos van a `status`. */
  async start(): Promise<void> {
    if (this.settings.settings().joystickMode) return this.status.set('joystick');
    try {
      let perm = (await this.plugin.checkPermissions()).location;
      if (perm === 'prompt' || perm === 'prompt-with-rationale') {
        this.status.set('prompt');
        perm = (await this.plugin.requestPermissions({ permissions: ['location'] })).location;
      }
      if (perm !== 'granted') return this.fallBackToJoystick('denied');
      this.status.set('searching');
      this.watchId = await this.plugin.watchPosition(
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
        (pos, err) => {
          if (err || !pos) {
            if (!this.position()) this.status.set('searching');
            return;
          }
          const out = this.filter.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
          if (!out || this.settings.settings().joystickMode) return;
          this.position.set(out);
          this.status.set(out.weak ? 'weak' : 'ok');
        },
      );
    } catch (err) {
      console.warn('[location] GPS no disponible', err);
      this.fallBackToJoystick('unavailable');
    }
  }

  async stop(): Promise<void> {
    if (this.watchId) await this.plugin.clearWatch({ id: this.watchId });
    this.watchId = null;
    this.filter.reset();
  }

  /** Activa el modo joystick partiendo de `origin` (la última posición real, o el centro por defecto). */
  useJoystickAt(origin: LatLng): void {
    this.settings.update({ joystickMode: true });
    this.position.set({ ...origin, accuracy: 0, timestamp: Date.now(), weak: false });
    this.status.set('joystick');
  }

  /** Mueve la posición virtual del joystick `east`/`north` metros. */
  nudge(east: number, north: number): void {
    const p = this.position();
    if (!p || this.status() !== 'joystick') return;
    this.position.set({ ...fromLocalM(p, east, north), accuracy: 0, timestamp: Date.now(), weak: false });
  }

  /** Vuelve al GPS real (botón en el menú de ajustes). */
  async useGps(): Promise<void> {
    this.settings.update({ joystickMode: false });
    this.filter.reset();
    await this.start();
  }

  private fallBackToJoystick(reason: 'denied' | 'unavailable'): void {
    this.settings.update({ joystickMode: true });
    this.status.set(reason);
  }
}
```

`status` se queda en `denied`/`unavailable` hasta que la pantalla llama a `useJoystickAt` (así la pantalla de permisos
puede explicar qué pasó antes de soltar al jugador con el joystick).

- [x] **4e.** Test → PASA (4).
- [x] **4f. `CompassService`** (test primero; mismo patrón). Contrato:

```ts
// compass.service.ts
export const ORIENTATION_SOURCE = new InjectionToken<EventTarget>('ORIENTATION_SOURCE', {
  providedIn: 'root',
  factory: () => window,
});
export const COMPASS_ALPHA = 0.15; // suavizado por evento (~60 Hz → responde en ~0,3 s)

@Injectable({ providedIn: 'root' })
export class CompassService {
  /** Rumbo suavizado (0 = norte) o null si el móvil no da orientación absoluta (el mapa queda "norte arriba"). */
  readonly heading = signal<number | null>(null);
  start(): void;  // addEventListener('deviceorientationabsolute', …): si `e.absolute` y alpha != null →
                  // h = headingFromAlpha(e.alpha, screen.orientation?.angle ?? 0);
                  // heading.set(prev == null ? h : smoothAngle(prev, h, COMPASS_ALPHA))
  stop(): void;
}
```

  Tests: un evento con `alpha 90` → `heading()` = 270; dos eventos 359 y 1 → se queda cerca de 359-0 (nunca ~180);
  sin eventos → `null`. Los eventos se disparan con `source.dispatchEvent(Object.assign(new Event(
  'deviceorientationabsolute'), { alpha: 90, absolute: true }))` sobre un `new EventTarget()` inyectado.
- [x] **4g.** Tests → PASAN. Commit `F1-03: LocationService y CompassService con tests` + `/guardar`.

### Paso 5 — Movimiento del avatar (puro)

**Files:** Create `src/app/game/map-scene/avatar-motion.ts`, Test `avatar-motion.spec.ts`

- [x] **5a. Test que falla:**

```ts
import { AvatarMotion, RUN_MIN_MS, TELEPORT_M, WALK_MIN_MS } from './avatar-motion';

/** Simula `seconds` a 60 fps con el objetivo moviéndose a `v` m/s hacia el este. */
function walk(m: AvatarMotion, v: number, seconds: number) {
  let east = m.target.east;
  let out = m.step(0);
  for (let i = 0; i < seconds * 60; i++) {
    east += v / 60;
    m.setTarget(east, 0);
    out = m.step(1 / 60);
  }
  return out;
}

describe('AvatarMotion', () => {
  it('quieto → idle', () => {
    const m = new AvatarMotion();
    expect(walk(m, 0, 2).gait).toBe('idle');
  });
  it('a 1,4 m/s → walk, mirando al este (90°) y velocidad ≈ 1,4', () => {
    const out = walk(new AvatarMotion(), 1.4, 6);
    expect(out.gait).toBe('walk');
    expect(out.facingDeg).toBeCloseTo(90, 0);
    expect(out.speed).toBeCloseTo(1.4, 1);
  });
  it('a 4 m/s → run', () => {
    expect(walk(new AvatarMotion(), 4, 6).gait).toBe('run');
  });
  it('alcanza un objetivo fijo sin pasarse', () => {
    const m = new AvatarMotion();
    m.setTarget(10, 0);
    let out = m.step(0);
    for (let i = 0; i < 300; i++) out = m.step(1 / 60);
    expect(out.east).toBeGreaterThan(9.9);
    expect(out.east).toBeLessThanOrEqual(10);
  });
  it(`un salto de más de ${TELEPORT_M} m se teletransporta (sin cruzar el mapa caminando)`, () => {
    const m = new AvatarMotion();
    m.setTarget(TELEPORT_M + 1, 0);
    expect(m.step(1 / 60).east).toBe(TELEPORT_M + 1);
  });
  it('umbrales coherentes', () => {
    expect(WALK_MIN_MS).toBeLessThan(1.4);
    expect(RUN_MIN_MS).toBeGreaterThan(1.4);
    expect(RUN_MIN_MS).toBeLessThan(4);
  });
});
```

- [x] **5b.** → FALLA. **5c. Implementación:**

```ts
import { normDeg, smoothAngle } from '../geo/angles';

export type Gait = 'idle' | 'walk' | 'run';
export const WALK_MIN_MS = 0.5;
export const RUN_MIN_MS = 2.8;
export const TELEPORT_M = 150;
/** Constante de tiempo del seguimiento: el avatar tarda ~0,5 s en "alcanzar" un cambio de posición. */
const FOLLOW_TAU_S = 0.5;
const SPEED_TAU_S = 0.6;
const TURN_ALPHA = 0.2;

export interface AvatarFrame {
  east: number;
  north: number;
  speed: number;
  facingDeg: number;
  gait: Gait;
}

/** Interpola el avatar hacia la última posición conocida a 60 fps (ARQUITECTURA §4). Metros locales. */
export class AvatarMotion {
  readonly target = { east: 0, north: 0 };
  private pos = { east: 0, north: 0 };
  private speed = 0;
  private facing = 0;

  setTarget(east: number, north: number): void {
    this.target.east = east;
    this.target.north = north;
  }

  step(dt: number): AvatarFrame {
    const dx = this.target.east - this.pos.east;
    const dy = this.target.north - this.pos.north;
    const dist = Math.hypot(dx, dy);
    if (dist > TELEPORT_M) {
      this.pos = { ...this.target };
      this.speed = 0;
    } else if (dt > 0) {
      const k = 1 - Math.exp(-dt / FOLLOW_TAU_S);
      const mx = dx * k;
      const my = dy * k;
      this.pos.east += mx;
      this.pos.north += my;
      const inst = Math.hypot(mx, my) / dt;
      this.speed += (inst - this.speed) * (1 - Math.exp(-dt / SPEED_TAU_S));
      if (inst > 0.2) this.facing = smoothAngle(this.facing, normDeg((Math.atan2(mx, my) * 180) / Math.PI), TURN_ALPHA);
    }
    const gait: Gait = this.speed >= RUN_MIN_MS ? 'run' : this.speed >= WALK_MIN_MS ? 'walk' : 'idle';
    return { east: this.pos.east, north: this.pos.north, speed: this.speed, facingDeg: this.facing, gait };
  }

  /** Re-anclaje del origen (F1-04): desplaza todo sin animar. */
  shift(east: number, north: number): void {
    this.pos.east -= east;
    this.pos.north -= north;
    this.target.east -= east;
    this.target.north -= north;
  }
}
```

  Si "alcanza un objetivo fijo" falla por precisión del `toBeLessThanOrEqual`, es correcto que nunca lo supere: el
  acercamiento exponencial no rebasa.
- [x] **5d.** → PASA (6). Commit `F1-03: AvatarMotion con tests` + `/guardar`.

### Paso 6 — Joystick en pantalla

**Files:** Create `src/app/shared/ui/joystick.component.ts`

- [x] **6a.** Componente `app-joystick` (`output vector = { dx, dy }` en radios, emite en cada `pointermove` y
  `{0,0}` al soltar). Pointer Events con `setPointerCapture`, base de 120 px de vidrio (DISENO §1: `var(--surface)`,
  `backdrop-filter`), mando de 52 px que sigue al dedo 1:1 limitado al radio y vuelve al centro con
  `transition: transform var(--dur-small) var(--ease-out)` (solo al soltar). `touch-action: none`. Háptico `tap()` al
  agarrar. `aria-label="Joystick: mover al personaje"`. Posición: abajo a la izquierda, por encima de
  `var(--ion-safe-area-bottom)`.
- [x] **6b.** (se hace en el paso 8, en `/dev/mapa`) Uso en la pantalla: cada frame, `const v = joystickVelocity(dx, dy, cameraHeading)` →
  `location.nudge(v.east * dt, v.north * dt)`.
- [x] **6c.** Lint + build. Commit `F1-03: joystick en pantalla` + `/guardar`.

### Paso 7 — Pantalla de permisos diseñada (DISENO §6)

**Files:** Create `src/app/features/map/location-gate.component.ts`

- [x] **7a.** Componente que cubre el mapa según `location.status()` (vidrio sobre un fondo ilustrado con los tokens,
  título en Fredoka, `app-game-button`):
  - `idle`/`prompt` → "Necesitamos tu ubicación para que aparezcan Pokémon a tu alrededor" + "Permitir ubicación"
    (llama `location.start()`) + "Jugar con joystick" (secundario).
  - `searching` (más de 4 s sin fix) → "Buscando señal GPS…" con una Poké Ball girando (respeta "reducir movimiento")
    + "Usar joystick mientras tanto".
  - `denied` → "Sin permiso de ubicación. Puedes jugar con el joystick o activarlo en Ajustes" + "Jugar con joystick"
    (→ `useJoystickAt(DEFAULT_CENTER)` = Parque Santander, el del spike).
  - `unavailable` → lo mismo con "Este dispositivo no da la ubicación".
  - `weak` → **no cubre**: chip pequeño "GPS débil" arriba en el centro.
- [x] **7b.** Usarlo ya en `/dev/mapa` (paso 8). Commit `F1-03: pantalla de permisos` + `/guardar`.

### Paso 8 — Probarlo antes de que exista `/mapa`: modo "Sígueme" en `/dev/mapa`

**Files:** Modify `src/app/features/dev-map/dev-map.page.ts`

- [x] **8a.** Botón "Sígueme" (además de los de la batería): llama a `location.start()` y `compass.start()`; con el
  primer `position()` re-ancla el overlay ahí (`overlay.setAnchor({ ...pos, altitude: 0 })`) y usa ese punto como
  origen; en `tick(now)`: `motion.setTarget(...toLocalM(origen, location.position()))`, `const f = motion.step(dt)`,
  avatar del spike en `(f.east, 0, -f.north)` y `rotation.y = -f.facingDeg·π/180`; cámara
  `map.moveCamera({ center: fromLocalM(origen, f.east, f.north), heading: compass.heading() ?? 0 })`. Si el estado es
  `denied`/`unavailable` → `location.useJoystickAt(CENTER)` y se muestra `app-joystick`. Texto de estado con
  `status()` y `gait`.
- [x] **8b.** Lint, `ng test`, build. Commit `F1-03: modo Sígueme en /dev/mapa` + `/guardar`.

### Paso 9 — Prueba en Android y cierre

- [x] **9a.** `npm run apk -- --install`; `/dev/mapa` → "Sígueme": aceptar el permiso; **caminar ~100 m por la calle**
  y comprobar: el avatar avanza suave (sin saltos), `gait` pasa de `idle` a `walk`; trotar → `run`; el mapa gira al
  girar el móvil y no "tiembla" quieto. Denegar el permiso (Ajustes de Android → la app → Ubicación → Denegar) →
  pasa a joystick y el avatar se mueve con él. Anotar en la bitácora: precisión típica (m), si hubo saltos
  descartados (`console.debug` del filtro) y si el retraso al caminar se nota.
- [x] **9b.** REGLA 2 (bitácora con la salida de los tests, ROADMAP `[x]`, PR).

**Hecho (Kenneth, 2026-10-12). Cambios respecto a este plan (ver D-037):** `LocationService` también funciona en el
navegador (allí `requestPermissions` no existe: el permiso lo pide `watchPosition` y la denegación llega como error
código 1), no abre dos escuchas si `start()` se llama dos veces, y exporta `DEFAULT_CENTER`. `app-location-gate` añade
"Reintentar" (vuelve al GPS) en el estado `denied`. `app-joystick` responde también a las flechas del teclado (PC) y
tiene spec. En `/dev/mapa`, el avatar del spike tiene "nariz" para ver hacia dónde mira y un botón "Usar GPS".
**Para F1-04:** `WINDOW = 4` del filtro se deja así (caminando, Kenneth: "todo funcionó correctamente"); `start()` con `joystickMode` guardado
deja `status = 'joystick'` sin posición → la pantalla debe llamar a `useJoystickAt(...)` (como hace `/dev/mapa`).

---

## F1-04 · Pantalla Mapa

**Criterio (ROADMAP):** DISENO §1 cumplido; captura de día y de noche. Quitar las pestañas de Ionic.

### Paso 1 — Contrato de `/spawns` en `shared/protocol` + clima y noche para el HUD

**Files:** Create `shared/protocol/spawns.ts`; Modify `server/src/spawns/spawns.service.ts`,
`server/test/spawns.e2e-spec.ts`

- [x] **1a.** `shared/protocol/spawns.ts` (ARQUITECTURA §2: contrato app↔servidor):

```ts
import type { Weather } from '../engine/spawns.js';

/** Lo que ve el cliente en el mapa. Nivel, IVs, sexo y shiny NO salen hasta el encuentro (F2, D-025). */
export interface VisibleSpawn {
  id: string;
  speciesId: number;
  lat: number;
  lng: number;
}

/** Respuesta de `GET /spawns?lat&lng`. */
export interface NearbySpawns {
  slot: number;
  /** Fin de la franja (ISO): el cliente vuelve a pedir a partir de aquí. */
  expiresAt: string;
  /** Clima y noche de la celda de clima del jugador en esta franja (los mismos que deciden los spawns). */
  weather: Weather;
  night: boolean;
  spawns: VisibleSpawn[];
}
```

- [x] **1b. Test e2e que falla** en `server/test/spawns.e2e-spec.ts`, dentro del `describe` de `GET /spawns` (reusar
  el jugador/token de ese archivo): `expect(['clear','cloudy','rain','snow','fog','windy']).toContain(res.body.weather)`
  y `expect(typeof res.body.night).toBe('boolean')`. `cd server && npm run test:e2e -- spawns` → FALLA.
- [x] **1c.** En `spawns.service.ts`: borrar las interfaces locales `VisibleSpawn`/`NearbySpawns` e importarlas de
  `../../../shared/protocol/spawns.js` (D-024: ruta relativa con `.js`); en `near()`:

```ts
    const weather = await this.weather.weatherFor(weatherCellOf(lat, lng), slot);
    const night = isNightAt(slotEndsAt(slot - 1), lng);
    return {
      slot,
      expiresAt: new Date(slotEndsAt(slot)).toISOString(),
      weather,
      night,
      spawns: visible.map(/* igual que ahora */),
    };
```

  (El clima ya está en caché por celda y franja, D-025: no añade peticiones a Open-Meteo.) `spawns.controller.ts`
  importa `NearbySpawns` del mismo sitio.
- [x] **1d.** e2e → PASA; `npm run build` y `npm test` del servidor en verde. Commit
  `F1-04: clima y noche en GET /spawns (contrato en shared/protocol)` + `/guardar`.

### Paso 2 — Día/noche (puro)

**Files:** Create `src/app/game/map-scene/day-night.ts` + spec

- [ ] **2a. Test:** `isNightLocal(new Date(2026, 9, 12, 19, 0))` → `true`; `5:59` → `true`; `6:00` → `false`;
  `18:59` → `false`. **2b.** falla. **2c.** `export const isNightLocal = (d: Date): boolean => d.getHours() >= 19 ||
  d.getHours() < 6;` (DISENO §1: hora local del móvil, no la del servidor). **2d.** pasa. Commit.

### Paso 3 — Rutas: `/mapa` principal, `/pokedex`, fuera las pestañas

**Files:** Modify `src/app/app.routes.ts`, `src/app/core/auth/auth.guard.ts:26`,
`src/app/features/pokemon-add/pokemon-add.page.ts:133`, `src/app/features/pokemon-detail/pokemon-detail.page.ts:114,132`,
`src/app/features/pokedex/pokedex.page.html`; Delete `src/app/core/layout/tabs/`

- [ ] **3a.** En `app.routes.ts`: nueva ruta `{ path: 'mapa', canActivate: [authGuard], loadComponent: () =>
  import('./features/map/map.page').then((m) => m.MapPage) }`; `{ path: 'pokedex', loadComponent: …PokedexPage }`
  (pública, como antes); `{ path: 'tabs/pokedex', redirectTo: '/pokedex' }` (enlaces viejos); `''` y `'**'` →
  `redirectTo: '/mapa'`. Quitar la ruta `''` con `loadChildren` de las pestañas. Actualizar el comentario de rutas.
- [ ] **3b.** Cambiar `'/tabs/pokedex'` → `'/pokedex'` en `auth.guard.ts`, `pokemon-add.page.ts` y
  `pokemon-detail.page.ts`. En `pokedex.page.html`, botón atrás en la `ion-toolbar`:
  `<ion-buttons slot="start"><ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button></ion-buttons>`
  (importar `IonBackButton`, `IonButtons` de `@ionic/angular`).
- [ ] **3c.** Borrar `src/app/core/layout/tabs/`. `grep -rn "tabs" src/app` → solo la redirección de compatibilidad.
  Los specs que naveguen a `/tabs/...` se actualizan a `/pokedex`.
- [ ] **3d.** `ng test`, lint, build. Tras login (`safeRedirect` → `/`) se llega a `/mapa`. Commit + `/guardar`.

### Paso 4 — `MapScene` (three.js, sin Angular)

**Files:** Create `src/app/game/map-scene/map-scene.ts`

- [ ] **4a.** Clase `MapScene` que encapsula lo que hoy está en `SpikeScene` para el juego de verdad:

```ts
export const REACH_RADIUS_M = 40; // UX: el servidor permite 80 m (D-028)
export const REANCHOR_M = 1000;

export class MapScene {
  readonly scene = new THREE.Scene();
  /** Grupo del jugador: avatar provisional (cápsula + cabeza del spike) hasta F1-05, sombra y círculo de alcance. */
  readonly player = new THREE.Group();
  constructor();                 // construye player (avatar provisional, sombra, anillo de REACH_RADIUS_M)
  setPlayer(f: AvatarFrame, timeMs: number): void; // posición (f.east, 0, -f.north), rotation.y = -facing en rad,
                                                   // pulso del anillo (opacidad 0,5-0,8, 1,6 s)
  setNight(night: boolean): void;  // luz ambiente más fría y tenue de noche
  dispose(): void;                 // geometrías, materiales, texturas
}
```

  Geometrías y materiales compartidos, `MeshLambertMaterial`, sin sombras proyectadas (sombras = discos
  semitransparentes, como el spike medido en D-035).
- [ ] **4b.** Lint + build. Commit + `/guardar`.

### Paso 5 — `MapPage`: mapa, overlay, bucle y cámara

**Files:** Create `src/app/features/map/map.page.ts`

- [ ] **5a.** Esqueleto: `ion-content` a pantalla completa anulando la zona segura (D-022:
  `--padding-top: 0; --padding-bottom: 0`), `<div #mapEl class="map">`, capas del HUD con
  `var(--ion-safe-area-*)`. `afterNextRender` → `init()`:

```ts
const { Map, RenderingType } = await loadMapsLibrary('maps');
const { ColorScheme } = await loadMapsLibrary('core');
this.night.set(isNightLocal(new Date()));
this.map = new Map(this.mapEl().nativeElement, {
  center: origin, zoom: 18, minZoom: 17, maxZoom: 20, tilt: 67.5, heading: 0,
  mapId: MAPS_MAP_ID, renderingType: RenderingType.VECTOR,
  colorScheme: this.night() ? ColorScheme.DARK : ColorScheme.LIGHT,
  disableDefaultUI: true, clickableIcons: false, keyboardShortcuts: false,
  gestureHandling: 'greedy', headingInteractionEnabled: false, tiltInteractionEnabled: false,
});
this.overlay = new ThreeJSOverlayView({ anchor: { ...origin, altitude: 0 }, upAxis: 'Y',
  scene: this.mapScene.scene, animationMode: 'always', addDefaultLighting: true });
this.overlay.setMap(this.map);
```

  `origin` = primer `location.position()` (se espera con `app-location-gate`, F1-03 paso 7). `colorScheme` solo se fija
  al crear el mapa: si se cruza las 19:00 o las 6:00 con la pantalla abierta, se recrea el mapa (comprobar cada
  minuto). **Riesgo:** que el Map ID no tenga variante oscura en la consola → ver "Pendientes de humanos".
- [ ] **5b.** Bucle (`requestAnimationFrame`, igual que el spike): `dt` en segundos (tope 0,1 s si la pestaña se
  durmió); joystick → `nudge`; `motion.setTarget(...toLocalM(origin, position))`; `f = motion.step(dt)`;
  re-anclar si `hypot(f.east, f.north) > REANCHOR_M` (`origin = fromLocalM(origin, f.east, f.north)`,
  `overlay.setAnchor`, `motion.shift(f.east, f.north)`); `mapScene.setPlayer(f, now)`; cámara
  `map.moveCamera({ center: fromLocalM(origin, f.east, f.north), heading })` con `heading = northUp ? 0 :
  compass.heading() ?? 0`. El usuario puede pellizcar el zoom (17-20) pero el centro vuelve al avatar en cada frame.
- [ ] **5c.** `ngOnDestroy`: cancelar el rAF, `location.stop()`, `compass.stop()`, `overlay.setMap(null)`,
  `mapScene.dispose()`. Al volver a la pantalla todo arranca de nuevo.
- [ ] **5d.** Lint + build. Commit + `/guardar`.

### Paso 6 — Estados diseñados en `/mapa` (DISENO §6)

**Files:** Modify `src/app/features/map/location-gate.component.ts` (creado en F1-03 paso 7), `map.page.ts`

- [ ] **6a.** Montar `app-location-gate` sobre el mapa y añadirle el estado de error de Maps (`MapsLoadError` /
  `mapsAuthFailed()`) → "No se pudo cargar el mapa" + "Reintentar" (vuelve a llamar a `init()`).
- [ ] **6b.** Commit + `/guardar`.

### Paso 7 — HUD y menú de la Poké Ball (DISENO §1)

**Files:** Create `map-compass.component.ts`, `weather-chip.component.ts`, `ball-menu.component.ts` en
`src/app/features/map/`

- [ ] **7a. Arriba a la izquierda:** `app-player-hud` (ya existe, F1-08) con `BagService.load()` al entrar.
- [ ] **7b. Arriba a la derecha:** `app-map-compass` (aguja que rota con `-heading`; toque → alterna "norte
  arriba" / "sigue la brújula"; `aria-label` con el estado) y `app-weather-chip` (icono + texto en español del
  `weather` de `GET /spawns`; en F1-04 se pide `/spawns` una vez al tener posición solo para el clima; F1-07 lo
  sustituye por `SpawnFeedService`). Sin datos → no se muestra (nunca "undefined").
- [ ] **7c. Abajo en el centro:** `app-ball-menu`: botón Poké Ball de 72 px (rojo `--accent`, `scale(0.97)` en
  `:active`, háptico + sonido de toque como `GameButton`) que abre una hoja (`--ease-drawer`, `--dur-panel`, se cierra
  arrastrando hacia abajo o tocando fuera) con: Pokédex (`/pokedex`), Combate de prueba (`/combate/prueba`), Joystick
  sí/no (`useJoystickAt(posición actual)` / `useGps()`), Reducir efectos, Cerrar sesión. (Mis Pokémon, Equipos,
  Favoritos se añaden cuando existan, F3.)
- [ ] **7d.** Si `settings.joystickMode` → `app-joystick` abajo a la izquierda.
- [ ] **7e.** Lint, `ng test`, build. Commit + `/guardar`.

### Paso 8 — Prueba y evidencias

- [ ] **8a.** Navegador 390×844 con joystick (sin GPS en el PC): login → `/mapa`; moverse, girar la brújula del HUD,
  abrir el menú. **Capturas de día y de noche** (para la de noche, cambiar temporalmente la hora del PC o forzar
  `night` con `?noche=1` solo en desarrollo) → `docs/evidencias/F1-04_0{1,2}_*.png`.
- [ ] **8b.** Android real: caminar, girar; medir fps con `FpsMeter` (añadir el contador oculto tras un toque largo en
  la brújula solo en builds de desarrollo) — objetivo ≥ 55 de media. Captura → `F1-04_03_*.png`.
- [ ] **8c.** Checklist DISENO §1: mapa protagonista, sin pestañas, vidrio, HUD en su sitio, noche 19-6, botones
  ≥ 44 px, contraste AA en los textos sobre vidrio. REGLA 2.

---

## F1-05 · Avatar 3D

**Criterio:** el personaje camina/corre/se queda quieto según la velocidad, con sombra y círculo de alcance; fluido en
Android (≥ 55 fps con el mapa).

### Paso 1 — Pose de las extremidades (puro)

**Files:** Create `src/app/game/map-scene/limb-pose.ts` + spec

- [ ] **1a. Test que falla:**

```ts
import { limbPose } from './limb-pose';

describe('limbPose', () => {
  it('idle: piernas quietas y respiración suave', () => {
    const p = limbPose('idle', 0, 1.3);
    expect(p.legL).toBe(0);
    expect(p.legR).toBe(0);
    expect(Math.abs(p.bob)).toBeLessThan(0.1);
  });
  it('walk: piernas en oposición de fase y brazos al revés que las piernas', () => {
    const p = limbPose('walk', 1.4, 0.25);
    expect(p.legL).toBeCloseTo(-p.legR, 6);
    expect(Math.sign(p.armL)).toBe(-Math.sign(p.legL));
  });
  it('run: más amplitud que walk y el cuerpo inclinado hacia delante', () => {
    const w = limbPose('walk', 1.4, 0.25);
    const r = limbPose('run', 4, 0.25 * (1.4 / 4));
    expect(Math.abs(r.legL)).toBeGreaterThan(Math.abs(w.legL));
    expect(r.lean).toBeGreaterThan(0);
    expect(w.lean).toBe(0);
  });
});
```

- [ ] **1b.** falla. **1c. Implementación:**

```ts
import type { Gait } from './avatar-motion';

export interface LimbPose {
  legL: number; legR: number; armL: number; armR: number; // radianes (giro sobre el eje X de la cadera/hombro)
  bob: number;  // metros de rebote vertical del cuerpo
  lean: number; // radianes de inclinación hacia delante
}

/** Zancada ≈ 0,75 m andando, 1,2 m corriendo: la cadencia sale de la velocidad (los pies no "patinan"). */
export function limbPose(gait: Gait, speed: number, t: number): LimbPose {
  if (gait === 'idle') {
    const b = Math.sin(t * 2 * Math.PI * 0.4) * 0.05;
    return { legL: 0, legR: 0, armL: 0, armR: 0, bob: b, lean: 0 };
  }
  const run = gait === 'run';
  const stride = run ? 1.2 : 0.75;
  const phase = 2 * Math.PI * (speed / (2 * stride)) * t;
  const amp = run ? 0.9 : 0.5;
  const s = Math.sin(phase);
  return {
    legL: s * amp,
    legR: -s * amp,
    armL: -s * amp * 0.8,
    armR: s * amp * 0.8,
    bob: Math.abs(Math.cos(phase)) * (run ? 0.35 : 0.15),
    lean: run ? 0.18 : 0,
  };
}
```

- [ ] **1d.** pasa. Commit `F1-05: pose de extremidades con tests` + `/guardar`.

### Paso 2 — `Avatar3D`

**Files:** Create `src/app/game/map-scene/avatar-3d.ts`; Modify `map-scene.ts` (sustituye el avatar provisional)

- [ ] **2a.** Personaje low-poly procedural (no hay glTF libres que valgan; D-003 ya eligió procedural para todo lo
  que no sea arte oficial): grupo raíz → torso (cápsula, color `--accent` leído una vez con
  `getComputedStyle(document.documentElement)`), cabeza (esfera, piel), **gorra** (media esfera + visera, rojo/blanco),
  mochila (caja redondeada), brazos y piernas como cápsulas **colgadas de un pivote** (`Group` en la cadera/hombro
  para que roten desde arriba). Altura total ≈ **9 m** (exagerada como en el spike: a zoom 18 un metro son ~2 px).
  `update(frame: AvatarFrame, timeS)`: aplica `limbPose(frame.gait, frame.speed, timeS)`, `rotation.y` desde
  `facingDeg`, `position.y = bob`, `rotation.x = lean`. Sombra: disco negro 30 % que se encoge un poco con el bote.
  Círculo de alcance: el anillo de `MapScene` (40 m) con pulso.
- [ ] **2b.** Un solo material por color (compartidos), ≤ 12 mallas, sin `castShadow`. `dispose()`.
- [ ] **2c.** `MapScene.setPlayer` llama a `avatar.update`. Lint + build. Commit + `/guardar`.

### Paso 3 — Prueba

- [ ] **3a.** Navegador con joystick: medio joystick → camina, a tope → corre, suelto → respira. Grabar un GIF/vídeo
  corto o capturas → `docs/evidencias/F1-05_*`.
- [ ] **3b.** Android: caminar y trotar de verdad; fps ≥ 55 con el contador del paso F1-04 8b. REGLA 2.

---

## F1-07 · Pokémon en el mapa

**Criterio (ROADMAP + DISENO §5):** sprites en el overlay, hierba agitándose, aparición/desaparición animada, grito
bajito por cercanía, toque → encuentro. Máximo 30 dibujados (D-035).

### Paso 1 — Altas/bajas y los más cercanos (puro)

**Files:** Create `src/app/game/map-scene/spawn-diff.ts` + spec

- [ ] **1a. Test que falla:**

```ts
import { diffSpawns, nearestN } from './spawn-diff';

const s = (id: string, lat: number, lng: number) => ({ id, speciesId: 1, lat, lng });
const O = { lat: 2.9273, lng: -75.2819 };

describe('spawn-diff', () => {
  it('detecta los nuevos y los que ya no están; los que siguen no se tocan', () => {
    const d = diffSpawns(new Set(['a', 'b']), [s('b', 0, 0), s('c', 0, 0)]);
    expect(d.added.map((x) => x.id)).toEqual(['c']);
    expect(d.removed).toEqual(['a']);
  });
  it('nearestN se queda con los N más cercanos al origen, en orden', () => {
    const list = [s('lejos', O.lat + 0.001, O.lng), s('cerca', O.lat + 0.0001, O.lng), s('medio', O.lat + 0.0005, O.lng)];
    expect(nearestN(list, O, 2).map((x) => x.id)).toEqual(['cerca', 'medio']);
  });
});
```

- [ ] **1b.** falla. **1c.**

```ts
import { distanceM, type LatLng } from '@shared/engine/geo';
import type { VisibleSpawn } from '@shared/protocol/spawns';

export const MAX_DRAWN = 30; // D-035

export function diffSpawns(current: ReadonlySet<string>, next: readonly VisibleSpawn[]) {
  const nextIds = new Set(next.map((x) => x.id));
  return {
    added: next.filter((x) => !current.has(x.id)),
    removed: [...current].filter((id) => !nextIds.has(id)),
  };
}

export function nearestN(list: readonly VisibleSpawn[], origin: LatLng, n = MAX_DRAWN): VisibleSpawn[] {
  return list
    .map((x) => ({ x, d: distanceM(origin, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((e) => e.x);
}
```

- [ ] **1d.** pasa. Commit + `/guardar`.

### Paso 2 — Cuándo volver a pedir `/spawns` (puro)

**Files:** Create `src/app/game/map-scene/refetch.ts` + spec

Reglas: el servidor admite 20 peticiones/min por IP (D-025) y devuelve lo que hay a ≤ 200 m. Se pide: la primera vez;
al acabar la franja (`expiresAt`, + 1 s de margen); o si el jugador se movió > 60 m desde la última petición. Nunca dos
a la vez ni con menos de 8 s entre ellas (salvo el fin de franja). Tras un error, espera exponencial 5 s → 10 → 20 →
máx. 60 s (servidor dormido, DISENO §6).

- [ ] **2a. Test que falla:**

```ts
import { REFETCH_MOVE_M, shouldRefetch, type FetchState } from './refetch';
import { fromLocalM } from '@shared/engine/geo';

const O = { lat: 2.9273, lng: -75.2819 };
const base: FetchState = { inFlight: false, lastAt: 100_000, lastPos: O, expiresAt: 400_000, failures: 0 };

describe('shouldRefetch', () => {
  it('la primera vez, sí', () => expect(shouldRefetch({ ...base, lastAt: null, lastPos: null }, 0, O)).toBe(true));
  it('nunca con una petición en vuelo', () =>
    expect(shouldRefetch({ ...base, inFlight: true, lastAt: null }, 0, O)).toBe(false));
  it('quieto y dentro de la franja, no', () => expect(shouldRefetch(base, 200_000, O)).toBe(false));
  it('al acabar la franja, sí aunque haga poco de la última', () =>
    expect(shouldRefetch({ ...base, lastAt: 399_000 }, 401_001, O)).toBe(true));
  it(`moverse más de ${REFETCH_MOVE_M} m, sí; pero no antes de 8 s`, () => {
    const far = fromLocalM(O, REFETCH_MOVE_M + 1, 0);
    expect(shouldRefetch(base, 107_000, far)).toBe(false);
    expect(shouldRefetch(base, 108_001, far)).toBe(true);
  });
  it('tras 2 fallos espera 10 s', () => {
    const s = { ...base, lastAt: null, lastPos: null, failures: 2, lastAttemptAt: 100_000 };
    expect(shouldRefetch(s, 109_000, O)).toBe(false);
    expect(shouldRefetch(s, 110_001, O)).toBe(true);
  });
});
```

- [ ] **2b.** falla. **2c.**

```ts
import { distanceM, type LatLng } from '@shared/engine/geo';

export const REFETCH_MOVE_M = 60;
export const MIN_GAP_MS = 8_000;
const EXPIRY_MARGIN_MS = 1_000;

export interface FetchState {
  inFlight: boolean;
  /** Última petición con éxito. */
  lastAt: number | null;
  lastPos: LatLng | null;
  expiresAt: number | null;
  failures: number;
  /** Último intento (con éxito o no), para la espera tras fallar. */
  lastAttemptAt?: number;
}

export const backoffMs = (failures: number): number => Math.min(60_000, 5_000 * 2 ** (failures - 1));

export function shouldRefetch(s: FetchState, now: number, pos: LatLng): boolean {
  if (s.inFlight) return false;
  if (s.failures > 0) return now - (s.lastAttemptAt ?? 0) > backoffMs(s.failures);
  if (s.lastAt === null || s.lastPos === null) return true;
  if (s.expiresAt !== null && now > s.expiresAt + EXPIRY_MARGIN_MS) return true;
  return now - s.lastAt > MIN_GAP_MS && distanceM(s.lastPos, pos) > REFETCH_MOVE_M;
}
```

- [ ] **2d.** pasa. Commit + `/guardar`.

### Paso 3 — `SpawnFeedService`

**Files:** Create `src/app/services/game/spawn-feed.service.ts` + spec

- [ ] **3a.** Servicio con `HttpClient` (el interceptor pone el token): `readonly spawns = signal<VisibleSpawn[]>([])`,
  `weather`, `night`, `error = signal<string | null>`. `tick(now, pos)` (lo llama la pantalla cada ~1 s) → si
  `shouldRefetch(...)` hace `GET ${environment.serverUrl}/spawns?lat=…&lng=…` (lat/lng redondeados a 6 decimales,
  `timeout(70_000)` como `BagService` por Render dormido). 401 → lo maneja el interceptor; 503 → `error` "Los Pokémon
  salvajes no están disponibles ahora mismo" (sin borrar los que hay); 429 → cuenta como fallo (espera).
- [ ] **3b. Tests** con `provideHttpClientTesting`: (1) primer `tick` hace una petición con `lat`/`lng` y publica
  `spawns`, `weather`, `night`; (2) un segundo `tick` inmediato en el mismo sitio no pide; (3) un 503 deja `error` y
  conserva la lista anterior. Commit + `/guardar`.

### Paso 4 — Animación de aparición (pura)

**Files:** Create `src/app/game/map-scene/appear.ts` + spec

DISENO §5: "hierba que se agita en su celda → emerge con un pequeño salto + grito bajito según distancia". Tiempos:
0-700 ms la hierba se agita fuerte sin Pokémon; 700-1100 ms el Pokémon sale con un salto (de −2 m a +1,6 m y baja a
1 m) y aparece (opacidad 0 → 1, escala 0,95 → 1, nunca desde 0: DISENO §4.3); después, reposo (balanceo suave de la
hierba). Desaparecer: 300 ms de opacidad 1 → 0 y escala → 0,95.

- [ ] **4a. Test que falla:**

```ts
import { APPEAR_MS, DISAPPEAR_MS, appearPose, disappearPose } from './appear';

describe('appear', () => {
  it('al principio solo se agita la hierba', () => {
    const p = appearPose(100);
    expect(p.opacity).toBe(0);
    expect(p.grassAmp).toBeGreaterThan(0.5);
  });
  it('durante el salto sube por encima del reposo', () => {
    expect(Math.max(...[800, 850, 900, 950].map((t) => appearPose(t).y))).toBeGreaterThan(1.2);
  });
  it('al terminar queda en reposo exacto', () => {
    expect(appearPose(APPEAR_MS)).toEqual({ y: 1, scale: 1, opacity: 1, grassAmp: 0.15 });
  });
  it('nunca escala desde 0', () => {
    for (let t = 0; t <= APPEAR_MS; t += 50) expect(appearPose(t).scale).toBeGreaterThanOrEqual(0.95);
  });
  it('desaparecer termina invisible', () => {
    expect(disappearPose(DISAPPEAR_MS).opacity).toBe(0);
  });
});
```

- [ ] **4b.** falla. **4c.**

```ts
export const SHAKE_MS = 700;
export const APPEAR_MS = 1100;
export const DISAPPEAR_MS = 300;
const REST = { y: 1, scale: 1, opacity: 1, grassAmp: 0.15 };

export interface SpritePose {
  y: number;       // metros sobre el suelo (base del sprite)
  scale: number;   // multiplicador del tamaño
  opacity: number;
  grassAmp: number; // 0..1, amplitud del agitado de la hierba
}

const easeOut = (x: number): number => 1 - (1 - x) ** 3;

export function appearPose(ms: number): SpritePose {
  if (ms >= APPEAR_MS) return { ...REST };
  if (ms < SHAKE_MS) return { y: -2, scale: 0.95, opacity: 0, grassAmp: 1 };
  const k = (ms - SHAKE_MS) / (APPEAR_MS - SHAKE_MS); // 0..1
  const jump = Math.sin(k * Math.PI) * 0.8; // arco del salto
  return {
    y: -2 + 3 * easeOut(k) + jump,
    scale: 0.95 + 0.05 * easeOut(k),
    opacity: Math.min(1, k * 2.5),
    grassAmp: 1 - 0.85 * k,
  };
}

export function disappearPose(ms: number): SpritePose {
  const k = Math.min(1, ms / DISAPPEAR_MS);
  return { y: 1, scale: 1 - 0.05 * k, opacity: 1 - k, grassAmp: 0.15 * (1 - k) };
}
```

  Al final del salto (`k = 1`): `y = −2 + 3 + 0 = 1` → enlaza con el reposo sin salto visual.
- [ ] **4d.** pasa. Commit + `/guardar`.

### Paso 5 — Texturas y `SpawnLayer`

**Files:** Create `src/app/game/map-scene/sprite-textures.ts`, `spawn-layer.ts`; Modify `map-scene.ts`

- [ ] **5a. `SpriteTextures`:** `get(speciesId): THREE.Texture` con caché LRU (máx. 40; al expulsar → `dispose()`).
  Carga con `THREE.TextureLoader().setCrossOrigin('anonymous')` probando en orden (footgun de CLAUDE.md):
  `…/sprites/pokemon/other/home/{id}.png` → `…/other/official-artwork/{id}.png` → `…/sprites/pokemon/{id}.png`; si
  todas fallan, un círculo "?" dibujado en un `CanvasTexture`. `colorSpace = SRGBColorSpace`.
- [ ] **5b. `SpawnLayer`** (a partir del spike, que ya está medido):
  - `sync(drawn: VisibleSpawn[], origin, nowMs)`: con `diffSpawns` contra los que tiene → los nuevos nacen con
    `bornAt = nowMs` (si es la **primera** sincronización tras entrar al mapa, `bornAt = nowMs − APPEAR_MS`: los que ya
    estaban no "brotan" todos a la vez); los que sobran pasan a `dyingAt` y se borran tras `DISAPPEAR_MS`.
  - Cada spawn: `THREE.Sprite` (material propio por la opacidad, textura compartida), sombra (disco), 10 briznas en
    un `InstancedMesh` común de `MAX_DRAWN × 10`. Tamaño del sprite ≈ 12 m (como el spike), `center (0.5, 0)`.
  - `update(nowMs)`: `appearPose`/`disappearPose`; balanceo en reposo `y = 1 + sin(t·2 + fase)·0,4`; la hierba rota
    con `grassAmp`.
  - `pick(ndc: THREE.Vector2): string | null` → `overlay.raycast(ndc, sprites)` → id del spawn tocado.
  - `reposition(origin)` tras un re-anclaje.
- [ ] **5c.** Lint + build. Commit + `/guardar`.

### Paso 6 — Conectarlo en `MapPage`: aparición, grito y toque

**Files:** Modify `src/app/features/map/map.page.ts`, `src/app/services/game/audio.service.ts` (+ spec); Create
`src/app/features/encounter/encounter.page.ts`; Modify `app.routes.ts`

- [ ] **6a. `playCry` con volumen:** test nuevo en `audio.service.spec.ts` con el doble de `AudioContext` que ya
  usa ese archivo: `playCry(25, 0.3)` crea un `GainNode` con `gain.value = 0.3` entre la fuente y el bus `cries`;
  `playCry(25)` sigue sonando a 1 (los tests actuales no cambian). Implementación: parámetro `gain = 1` →
  `play(buffer, 'cries', gain)`; en `play`, si `gain !== 1`, `source → ctx.createGain() (value = gain) → bus`.
- [ ] **6b.** En el bucle (cada ~1 s): `spawnFeed.tick(now, position)`; `spawnLayer.sync(nearestN(spawnFeed.spawns(),
  posAvatar), origin, now)`. Por cada alta (no en la primera sincronización) a ≤ 60 m: `audio.playCry(speciesId,
  clamp(1 − d/60, 0,2, 0,6))`, como mucho **uno cada 5 s** (si no, en una franja nueva sonarían 15 a la vez).
- [ ] **6c. Toque:** en el `div` del mapa, `pointerdown` guarda punto y hora; `pointerup` a < 10 px y < 300 ms = toque
  (no arrastre ni pellizco) → `ndc = ((x / w)·2 − 1, −(y / h)·2 + 1)` → `spawnLayer.pick(ndc)`:
  - a ≤ `REACH_RADIUS_M` del avatar → háptico `tap()` + `router.navigateByUrl('/encuentro/' + id)`.
  - más lejos → el sprite da un saltito y un chip "Acércate más" 1,5 s (sin navegar).
- [ ] **6d. `/encuentro/:id` PROVISIONAL** (ruta con `authGuard`): `GET /encounters/:id` → arte `home`, nombre en
  español (DatasetService), nivel, grito; "Volver al mapa". Errores del servidor (D-028) con texto: 403 "Estás
  demasiado lejos", 410 "Se ha ido…", 409 "Ya lo intentaste", 404 "Este Pokémon ya no está". Comentario
  `// PROVISIONAL (F1-07): F2-04 lo sustituye por la escena AR`. La transición de verdad (DISENO §5) es de F2-04.
- [ ] **6e.** Lint, `ng test`, build. Commit + `/guardar`.

### Paso 7 — Prueba y evidencias

- [ ] **7a.** Navegador 390×844 con joystick y el servidor local (`cd server && npm run start:dev`, con
  `SPAWN_SALT`): aparecen Pokémon con la hierba agitándose, al acercarse con el joystick suena el grito bajito, tocar
  uno lejano → "Acércate más", uno cercano → `/encuentro/:id` con sus datos. Capturas → `docs/evidencias/F1-07_*`.
- [ ] **7b.** Android con el APK de producción (Render): en la calle, ≥ 55 fps con los Pokémon de verdad (contador de
  F1-04 8b), grito al acercarse, toque → encuentro. Anotar cuántos Pokémon había y los fps. REGLA 2.

---

## Pendientes de humanos (copiar a ESTADO al empezar F1-04)

- **Alex (consola de Google Cloud, Map ID `5309ecf69efbfe12f3ecbc4c`):** estilo del mapa **sin POI comerciales**
  (D-035) y con **variante oscura** para la noche (`colorScheme: DARK`). Si no se puede, plan B: dos Map ID (día y
  noche) en `environment.local.ts` (`googleMapsMapIdNight`) y anotarlo en DECISIONES.
- Quien pruebe en Android: el permiso de ubicación "Solo mientras se usa la app" es suficiente (no se pide en segundo
  plano).

## Riesgos

- **`deviceorientationabsolute` en el WebView:** en Chrome/WebView de Android existe; si en algún móvil no llega
  (`heading()` sigue `null` tras 2 s), el mapa queda "norte arriba" y la brújula del HUD lo indica. No bloquea.
- **GPS en interiores (aula):** precisión de 30-60 m o nada → por eso existe el joystick (D-008) y el estado `weak`.
- **Batería y calor:** GPS de alta precisión + WebGL. F8-02 mide 10 min seguidos (D-035). Al salir de `/mapa` se para
  todo (paso F1-04 5c).
- **Render dormido:** la primera petición a `/spawns` tarda ~1 min → `SpawnFeedService` reintenta con espera; el mapa y
  el avatar funcionan sin Pokémon mientras tanto (chip "Despertando el servidor…").
- **Límite de `/spawns` (20/min por IP):** con `MIN_GAP_MS = 8 s` el máximo teórico es 7,5/min por jugador; en el aula
  todos comparten IP pública: con 3 jugadores a la vez sigue por debajo (22,5 > 20 solo si los tres corren sin parar).
  Si da 429 en la demo, subir el límite en el servidor y anotarlo.
- **Precisión de float32 lejos del origen:** re-anclaje a 1 km (F1-04 paso 5b).
