# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Alex (Claude) · rama `feature/plan-maestro`

## Fase actual

**F0 · Fundaciones** — aún no ha empezado ninguna tarea de código.

## Hecho

- El profe aprobó sustituir JSON Server por NestJS con los mismos endpoints (D-002).
- Plan maestro completo en `docs/plan/` (visión, arquitectura, diseño, roadmap, decisiones).
- Reglas de relevo en `CLAUDE.md`, comandos `/inicio` y `/cierre`, hook de arranque.
- Skills esenciales copiadas en `.claude/skills/` (estándares de producción, planes, TDD, depuración,
  verificación, testing web, NestJS, Prisma).
- Lo que ya existía antes del plan: esqueleto Angular 22 + Ionic 9 + Capacitor 8 con 5 pantallas
  placeholder, JSON Server con `/teams`, `/favorites`, `/customPokemon`, Postman (36 pruebas), Scrum en Jira.

## En curso

- Nadie.

## Siguiente paso concreto

1. Mergear el PR del plan maestro a `develop` (lo revisa otro integrante, como siempre).
2. Coger **F0-01** (plan detallado de F0). Después F0-02, F0-03 y F0-06 se pueden hacer **en paralelo**
   por personas distintas (no se pisan: dataset / shared+tooling / servidor).

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
- **Base de datos**: crear proyecto Supabase (gratis) para el equipo y compartir `DATABASE_URL` por privado
  (nunca en el repo).
- Hay 6 capturas de evidencia HU-02 sin commitear en `docs/evidencias/` (son de Alex, no se tocaron).

## URLs / datos útiles

- Repo: https://github.com/alexpipe31w/pokecrud (público) · rama de integración `develop`.
- Servidor desplegado: — (se rellena en F0-06)
