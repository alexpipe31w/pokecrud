# F2-13 · Ficha del Pokémon en el encuentro — Plan (D-048)

> Una rama y un PR. TDD en `shared/` (Node), servidor (e2e contra la BD real) y app (jsdom).

**Objetivo:** en `/encuentro/:id` un botón abre una ficha **al lado del Pokémon** con sus tipos, nivel, **PC**, altura y
peso reales (× su XS/XL), categoría ("Pokémon Ratón") y descripción de Pokédex en español; **pulsarlo otra vez la
esconde** (Alex). Cerrada por defecto: no tapa la cámara.

**Decisiones:**

- **PC (D-049):** no existía fórmula. Se define en `shared/engine/combat-power.ts` sobre las stats REALES del individuo
  (`calcStats`: base + IVs + nivel + naturaleza, D-007), a la manera de Pokémon GO: ataque = 7/8 del mayor + 1/8 del
  menor de (Ataque, At. Esp.); defensa = 5/8 del mayor + 3/8 del menor de (Defensa, Def. Esp.); PS;
  `PC = max(10, floor(A · √D · √PS / 10))`. La usará también la colección (F3-02/F3-03).
- **El PC lo da el servidor** (REGLA 3: los IVs y la naturaleza no salen del servidor): `EncounterView.cp`.
- **Peso individual = peso de la especie × heightScale** (lineal: ×0,5..×1,5). Altura = altura × heightScale.
- La ficha se coloca al lado del Pokémon en pantalla (proyección de su caja cada fotograma, escribiendo estilos sin
  pasar por signals para no repintar Angular 60 veces por segundo); si no cabe al lado, debajo de la cabecera.

**Pasos:**

- [x] 1. `combat-power.ts`: tests (valores calculados a mano, mínimo 10, crece con nivel e IVs) → código. Commit.
- [x] 2. Servidor: `SpeciesDetails.baseStats`, `details()` añade `cp`; `EncounterView.cp`; e2e de encuentros
      actualizado (lista de claves + `cp` = el de `combatPower(calcStats(...))` del spawn). Commit.
- [x] 3. App: `EncounterScene.screenBox()` (caja del Pokémon en píxeles) con test. Commit.
- [x] 4. App: `encounter-card.component.ts` (solo pinta) + botón en `app-encounter-hud` (`aria-expanded`) + la página
      (abrir/cerrar, colocar al lado). Spec de la página: cerrada por defecto, abre, muestra datos, se cierra. Commit.
- [x] 5. lint · build · tests · shared · servidor (build, unitarios, e2e de encuentros). Navegador 390×844 sin permiso
      de cámara: ficha abierta y cerrada con un modelo 3D. Evidencias `F2-13_*`.
