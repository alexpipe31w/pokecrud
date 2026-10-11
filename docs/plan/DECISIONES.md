# Decisiones

> Registro de decisiones que **no se re-discuten** sin motivo nuevo. Si cambias una, no la borres:
> márcala `SUSTITUIDA por D-0XX` y añade la nueva al final. Formato: contexto → decisión → por qué.

## D-001 · No se empieza de cero: se reaprovecha el repo y se rehace la app (2026-10-11, Alex + Claude)

El repo tenía el proceso Scrum/Git, JSON Server y la entrega IS-11 de Samuel (08-10): Pokédex/inventario con
CRUD sobre `/pokemon` (151 sembrados, con `price` y `stock`), detalle, agregar desde PokéAPI, editar, búsqueda,
scroll infinito, servicios con tests (HU-03, HU-04, HU-05). _Corrección 2026-10-11: la primera versión de esta
decisión decía "solo placeholders" porque se revisó un `develop` local sin actualizar._
**Decisión:** se conserva el repo, el historial, Jira, el flujo de ramas, la DoD, Angular+Ionic+Capacitor
y el CRUD del curso; se rehace por completo la experiencia (mapa como pantalla principal, sin pestañas).
El código de IS-11 (servicios `PokeApiService`/`PokemonService`, modelo, formulario, tests) **se reutiliza**: lo
que cambia es la presentación (DISENO.md) y la navegación.
**Por qué:** "empezar de cero" no ahorra nada (hay código útil y probado) y sí perdería el
historial que el profe ya vio. Lo "básico y feo" era la idea, no la base técnica.

## D-002 · Stack de la app: Angular 22 + Ionic 9 + Capacitor 8 (2026-10-11)

Se mantiene el stack del curso. Capacitor da el APK de Android. **Confirmado por el profe (2026-10-11):**
se puede sustituir JSON Server por backend propio (NestJS) conservando los endpoints (ver D-004).

## D-003 · three.js para todo lo 3D (mapa, AR, combate) (2026-10-11)

Una sola librería 3D para las tres escenas. Fijar la versión exacta al instalar (F0-03) y anotarla aquí.
Los Pokémon se representan con su arte oficial `home` en billboard + animación procedimental, no con
modelos 3D: no hay modelos libres de las 1025 especies y así todas se ven con la misma calidad.
**three fijado en 0.186.1** y `@types/three` en 0.186.0, ambos con versión exacta (F0-03, Samuel, 2026-10-11).

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

## D-012 · Versiones del servidor: NestJS 12 (ESM + Vitest) y Prisma 7.10.0 exacto (2026-10-11)

`nest new` 12.0.8 genera proyecto ESM (`"type": "module"`, imports con `.js`), tests con Vitest y lint con oxlint;
se acepta tal cual. Prisma se fija en **7.10.0** porque el tag `latest` de npm apunta a una RC de la 8. Prisma 7
exige `prisma.config.ts` para la URL y el adaptador `@prisma/adapter-pg`. Sustituye la mención a "NestJS 11".

## D-013 · Guardado continuo obligatorio (2026-10-11, pedido de Alex)

Las cuentas Claude Pro se cortan sin aviso al agotar el límite. Se guarda (commit WIP permitido + push + "Punto de
guardado" en ESTADO.md) tras cada paso del plan y como mucho cada 20 min; un hook `Stop` lo hace cumplir. Quien
retoma una tarea `[~]` trabaja sobre la rama del compañero, no crea otra.

## D-014 · Alias `@shared/*` sin `baseUrl` (2026-10-11, Samuel)

TypeScript 6 marca `baseUrl` como obsoleto, así que el alias es solo `"paths": { "@shared/*": ["./shared/*"] }` en
`tsconfig.json` (las rutas se resuelven desde ese archivo). No añadir `baseUrl`. Los `*.spec.ts` de `shared/` se excluyen
de `tsconfig.app.json` y `tsconfig.spec.json`: los corre `npm run test:shared` en Node, no `ng test` en jsdom.

## D-015 · Fuente display: Fredoka y texto de los chips de tipo según contraste (2026-10-11, Samuel)

Fuente display: **Fredoka** (OFL, `@fontsource/fredoka` 5.3.0 exacto, pesos 500/600/700; el 600 lo usa `GameButton`).
Los colores de tipo salen solo de los tokens `--t-*` (una paleta). Como varios son claros, el texto del chip no es
siempre blanco: `POKEMON_TYPES[t].text` es `var(--accent-ink)` (blanco) en lucha, veneno, fantasma, dragón y siniestro
y `var(--ink)` en el resto. Con texto blanco 13 de 18 tipos no llegaban a AA (eléctrico 1,5:1); así todos ≥ 5,5:1.

## D-016 · En los tests de la app, dependencias externas por token de inyección, no con `vi.mock` (2026-10-11, Samuel)

`ng test` reutiliza la caché de módulos entre specs del mismo worker: si otro spec carga antes el módulo real
(p. ej. `@capacitor/haptics` vía `GameButton`), el `vi.mock` de un spec posterior no llega al servicio y el test falla
según el orden (pasó con HapticsService: 1 de 4 corridas). Por eso plugins y APIs del navegador se inyectan con un
`InjectionToken` con `factory` por defecto (`HAPTICS_PLUGIN`, `AUDIO_CONTEXT_FACTORY`) y el test pasa un doble con
`providers`. `vi.stubGlobal` (p. ej. `fetch`) sí es seguro.

## D-017 · Prisma 7.10: `prisma.config.ts` usa DIRECT_URL y vulnerabilidades de la CLI aceptadas (2026-10-11, Samuel)

- En Prisma 7.10 el `datasource` de `prisma.config.ts` solo admite `url` (y `shadowDatabaseUrl`): **no** existe
  `directUrl` (el plan de F0-06 lo traía; no compila). Esa URL solo la usa la CLI (migraciones) → `env('DIRECT_URL')`.
  La app se conecta con `DATABASE_URL` vía `PrismaPg`. Hoy las dos apuntan al session pooler; si algún día
  `DATABASE_URL` pasa al _transaction pooler_ (6543), las migraciones siguen yendo por `DIRECT_URL`.
- `npm audit` marca 4 "high" (`mysql2`, `deepmerge-ts`) que vienen **solo** de la CLI `prisma@7.10.0`. El servidor nunca
  carga `mysql2` (usamos Postgres) y `deepmerge-ts` solo fusiona la config local de la CLI, sin datos de usuarios.
  La única corrección que ofrece npm es bajar a Prisma 6 (contradice D-012): riesgo aceptado. Revisar al salir Prisma 7.11+.
