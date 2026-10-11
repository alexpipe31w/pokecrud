# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Samuel (Claude) · rama `feature/F0-03-shared-tooling`

## Fase actual

**F0 · Fundaciones** — F0-01, F0-02 y F0-03 hechas (PR #8 y PR de F0-03 pendientes de mezclar); libres: F0-04, F0-05, F0-06.

## Hecho

- **F0-03 hecho (Samuel, PR a `develop`, apilado sobre F0-02):** `shared/` con RNG determinista (`shared/engine/rng.ts`,
  mulberry32 + hashString FNV-1a, 5 tests), `shared/tsconfig.json`, alias `@shared/*` (sin `baseUrl`: obsoleto en TS 6),
  `npm run test:all` (app + shared), `three@0.186.1` y `@types/three@0.186.0` exactos (D-003), `@types/node@24`.
- **F0-02 hecho (Samuel, PR a `develop`):** dataset de las 1025 especies en `src/assets/data/` (`pokedex` 972 KB,
  `moves` 706 movimientos / 209 KB, `types` 18 tipos, `meta` v`fdb512e56ff6`), tipos en `shared/data/dataset.types.ts`,
  `npm run dataset` (reanudable con `.cache/`) y `npm run test:shared` (5 tests). Gen 9 (#906-1025) sin español en PokéAPI → inglés.
- El profe aprobó sustituir JSON Server por NestJS con los mismos endpoints (D-002).
- **F0-01 hecho:** plan detallado de la fase 0 con código y comandos verificados (Nest 12 ESM + Vitest, Prisma 7.10 con `prisma.config.ts` y `PrismaPg`).
- **Guardado continuo:** REGLA 2b + `/guardar` + hook `Stop` que obliga a guardar si hay trabajo sin push de más de 20 min.
- Plan maestro completo en `docs/plan/` (visión, arquitectura, diseño, roadmap, decisiones).
- Reglas de relevo en `CLAUDE.md`, comandos `/inicio` y `/cierre`, hook de arranque.
- Skills esenciales copiadas en `.claude/skills/` (estándares de producción, planes, TDD, depuración,
  verificación, testing web, NestJS, Prisma).
- Lo que ya existía antes del plan: Angular 22 + Ionic 9 + Capacitor 8; JSON Server con `/teams`, `/favorites`,
  `/customPokemon` y **`/pokemon`** (151 sembrados, con `price` y `stock`); Postman (36 pruebas); Scrum en Jira.
  **IS-11 (Samuel, 08-10) en `develop`:** Pokédex/inventario con CRUD (listar con scroll infinito, buscar,
  agregar cualquier Pokémon desde PokéAPI, detalle con descripción en español, editar, eliminar), con tests.
  Equipos, Favoritos y Mis Pokémon **ocultos** en esa entrega (código en `features/`, ver `tabs.page.html`).

## En curso

- F0-04 (@samuel) · rama `feature/F0-04-sistema-diseno` (sale de `feature/F0-03-shared-tooling`; PR #8 y #9 sin mezclar)
  · **Punto de guardado 2026-10-11 14:45**: hechos pasos 1-3 (tokens, Fredoka, chips desde tokens con
  texto por contraste, D-015); ahora en Paso 4 (test de GameButton); siguiente: Paso 5; estado: compila ✅ (app 30/30).

## Siguiente paso concreto

1. Mezclar **primero el PR #8 (F0-02)** y después el de F0-03 (sale de la rama de F0-02; tras mezclar #8 su diff
   queda solo con lo de F0-03).
2. Libres: **F0-04** sistema de diseño (dep F0-03), **F0-05** servicios base (dep F0-02 + F0-03), **F0-06** servidor.
   Si se cogen antes de mezclar los PR, sacar la rama de `feature/F0-03-shared-tooling`.

## Bloqueos / roto / pendiente de humanos

- **Google Maps — HECHO (2026-10-11):** clave `pokecrud-maps-js` en la cuenta de Google Cloud de Alex
  (prueba gratuita hasta 2027-01-10, proyecto "My First Project" `project-7bf0c639-c6d2-4cc1-aba`), restringida a
  Maps JavaScript API y a `https://localhost/*`, `http://localhost:8100/*`, `http://localhost:4200/*`.
  Map ID vectorial con inclinación y rotación: `5309ecf69efbfe12f3ecbc4c`. Presupuesto `pokecrud-tope` 5.000 COP con
  alertas 50/90/100 %. Probado: mapa de Neiva cargado en `localhost:8100` con tilt 67.5 y render VECTOR, sin errores.
  **La clave NO está en el repo:** pídesela a Alex por privado y créate `src/environments/environment.local.ts`:
  `export const localEnv = { googleMapsApiKey: '…', googleMapsMapId: '5309ecf69efbfe12f3ecbc4c' };`
- **Pendiente antes del 2027-01-10:** la consola no deja poner tope diario a "Map loads per day" ("La cuota no se
  puede modificar"). Mientras dure la prueba no hay cobro posible; antes de que termine, revisar el tope o pasar a MapLibre.
- **Base de datos — HECHO (2026-10-11):** Supabase proyecto `pokecrud-go` (ref `ggfnjophcsyawltmoseh`, São Paulo
  `sa-east-1`, Postgres 17, plan gratis) en la org de la cuenta **alexpipew31@gmail.com** (separada de StockUp).
  Data API (REST automática) **desactivada** (el juego entra solo por NestJS/Prisma) y RLS automático activado.
  Conexión por _session pooler_ (IPv4): `aws-1-sa-east-1.pooler.supabase.com:5432`, usuario `postgres.ggfnjophcsyawltmoseh`.
  Probado: conexión OK desde el PC de Alex. **La contraseña NO está en el repo:** pídele a Alex su `server/.env`
  (`DATABASE_URL` y `DIRECT_URL`) por privado. Ojo: Supabase gratis pausa el proyecto tras ~7 días sin uso; si pasa,
  se reactiva desde el panel (Alex).
- Hay 6 capturas de evidencia HU-02 sin commitear en `docs/evidencias/` (son de Alex, no se tocaron).

## URLs / datos útiles

- Repo: https://github.com/alexpipe31w/pokecrud (público) · rama de integración `develop`.
- Servidor desplegado: — (se rellena en F0-06)
