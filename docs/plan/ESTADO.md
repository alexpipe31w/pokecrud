# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Alex (Claude) · rama `feature/F0-01-plan-fundaciones`

## Fase actual

**F0 · Fundaciones** — aún no ha empezado ninguna tarea de código.

## Hecho

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

- Nadie.

## Siguiente paso concreto

1. **Relevo 2026-10-11:** Alex se quedó sin tokens. F0-01 ya está mezclado en `develop` (PR #6).
   El siguiente compañero empieza aquí.
2. Repartir **en paralelo** (no se pisan): **F0-02** dataset · **F0-03** shared+tooling · **F0-06** servidor.
   Cada uno: `/inicio F0-0X <nombre>` y seguir el plan de fase paso a paso, con `/guardar` tras cada paso.

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
