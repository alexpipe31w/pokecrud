# Bitácora

> Solo se **añade al final**. Nunca se borra ni se edita lo de otro. Una entrada por sesión (o por
> trozo cerrado si la sesión fue larga). Copia la plantilla:

```
## AAAA-MM-DD HH:MM · @nombre · <ID tarea> · rama `feature/...`
**Qué se hizo:** …
**Archivos clave:** `ruta` (qué), …
**Cómo se probó (salida real):**
    npm test → 42 passed …
**Quedó a medias / roto:** … (o "nada")
**Decisiones nuevas:** D-0XX … (o "ninguna")
**El siguiente debe empezar por:** <instrucción concreta, p. ej. "abrir src/app/game/map-scene/x.ts y terminar la función y()">
```

---

## 2026-10-11 · @alex (Claude) · PLAN-MAESTRO · rama `feature/plan-maestro`

**Qué se hizo:** revisión del repo (solo esqueleto: 5 páginas con `PagePlaceholderComponent`, JSON Server
con 3 recursos, proceso Scrum). Decisión de no empezar de cero (D-001). Plan maestro completo:
`VISION.md`, `ARQUITECTURA.md`, `DISENO.md`, `ROADMAP.md` (F0–F8), `DECISIONES.md` (D-001…D-011),
`ESTADO.md`, esta bitácora. `CLAUDE.md` con las reglas de relevo. Comandos `/inicio` y `/cierre`.
Hook `SessionStart` que inyecta `ESTADO.md`. Skills esenciales copiadas a `.claude/skills/`.
**Archivos clave:** `CLAUDE.md`, `AGENTS.md`, `docs/plan/*`, `.claude/commands/*`, `.claude/hooks/session-start.js`,
`.claude/settings.json`, `.claude/skills/*`, `.gitignore`.
**Cómo se probó (salida real):** comprobado contra PokéAPI en vivo: `pokemon-species` count = 1025;
#25 con `cries.latest`, `showdown` y `home`; #1025 con grito y sin `showdown`; `capture_rate` #25 = 190.
Android SDK y Android Studio (con `jbr`) presentes en el PC de Alex; Java del sistema es 1.8 (no sirve
para Capacitor 8 → usar el `jbr`). Hook de arranque ejecutado a mano (ver salida en el PR).
No se tocó código de la app.
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-001 a D-011.
**El siguiente debe empezar por:** `/inicio` → coger F0-01 y escribir `docs/plan/fases/F0-fundaciones.md`
con la skill `writing-plans`.

## 2026-10-11 · @alex (Claude) · PLAN-MAESTRO (corrección) · rama `feature/plan-maestro`

**Qué se hizo:** al mezclar el PR #5 apareció en `develop` la entrega **IS-11 de Samuel (08-10)**: Pokédex/inventario
con CRUD sobre `/pokemon` (151, con `price`/`stock`), agregar desde PokéAPI, detalle, editar, búsqueda, scroll infinito
y tests. El plan se había escrito sobre un `develop` local sin actualizar y decía "solo placeholders". Corregidos
D-001, ESTADO, ARQUITECTURA §9 y ROADMAP F0-08/F3-06 para conservar y reutilizar IS-11. Conflicto del README resuelto
(se mantienen el aviso del plan y la descripción nueva de Samuel). Además: Google Maps y Supabase configurados
(ver ESTADO) y reglas de secretos en `docs/plan/SECRETOS.md` + plantillas `*.example`.
**Archivos clave:** `docs/plan/{DECISIONES,ESTADO,ARQUITECTURA,ROADMAP,SECRETOS}.md`, `README.md`, `CLAUDE.md`,
`server/.env.example`, `src/environments/environment.local.example.ts`.
**Cómo se probó (salida real):** mapa de Neiva cargado con la clave en `localhost:8100` (tilt 67.5, VECTOR, 0 errores);
conexión a Supabase `OK PostgreSQL 17.11`. `npm run lint` **no corre en el PC de Alex**: Node 24.14 < 24.15 que pide
Angular CLI 22 (este cambio solo toca docs y plantillas).
**Quedó a medias / roto:** Alex tiene que actualizar Node a ≥ 24.15.
**Decisiones nuevas:** D-001 corregida.
**El siguiente debe empezar por:** `git pull` en `develop` (¡siempre!) → `/inicio` → F0-01.

## 2026-10-11 · @alex (Claude) · F0-01 · rama `feature/F0-01-plan-fundaciones`

