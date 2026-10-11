# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Alex (Claude) · rama `feature/plan-maestro`

## Fase actual

**F0 · Fundaciones** — aún no ha empezado ninguna tarea de código.

## Hecho

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

- **Google Maps API key**: alguien del equipo tiene que crearla en Google Cloud (con alerta de presupuesto)
  antes de F1-01. Hasta entonces se trabaja con el modo joystick sobre un mapa sin key (marca de agua "for development").
- **Confirmar con el profe**: ¿se puede sustituir JSON Server por un backend propio NestJS conservando los
  mismos endpoints? (D-002/D-004). Si dice que no, se mantiene JSON Server para el CRUD y Nest solo para el juego.
- **Base de datos**: crear proyecto Supabase (gratis) para el equipo y compartir `DATABASE_URL` por privado
  (nunca en el repo).
- Hay 6 capturas de evidencia HU-02 sin commitear en `docs/evidencias/` (son de Alex, no se tocaron).

## URLs / datos útiles

- Repo: https://github.com/alexpipe31w/pokecrud (público) · rama de integración `develop`.
- Servidor desplegado: — (se rellena en F0-06)
