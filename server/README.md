# Servidor de PokéCRUD GO

NestJS 12 (ESM) + Prisma 7.10 + PostgreSQL (Supabase). Arquitectura en `docs/plan/ARQUITECTURA.md`.

## Puesta en marcha

1. Crear `server/.env` según `docs/plan/SECRETOS.md` (Alex pasa los valores de la BD por privado; `JWT_SECRET` lo genera
   cada uno). **Nunca se sube.**
2. `npm install` (genera el cliente de Prisma en `src/generated/`, que tampoco se sube).
3. `npm run start:dev` → `http://localhost:3000/health/ready` debe responder `{"status":"ok","db":"ok"}`.

4. `npm run db:seed` carga los 151 Pokémon del inventario y los datos de ejemplo (idempotente: solo crea lo que falte,
   nunca pisa precios ni stock editados).

## Comandos

| Comando                                | Qué hace                                                              |
| -------------------------------------- | --------------------------------------------------------------------- |
| `npm run start:dev`                    | Servidor en modo desarrollo (recarga al guardar, logs legibles)       |
| `npm run build` · `npm run start:prod` | Compila a `dist/` y lo arranca (logs en JSON)                         |
| `npm test`                             | Tests unitarios (no tocan la base)                                    |
| `npm run test:e2e`                     | Tests e2e contra la base **real** de `server/.env`                    |
| `npm run lint`                         | oxlint                                                                |
| `npm run db:migrate -- --name <x>`     | Crea una migración nueva (OJO: en una base con datos, revisar el SQL) |
| `npm run db:deploy`                    | Aplica las migraciones pendientes (lo que se usa en Render)           |
| `npm run db:seed`                      | Semilla del CRUD del curso (`backend/legacy/db.seed.json`)            |

## Endpoints

| Ruta                                                                                      | Qué responde                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /health/live`                                                                        | `200 {status:'ok'}` si el proceso vive (no toca la base)                          |
| `GET /health/ready`                                                                       | `200 {status:'ok', db:'ok'}` o `503 {status:'error', db:'down'}` (timeout de 3 s) |
| `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `GET /auth/me` | Auth (F0-07): contrato en `docs/plan/fases/F0-fundaciones.md` → F0-07             |

Arranque endurecido (`src/main.ts`, `src/app.module.ts`): helmet, CORS con lista blanca (`CORS_ORIGINS`),
`ValidationPipe` estricto, rate limit global de 120 peticiones/min por IP (salvo `/health`), logs JSON con
`x-request-id` y cabeceras sensibles tapadas, `trust proxy` en producción.

## Despliegue en Render

Lo puede hacer cualquier integrante que tenga `server/.env`, con su propia cuenta gratis de Render (entrar con
GitHub). El repo es público, así que no hace falta ser su dueño. **Anotar en ESTADO.md en qué cuenta quedó.**

- **New → Web Service → Public Git Repository:** `https://github.com/alexpipe31w/pokecrud`. Rama `develop`, o la
  rama del PR si todavía no está mezclado. Con un repo público por URL no hay despliegue automático: tras cada
  cambio se pulsa **Manual Deploy**.
- **Root Directory:** `server` · **Language:** Node · **Instance Type:** Free.
- **Build Command:** `npm ci --include=dev && npm run build`. El `--include=dev` es obligatorio: con
  `NODE_ENV=production`, `npm ci` se salta las devDependencies (CLI de Nest y de Prisma) y el build falla.
- **Start Command:** `npx prisma migrate deploy && npm run start:prod`
- **Health Check Path:** `/health/ready`
- **Variables:** `DATABASE_URL` y `DIRECT_URL` (copiar los valores de `server/.env`, sin las comillas),
  `JWT_SECRET` (uno PROPIO de Render, ≥ 32 caracteres, distinto del local: ver SECRETOS.md; sin él el servidor no
  arranca), `NODE_ENV=production`, `NODE_VERSION=24`,
  `CORS_ORIGINS=http://localhost:8100,http://localhost:4200,https://localhost` (+ el origen de la app si se publica).
- Comprobar `https://<servicio>.onrender.com/health/ready` y anotar la URL en `docs/plan/ESTADO.md` y en
  `src/environments/environment.prod.ts` (`apiUrl`). Render gratis se duerme a los 15 min: el primer request tarda ~1 min.
