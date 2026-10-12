# ESTADO — foto del ahora

> Se **reescribe** al cerrar cada sesión (no es histórico; el histórico es `BITACORA.md`).
> Máximo una pantalla. Si lees esto al empezar: después lee `ROADMAP.md`.

**Última actualización:** 2026-10-11 · por Kenneth (Claude) · rama `feature/F0-08-crud-nest`

## Fase actual

**F0 · Fundaciones** — **F0-01…F0-07 hechas y en `develop`** (PR #8-#14). **F0-08 hecha y mezclada** (Kenneth, PR #16
pendiente de mezclar). Libres: **F0-09** APK y **F0-10** transaction pooler (nueva).

## Hecho

- **F0-08 (Kenneth, rama `feature/F0-08-crud-nest`, PR a `develop`):** `/pokemon` (público para leer, sesión para escribir),
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

- **F0-09** (@kenneth, rama `feature/F0-09-apk`): pipeline del APK. Punto de guardado: pasos 1-2 (`android/` con Capacitor 8.5.2, permisos; APK debug compila con JDK 21: el `jbr` de Android Studio aquí es JDK 25 y Gradle 8.14.3 no lo soporta). Pasos 3-4: `npm run apk` (producción, Render) y `npm run apk -- device` (IP LAN + cleartext solo con CAP_DEV=1), `--install` con adb. Sigue: paso 5 (icono y splash).

## Siguiente paso concreto

1. Revisar y mezclar el PR #16 (F0-08) en `develop`. Después, comprobar en Render `GET /pokemon?_limit=1` (200).
2. Al mezclar: Render aplica la migración sola (`prisma migrate deploy` en el arranque; ya está aplicada, no hará nada).
3. Siguiente tarea libre: **F0-10** (pooler, ver riesgo abajo) o **F0-09** (APK).

## Bloqueos / roto / pendiente de humanos

- **Cada compañero necesita su propio `JWT_SECRET`** en su `server/.env` para arrancar el servidor en local (SECRETOS.md).
- **En local hacen falta dos servidores:** Nest (`cd server && npm run start:dev`, puerto **3000**) y la app (`npm start`).
  Si tu `server/.env` tiene `PORT=3001` de antes, cámbialo a 3000 (o bórralo).
- **RIESGO — límite de conexiones (F0-10):** el _session pooler_ de Supabase admite **15 clientes en total**. Render (5) +
  cada servidor local (5) los comparten: con los tres desarrollando a la vez, producción puede dar 500 (`EMAXCONNSESSION`).
  Mientras no se haga F0-10, apagad el servidor local cuando no lo uséis.

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
