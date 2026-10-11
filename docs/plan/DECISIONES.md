# Decisiones

> Registro de decisiones que **no se re-discuten** sin motivo nuevo. Si cambias una, no la borres:
> márcala `SUSTITUIDA por D-0XX` y añade la nueva al final. Formato: contexto → decisión → por qué.

## D-001 · No se empieza de cero: se reaprovecha el repo y se rehace la app (2026-10-11, Alex + Claude)

El repo solo tenía el esqueleto (5 pantallas placeholder, JSON Server, proceso Scrum/Git ya evaluado).
**Decisión:** se conserva el repo, el historial, Jira, el flujo de ramas, la DoD, Angular+Ionic+Capacitor
y el CRUD del curso; se rehace por completo la experiencia (mapa como pantalla principal, sin pestañas).
**Por qué:** "empezar de cero" no ahorra nada (no hay código de app que tirar) y sí perdería el
historial que el profe ya vio. Lo "básico y feo" era la idea, no la base técnica.

## D-002 · Stack de la app: Angular 22 + Ionic 9 + Capacitor 8 (2026-10-11)

Se mantiene el stack del curso. Capacitor da el APK de Android. **Supuesto a confirmar con el profe:**
que se pueda añadir backend propio (NestJS) además de / en lugar de JSON Server (ver D-004).

## D-003 · three.js para todo lo 3D (mapa, AR, combate) (2026-10-11)

Una sola librería 3D para las tres escenas. Fijar la versión exacta al instalar (F0-03) y anotarla aquí.
Los Pokémon se representan con su arte oficial `home` en billboard + animación procedimental, no con
modelos 3D: no hay modelos libres de las 1025 especies y así todas se ven con la misma calidad.

## D-004 · Backend NestJS + Prisma + PostgreSQL + Socket.IO (2026-10-11)

JSON Server no puede hacer combates en tiempo real ni impedir trampas. Se crea `server/` y se migran
`/teams`, `/favorites`, `/customPokemon` con el mismo contrato. JSON Server queda en `backend/` hasta
que el nuevo servidor cubra esos endpoints (F0-08) y luego se archiva.

## D-005 · Salas de combate en memoria de un único proceso (2026-10-11)

Suficiente para clase. Si algún día hay varios procesos, las salas pasan a Redis.

## D-006 · Tokens en la app nativa: refresh en almacenamiento seguro, access en memoria (2026-10-11)

Excepción explícita a "nada de tokens en localStorage" (no hay cookies de primera parte entre el
WebView y el API). Keystore de Android vía `@aparajita/capacitor-secure-storage`.

## D-007 · Simplificaciones del combate v1 (2026-10-11)

EV = 0, sin habilidades, sin objetos equipados, sin clima de combate, combates individuales (1 vs 1
activo, equipos de hasta 6). Todo lo demás de la ficha sí cuenta (stats base, IV, naturaleza, nivel,
tipos, STAB, crítico, precisión, prioridad, PP, estados, cambios de stats). Habilidades → F7 opcional.

## D-008 · Google Maps (pedido explícito del equipo) con modo joystick obligatorio (2026-10-11)

Google Maps JS vectorial + WebGLOverlayView. El modo joystick existe siempre para presentar en el aula
y probar en el PC.

## D-009 · La carpeta `android/` se commitea (2026-10-11)

Revierte la costumbre de los laboratorios (no generar nativo). Aquí hace falta para permisos,
icono, splash y APK reproducible por cualquiera del equipo.

## D-010 · Proyecto académico sin ánimo de lucro, sin publicar en tiendas (2026-10-11)

Pokémon, sus nombres e imágenes son de Nintendo / Game Freak / The Pokémon Company. Se usan los datos
y medios públicos de PokéAPI con fines educativos. No se sube a Play Store ni se monetiza. Música y
efectos: solo libres o propios (créditos en `src/assets/audio/CREDITOS.md`).

## D-011 · Relevos entre 3 IAs: la memoria vive en `docs/plan/` (2026-10-11)

Cada integrante usa su propia cuenta de Claude. Reglas en `CLAUDE.md`, comandos `/inicio` y `/cierre`
en `.claude/commands/`, hook de arranque que muestra `ESTADO.md`, y las skills esenciales copiadas en
`.claude/skills/` para que las tres IAs trabajen con los mismos estándares.
