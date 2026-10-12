# Secretos — cómo se configuran (y cómo NO)

> Este repo es **PÚBLICO**. Un secreto que llegue a GitHub lo puede usar cualquiera (y los bots
> que escanean GitHub lo encuentran en minutos). Esta guía es obligatoria para humanos e IAs.

## Qué secretos hay y dónde van

| Archivo (ruta exacta)                   | Qué contiene                                               | Plantilla sin valores                           |
| --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `src/environments/environment.local.ts` | Clave de Google Maps (`googleMapsApiKey`) y Map ID         | `src/environments/environment.local.example.ts` |
| `server/.env`                           | `DATABASE_URL` y `DIRECT_URL` de Supabase (con contraseña) | `server/.env.example`                           |
| `server/.env` (y Render)                | `JWT_SECRET` (firma los access tokens, F0-07)              | `server/.env.example`                           |

Los dos están en `.gitignore`. **`JWT_SECRET` no se reparte:** cada entorno genera el suyo (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`), uno en cada PC y otro distinto en Render. Si se filtra, se genera otro: solo obliga a volver a iniciar sesión. Alex los pasa **por privado** (WhatsApp/DM) a cada integrante.
Nunca por el grupo, Jira, GitHub, issues, PRs ni capturas.

**Puertos (F0-10):** `DATABASE_URL` va al _transaction pooler_ (**6543**) y `DIRECT_URL` al _session pooler_ (**5432**),
con la misma contraseña. Quien tenga un `server/.env` anterior con las dos en 5432: cambiar solo el puerto de
`DATABASE_URL` a 6543 (y en Render, la variable `DATABASE_URL`). Ver D-021.

## Lo que tiene que hacer la IA cuando el humano le pasa esos valores

Si el humano pega en el chat el contenido de uno de estos archivos (o dice "toma la clave / el .env"):

1. **Crear el archivo en la ruta exacta** de la tabla, con la herramienta de escritura del agente
   (Write). Nunca con `Set-Content`/`echo` de PowerShell (BOM y `\r` rompen el archivo).
   - Si el humano pegó solo el valor suelto, usar la plantilla `*.example*` y rellenar.
   - Respetar el formato exacto de la plantilla (comillas, nombres de variables).
2. **Comprobar que Git lo ignora** antes de nada más:
   `git check-ignore -v src/environments/environment.local.ts server/.env`
   → tienen que salir las dos líneas. Si alguna NO sale: **parar**, no commitear, avisar al humano.
3. **Comprobar que funciona sin imprimir el secreto**:
   - Base de datos: desde `server/` (cuando exista), `npx prisma migrate status` o una consulta
     `select 1`; mostrar solo "OK"/"FALLO" y el error con la URL tapada.
   - Google Maps: arrancar la app y ver que el mapa carga sin `RefererNotAllowedMapError`
     (la app tiene que servirse en `localhost:8100`, `localhost:4200` o dentro del APK).
4. **Nunca repetir el secreto** en la respuesta, ni en `ESTADO.md`, `BITACORA.md`, commits, PRs,
   comentarios de código, logs ni capturas. En la bitácora se escribe: "configurado `server/.env` (OK)".
5. Recordar al humano, una sola vez y en una línea: "lo que pegaste queda en el historial de esta
   conversación; la próxima vez puedes crear el archivo tú mismo con el Bloc de notas".
6. Antes de cualquier commit de esa sesión: `git status` y `git diff --cached --name-only` →
   ninguno de los dos archivos puede aparecer. Si aparece: `git restore --staged <archivo>`.

## Si un secreto se filtra (llegó a GitHub, a un grupo o a una captura pública)

1. Avisar a Alex **de inmediato** (es el dueño de las cuentas).
2. Google Maps: consola de Google Cloud → Credenciales → `pokecrud-maps-js` → **Rotar clave**.
3. Supabase: panel del proyecto `pokecrud-go` → Database → **Reset database password**.
4. Repartir los valores nuevos por privado y anotar en `BITACORA.md` que se rotaron (sin los valores).
5. Borrar el secreto del historial de Git **no basta** (ya pudo copiarse): lo que lo arregla es rotarlo.

## Datos que NO son secretos (se pueden escribir en el repo)

Map ID de Google (`5309ecf69efbfe12f3ecbc4c`), ref del proyecto Supabase (`ggfnjophcsyawltmoseh`), host del
pooler (`aws-1-sa-east-1.pooler.supabase.com`), región, nombres de proyectos.
