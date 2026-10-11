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

## 2026-10-11 17:45 · @samuel (Claude) · F0-06 · rama `feature/F0-06-servidor-nestjs`

**Qué se hizo:** F0-06 pasos 1-8 y 10 (el 9, despliegue, necesita a Alex). Rama sacada de `develop` (independiente de
F0-02…F0-05, cuyas entradas de bitácora están en los PR #8-#11). Scaffold Nest 12.0.8 (ESM, Vitest, oxlint) en `server/`,
sin `@nestjs/mau` ni el "Hello World". Dependencias con versión exacta. Cambios respecto al plan:
- `prisma.config.ts` usa `url: env('DIRECT_URL')`: en Prisma 7.10 `directUrl` no existe en la config (D-017).
- Migración `init` generada con `prisma migrate diff --from-empty --to-schema … --script` y aplicada con
  `prisma migrate deploy`: sin base sombra y sin riesgo de que `migrate dev` resetee la base. Antes se comprobó que
  el esquema `public` de Supabase estaba vacío.
- `trust proxy` en producción (si no, en Render todos los jugadores compartirían la IP del proxy en el rate limit).
- `x-request-id` (del cliente o UUID) devuelto en la respuesta; logs `silent` en tests y legibles en desarrollo.
- Test e2e extra del rate limit con una ruta de prueba: un 404 no pasa por el guard, así que con curl no se veía.
- `npm audit`: 4 "high" solo en la CLI `prisma` (`mysql2`, `deepmerge-ts`), riesgo aceptado (D-017).
- `server/README.md` en español con comandos y los pasos exactos de Render para Alex.
**Archivos clave:** `server/prisma.config.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/*_init/`,
`server/src/{main,app.module}.ts`, `server/src/prisma/*`, `server/src/health/*`, `server/test/*.e2e-spec.ts`,
`server/.env.example`, `server/README.md`, `DECISIONES.md` (D-017).
**Cómo se probó (salida real):**
    prisma migrate deploy → "All migrations have been successfully applied."
    prisma migrate status → "Database schema is up to date!"
    prisma migrate diff --from-config-datasource --to-schema … --exit-code → "No difference detected." (exit 0)
    npm test (antes del código) → "Cannot find module '../prisma/prisma.service.js'"
    npm test → Tests 4 passed (4) · npm run test:e2e → Test Files 2 passed (2) · Tests 7 passed (7) · lint exit 0 · build exit 0
    node dist/main.js (NODE_ENV=production, PORT=3077): /health/ready → {"status":"ok","db":"ok"} 200; helmet (CSP, HSTS,
      nosniff, X-Frame-Options); CORS: localhost:4200 permitido, https://evil.com sin allow-origin; /no-existe → 404 JSON
      sin stack; logs JSON con req.id; 0 líneas con la contraseña en el log.
    PORT=3001 npm run start:dev → "Nest application successfully started"; /health/ready → 200 {"status":"ok","db":"ok"}
    App de la raíz sin cambios: lint OK, ng test 29/29.
**Quedó a medias / roto:** solo el despliegue en Render (Paso 9) → F0-06 sigue `[~]`. El JSON Server del curso ocupa el
puerto 3000: arrancar Nest con `PORT=3001` hasta F0-08. Sin filtro global de excepciones propio (el de Nest no filtra
el stack; la taxonomía de errores llega con F0-07).
**Decisiones nuevas:** D-017.
**El siguiente debe empezar por:** Alex despliega en Render (`server/README.md`) y pasa F0-06 a `[x]`; luego `/inicio F0-07`
(cuando F0-04 y F0-06 estén en `develop`) o `/inicio F0-09`.
