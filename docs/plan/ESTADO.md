# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Kenneth (Claude) · rama `develop` (tras mezclar #19)

## Fase actual

**F0 · Fundaciones — COMPLETA.** F0-01…F0-10 en `develop` (PR #8-#18); **F0-11 hecha y mezclada** (Kenneth, PR #19). Siguiente fase: **F1 · Mapa con GPS** (empieza por F1-01, el spike de Google Maps 3D en Android real).

## Hecho

- **F0-11 (Kenneth, rama `feature/F0-11-zona-segura`):** zona segura global para pantallas sin `ion-header`
  (`src/global.scss`, D-022). Probado en el Samsung A36: `/dev/ui`, login y registro sin solapes; Pokédex sin cambios.
- **F0-10 (Kenneth, rama `feature/F0-10-transaction-pooler`):** `DATABASE_URL` por el _transaction pooler_ (6543),
  `DIRECT_URL` sigue en 5432. Medido: 40/40 conexiones; 2 servidores locales + Render + e2e en paralelo = 2.516
  consultas, 0 fallos. Arreglado el borrado cruzado entre archivos e2e (500 intermitente en paralelo). D-021.
- **F0-09 (Kenneth, rama `feature/F0-09-apk`):** `android/` (Capacitor 8.5.2) con permisos, `npm run apk` (producción →
  Render; `-- device` → Nest del PC por IP LAN; `--install` con adb), icono y splash propios (`resources/brand.mjs`).
  **Probado en un Samsung A36 (Android 16):** APK 8,18 MB, splash, Pokédex desde Render, registro, `/dev/ui` con sesión
  que sobrevive a cerrar la app (Keystore OK), grito y vibración. Requiere **JDK 21** (el `jbr` reciente es 25). D-020.
- **F0-08 (Kenneth, PR #16, mezclado; Render lo sirve):** `/pokemon` (público para leer, sesión para escribir),
  `/teams`, `/favorites`, `/customPokemon` (por jugador; lo ajeno → 404) en Nest con el contrato de JSON Server
  (`_sort`, `_order`, `name_like`, `_page`, `_limit`, `X-Total-Count`). Migración `crud_curso` **aplicada en Supabase**
  (con CHECKs), semilla `cd server && npm run db:seed` (151 + demo) **ya cargada**. App: `apiUrl` → `serverUrl` (dev :3000),
  agregar/editar con `authGuard`. JSON Server archivado en `backend/legacy/` (sin `npm run api`). Postman reescrita
  (re-ejecutable, 79 comprobaciones). e2e en serie por el límite del pooler. D-019.
- **Auth en producción (Render):** `JWT_SECRET` propio puesto en Render; tras mezclar #14, probado contra
  https://pokecrud-server.onrender.com: registro 201, `/auth/me` 200, refresh 200, refresh reutilizado 401 y familia
  revocada, logout 204 (cuenta de prueba borrada).
- **F0-07 (Samuel, PR #14):** auth completa. Servidor `server/src/auth/` (registro, login, refresh rotatorio con detección de
  robo, logout, `/auth/me`; Argon2id; JWT HS256 15 min con iss/aud; guard global con `@Public()`; límite 5/min por IP y
  10 fallos/15 min por cuenta). App `src/app/core/auth/` (TokenStore Keystore/sessionStorage, AuthService con refresh
  compartido, interceptor, guards) y pantallas `/login` y `/registro`. `/dev/ui` exige sesión. Rutas IS-11 públicas
  hasta F0-08. D-018. Evidencias `docs/evidencias/F0-07_*.jpg`.
- **Servidor desplegado:** https://pokecrud-server.onrender.com (Render Free, **cuenta de Samuel**, rama `develop`,
  despliegue automático al mezclar en `develop`). `/health/ready` → `{"status":"ok","db":"ok"}` desde internet.
  `apiUrl` de `environment.prod.ts` apunta ahí.
- **F0-06 (Samuel, PR #12):** `server/` con NestJS 12 ESM + Prisma 7.10 (`PrismaPg`, pool 5),
  migración `init` **aplicada en Supabase** (tablas `Player` y `RefreshToken`), helmet, CORS con lista blanca,
  `ValidationPipe` estricto, rate limit 120/min por IP (salvo `/health`), logs JSON con `x-request-id`,
  `/health/live` y `/health/ready` (timeout 3 s → 503). Tests: 4 unitarios + 7 e2e contra la base real. D-017.
- **F0-02…F0-05 (Samuel, PR #8-#11):** dataset de 1025 especies, `shared/` con RNG, sistema de diseño + `/dev/ui`,
  servicios base (dataset en IndexedDB, audio con gritos, hápticos, ajustes). Ver BITACORA y DECISIONES D-014…D-016.
- **F0-01 hecho:** plan detallado de la fase 0. Plan maestro, reglas de relevo, `/inicio` `/guardar` `/cierre`, hooks y skills.
- El profe aprobó sustituir JSON Server por NestJS con los mismos endpoints (D-002).
- Lo que ya existía antes del plan: Angular 22 + Ionic 9 + Capacitor 8; JSON Server con `/teams`, `/favorites`,
  `/customPokemon` y **`/pokemon`** (151 sembrados, con `price` y `stock`); Postman (36 pruebas); Scrum en Jira.
  **IS-11 (Samuel, 08-10) en `develop`:** Pokédex/inventario con CRUD; Equipos, Favoritos y Mis Pokémon **ocultos**.

## En curso

- **F1-08 (Alex, rama `feature/F1-08-inventario-xp`):** inventario, bolas iniciales, nivel/XP y HUD.
- **F1-01 → PENDIENTE DE KENNETH** (medir en Android): rama `feature/F1-01-spike-mapa-3d`.
- F0-12 (PR #21) y F1-06 (PR #22) de Alex esperan revisión.

## Siguiente paso concreto

1. **Alex y Samuel:** puerto de `DATABASE_URL` → 6543 en su `.env`;
   **Samuel:** también en Render (ver Bloqueos).
2. Siguiente: **F1-01** (spike Google Maps 3D + overlay three.js, medir fps en Android real; dep F0-09 ✔). Necesita
   `environment.local.ts` con la clave de Maps (Alex: la clave es suya) y un móvil Android con Depuración USB. OJO: mapa a pantalla completa →
   anular la zona segura en su `ion-content` (D-022).
3. Para generar el APK en otro PC: instalar JDK 21 (`winget install Microsoft.OpenJDK.21`) y `npm run apk`.

## Bloqueos / roto / pendiente de humanos

- **Cada compañero necesita su propio `JWT_SECRET`** en su `server/.env` para arrancar el servidor en local (SECRETOS.md).
- **En local hacen falta dos servidores:** Nest (`cd server && npm run start:dev`, puerto **3000**) y la app (`npm start`).
  Si tu `server/.env` tiene `PORT=3001` de antes, cámbialo a 3000 (o bórralo).
- **ACCIÓN — puerto de la base (F0-10, D-021):** cada uno cambia en su `server/.env` el puerto de `DATABASE_URL` de
  **5432 a 6543** (solo ese; `DIRECT_URL` se queda en 5432). **Samuel:** lo mismo en la variable `DATABASE_URL` de Render.
  Mientras alguien siga en 5432 consume del cupo de 15 del session pooler (hoy Render: 5); no rompe nada, pero el riesgo
  vuelve si los tres se quedan en 5432.

- **Render está en la cuenta de Samuel:** solo él ve los logs y cambia variables. Si hay que rotar la contraseña de la BD
  (SECRETOS.md), Samuel actualiza `DATABASE_URL` y `DIRECT_URL` en Render. Plan gratis: se duerme a los 15 min.
- **Inventario IS-11 en producción:** `/pokemon` llega a Render al mezclar F0-08 (las tablas y la semilla ya están en la base).
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
- Servidor desplegado: https://pokecrud-server.onrender.com (`/health/ready`).
