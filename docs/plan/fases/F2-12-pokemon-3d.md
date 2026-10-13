# F2-12 · Pokémon en 3D (.glb) en el encuentro — Plan (D-048)

> Una rama y un PR. TDD en lo que se puede probar en jsdom (escena y cargador con dobles); el modelo real se prueba en
> el navegador (390×844) y en Android.

**Objetivo:** en `/encuentro/:id` el Pokémon es su **modelo 3D** de `Pokemon-3D-api/assets` (no el arte plano), a su
tamaño real, con los pies en el suelo, mirando a la cámara, con su animación si la trae, la misma personalidad de
F2-04b (respirar, saltar, flotar, fantasma) y **girable arrastrando el dedo** en horizontal. Sin modelo (57 especies,
shiny sin modelo, red caída) → el arte plano de F2-04a, sin esperar.

**Arquitectura:**

- `src/app/game/encounter-scene/pokemon-model.ts` (+ spec): `modelUrl(id, shiny)` y
  `loadPokemonModel(id, shiny, loader)` → `{ scene, clips } | null`. Shiny: SOLO el modelo shiny (si no hay, null → arte
  plano shiny: mejor colores correctos en plano que un 3D con los colores normales). El cargador real es `GLTFLoader` +
  `DRACOLoader` con el decodificador servido por la app en `assets/draco/` (copiado de `three/examples/jsm/libs/draco/gltf`
  por `angular.json`). Timeout de 20 s por modelo.
- `EncounterScene.setModel(model)`: el modelo va **al lado** del plano `body` dentro de `anchor` (no dentro: el plano
  tiene escala no uniforme y deformaría el giro). Se normaliza con su caja: altura = `heightM`, pies en y = 0,
  centrado en X/Z. `artAspect` pasa a ser ancho/alto de la caja (lo usa la caja del lanzamiento, F2-05). El plano se
  oculta. `update()` aplica al modelo la misma postura (lift, squash, lean) y el giro del dedo (`spin`). Luces
  (hemisférica + direccional) solo cuando hay modelo. `AnimationMixer` con el primer clip en bucle, avanzado en
  `animate()`. `setOpacity` también al modelo (fantasma). `dispose` libera geometrías, materiales y texturas.
- `EncounterPage`: token `POKEMON_MODEL` (D-016) con la carga real; al cargar, `world.setModel()`. Arrastre horizontal
  sobre el escenario → `world.spin(dx)`.
- **Ojo F2-07:** su absorción encoge/tiñe/oculta `body`; al ejecutarla, aplicar lo mismo al modelo (`pokemonVisual`).

**Pasos:**

- [ ] 1. `pokemon-model.ts`: test (URLs, shiny solo shiny, null si falla, timeout) → código. Commit.
- [ ] 2. `EncounterScene.setModel` + postura + giro + animación + opacidad + dispose: tests → código. Commit.
- [ ] 3. `angular.json`: decodificador Draco en `assets/draco/`. `npm run build` y comprobar que sale `www/assets/draco/`.
- [ ] 4. `EncounterPage`: token `POKEMON_MODEL`, carga, arrastre para girar; spec con doble. Commit.
- [ ] 5. lint · build (sin avisos de presupuesto) · tests · shared. Navegador 390×844 **sin permiso de cámara**
      (`context.clearPermissions()`: una captura con la webcam real NO se sube): Pikachu, Charizard (vuela) y Gengar
      (fantasma) en 3D; uno sin modelo (#850) en plano. Evidencias `F2-12_*`.
- [ ] 6. Android: ≥ 55 fps con el modelo y partículas (snippet de F2-04a 12c). Si no hay móvil → PENDIENTES.