**Qué se hizo:** plan detallado de F0 en `docs/plan/fases/F0-fundaciones.md` (F0-02…F0-09 con archivos, código,
tests y comandos). Versiones comprobadas con `npm view` y con un `nest new` real de prueba (borrado). Documentación
de Prisma 7 consultada (context7). Además, a pedido de Alex: protocolo de **guardado continuo** (REGLA 2b en
CLAUDE.md, comando `/guardar`, hook `Stop` `checkpoint-guard.js`, `/inicio` sabe retomar la rama de otro).
**Archivos clave:** `docs/plan/fases/F0-fundaciones.md`, `CLAUDE.md`, `.claude/commands/guardar.md`,
`.claude/hooks/checkpoint-guard.js`, `.claude/settings.json`, `DECISIONES.md` (D-012, D-013).
**Cómo se probó (salida real):** con Node 24.21: `npm run lint` → "All files pass linting"; `ng test` →
"Test Files 11 passed (11) · Tests 29 passed (29)". Hook probado a mano: commit reciente → no bloquea;
`stop_hook_active` → no bloquea; umbral superado → `{"decision":"block", …}`.
**Quedó a medias / roto:** nada. Pendiente de decidir en F1: cómo importa `server/` el código de `shared/`.
**Decisiones nuevas:** D-012, D-013.
**El siguiente debe empezar por:** `/inicio F0-02 <nombre>` (o F0-03 / F0-06 en paralelo) y seguir el plan de fase.

## 2026-10-11 14:10 · @samuel (Claude) · F0-02 · rama `feature/F0-02-dataset`

**Qué se hizo:** relevo de Alex. Configurados `server/.env` y `environment.local.ts` (OK, ignorados por Git;
conexión a Supabase OK). F0-02 completa siguiendo el plan de fase pasos 1-10: tipos del dataset, cliente PokéAPI con
caché/timeout/reintentos, `scripts/build-dataset.mjs`, test y dataset generado. Dos ajustes mínimos al código del plan:
`clean()` quita el guion suave (U+00AD) junto con el salto de línea (si no, partía palabras) y `types` se ordena sobre
una copia. Como F0-03 no está mezclada, se crearon `vitest.shared.config.ts` y el script `test:shared` idénticos al plan.
**Archivos clave:** `shared/data/dataset.types.ts`, `shared/data/dataset.spec.ts`, `scripts/build-dataset.mjs`,
`scripts/lib/pokeapi-fetch.mjs`, `src/assets/data/{pokedex,moves,types,meta}.json`, `vitest.shared.config.ts`, `package.json`.
**Cómo se probó (salida real):**
    npm run dataset   → OK · pokedex 972 KB · moves 209 KB · types 2 KB · vfdb512e56ff6  (1025 especies, 706 movimientos)
    npm run test:shared → Test Files 1 passed (1) · Tests 5 passed (5)
    npm run lint      → All files pass linting.
    ng test --watch=false → Test Files 11 passed (11) · Tests 29 passed (29)
    npm run build     → Application bundle generation complete (www/assets/data con los 4 JSON)
**Tamaño:** pokedex 972 KB (< 3 MB → no hace falta partir por generación).
**Quedó a medias / roto:** nada. Nota de datos: PokéAPI no tiene español para la Gen 9 (#906-1025): nombre, género y
descripción salen en inglés (fallback previsto). 924/1025 descripciones en español; ninguna especie sin learnset.
**Decisiones nuevas:** ninguna.
**El siguiente debe empezar por:** mezclar el PR de F0-02 y luego `/inicio F0-03 <nombre>` (su Paso 1 y el script
`test:shared` ya existen; no duplicarlos) o `/inicio F0-06 <nombre>`.

## 2026-10-11 14:35 · @samuel (Claude) · F0-03 · rama `feature/F0-03-shared-tooling`

**Qué se hizo:** F0-03 completa, pasos 1-12 del plan de fase. Rama sacada de `feature/F0-02-dataset` (PR #8 sin mezclar)
para no chocar en `package.json` ni en los docs. `shared/engine/rng.ts` (mulberry32 + hashString) con TDD (falló primero),
`shared/tsconfig.json`, `@types/node@24`, scripts `test:all`, alias `@shared/*` en la app con spec de integración,
`three@0.186.1` + `@types/three@0.186.0` exactos. Cambio respecto al plan: sin `baseUrl` (obsoleto en TS 6, D-014) y el
`exclude` de specs de `shared/` también en `tsconfig.spec.json` (si no, `ng test` intentaría correr el test del dataset en jsdom).
**Archivos clave:** `shared/engine/rng.ts`, `shared/engine/rng.spec.ts`, `shared/tsconfig.json`, `tsconfig.json`,
`tsconfig.app.json`, `tsconfig.spec.json`, `src/app/core/utils/shared-alias.spec.ts`, `package.json`, `DECISIONES.md`.
**Cómo se probó (salida real):**
    npm run test:shared (antes de rng.ts) → FAIL Cannot find module './rng.js'
    npm run test:all  → app: Test Files 12 passed (12) · Tests 30 passed (30) | shared: Test Files 2 passed (2) · Tests 10 passed (10)
    npm run lint      → All files pass linting.
    npm run build     → Application bundle generation complete.
    npx tsc -p shared/tsconfig.json → sin errores
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-014; D-003 completada con la versión de three.
**El siguiente debe empezar por:** mezclar PR #8 y luego el de F0-03; después `/inicio F0-05 <nombre>` (servicios base,
ya desbloqueada) o F0-04 / F0-06.
