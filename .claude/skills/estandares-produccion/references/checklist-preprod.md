# Checklist de salida a producción

Se pasa cuando el proyecto va a recibir usuarios reales, y otra vez antes de cada cambio grande. Es una puerta, no una sugerencia.

**Cómo se pasa:** cada línea se responde con **evidencia** (el archivo, la línea, la salida del comando), no con "sí". Lo que no se pueda comprobar se marca `SIN VERIFICAR` con la pregunta concreta que lo cerraría. Y lo que no aplique se marca `NO APLICA` **con su razón** — nunca en blanco.

---

## Datos

- [ ] Toda operación reintentable tiene clave de idempotencia con `UNIQUE` **en una migración aplicada**.
- [ ] Ningún `SELECT` suelto seguido de `INSERT` en rutas concurrentes.
- [ ] Las escrituras que deben cuadrar están en una transacción, y no hay llamadas de red dentro.
- [ ] Contadores y stock se modifican en el `UPDATE`, con guard (`where` con la condición) y `CHECK` en la base.
- [ ] Las colas tienen claim atómico (`FOR UPDATE SKIP LOCKED`), timeout de claim y tope de reintentos.
- [ ] Los crons tienen lock contra solapamiento.
- [ ] Las escrituras que cruzan sistemas tienen outbox, saga o reconciliación — y está escrito cuál.
- [ ] Hay copias de seguridad **y se ha probado una restauración**. Un backup no verificado no es un backup.

## Escalabilidad

- [ ] Ningún `findMany` sin `take`. Todo listado paginado, con tope máximo del lado del servidor.
- [ ] Sin N+1 en las rutas calientes.
- [ ] Toda columna de `WHERE`/`JOIN`/`ORDER BY` caliente tiene índice aplicado (verificado en la base, no solo en el schema).
- [ ] Toda tabla que solo crece tiene política de retención o archivado.
- [ ] El trabajo pesado está fuera del ciclo petición-respuesta.
- [ ] El pool de conexiones está dimensionado para el número real de instancias (pooler si es serverless).

## Autenticación y autorización

- [ ] Autorización comprobada en el servidor en **cada** endpoint, con la pertenencia dentro del `where`.
- [ ] Toda query multi-tenant filtra por tenant (o hay RLS que lo garantice).
- [ ] Contraseñas con Argon2id/bcrypt (coste ≥ 12). Ningún hash casero.
- [ ] Tokens de sesión en cookie `httpOnly` + `Secure` + `SameSite`. Nada en `localStorage`.
- [ ] Caducidad de sesión explícita, y absoluta además de la deslizante.
- [ ] Si hay JWT: access corto, refresh rotativo de un solo uso, `algorithms` fijado en la verificación, `iss`/`aud`/`exp` comprobados.
- [ ] Login con límite de intentos por cuenta **y** por IP, con backoff.
- [ ] Cambiar la contraseña invalida las demás sesiones.
- [ ] Los mensajes y tiempos de login no revelan si el usuario existe.
- [ ] MFA disponible para cuentas con acceso a dinero o datos de terceros.

## Superficie pública

- [ ] Todo input externo validado con esquema (`.strict()`), incluidos query params y webhooks.
- [ ] Ningún `data: body` ni spread del body hacia la base.
- [ ] Ningún dato que decide el servidor (precio, rol, tenant, estado) se acepta del cliente.
- [ ] Rate limit con almacén compartido en toda ruta de escritura y de autenticación, devolviendo 429 con `Retry-After`.
- [ ] Cabeceras de seguridad puestas globalmente: HSTS, CSP (sin `unsafe-inline` en scripts), `nosniff`, `Referrer-Policy`, `frame-ancestors`.
- [ ] CORS con lista blanca; nunca `*` con `credentials`.
- [ ] CSRF cubierto (`SameSite` o token) en los endpoints de cambio de estado.
- [ ] Webhooks: firma HMAC sobre el cuerpo crudo, comparación en tiempo constante, ventana temporal e idempotencia.
- [ ] Uploads: límite de tamaño, tipo validado por contenido, nombre regenerado, servidos desde otro dominio.
- [ ] Sin redirección abierta ni SSRF en URLs que da el usuario.
- [ ] `npm audit` sin vulnerabilidades explotables; lockfile commiteado.

## Secretos y configuración

- [ ] Ningún secreto en el repo ni en el historial. Lo que se filtró alguna vez, **rotado**.
- [ ] Ninguna clave sensible bajo `NEXT_PUBLIC_` ni en el bundle del cliente.
- [ ] Variables de entorno distintas por entorno, y validadas al arrancar (que falte una debe romper el arranque, no el primer usuario).
- [ ] Ningún secreto en logs ni en respuestas de error.

## Resiliencia

- [ ] Toda llamada externa con timeout, incluido el de la base de datos.
- [ ] Reintentos solo sobre operaciones idempotentes, con backoff exponencial, jitter y tope.
- [ ] Está escrito qué pasa con cada dependencia caída: degradar, encolar o fallar limpio.
- [ ] Ningún servicio secundario puede tumbar el flujo principal.
- [ ] Apagado ordenado ante `SIGTERM`.
- [ ] Health check que distingue vivo de listo.

## Errores y observabilidad

- [ ] Ningún `catch` vacío ni que devuelva `null` tragándose el error.
- [ ] Manejador de errores global; el cliente nunca ve stacks ni detalles internos.
- [ ] Logs estructurados con id de correlación, con ids y sin secretos ni datos personales.
- [ ] Los flujos de dinero y sincronización tienen traza auditable en tabla, escrita en la misma transacción.
- [ ] Errores del cliente capturados y enviados al mismo sistema.
- [ ] Alertas sobre síntomas que afectan al usuario, y alguien las mira.

## Despliegue

- [ ] Las migraciones son compatibles con la versión anterior corriendo (nada de `NOT NULL` sin default, ni renombrados en un paso).
- [ ] Índices creados con `CONCURRENTLY` si la tabla es grande.
- [ ] Se puede revertir el despliegue, y está probado.
- [ ] En Vercel: **`redeploy` no recoge variables de entorno nuevas** — hace falta un despliegue nuevo.
- [ ] Los crons están registrados donde se ejecutan de verdad (crontab del pod, Vercel Cron) y verificados, no solo escritos.

---

## Veredicto

Al terminar, una línea: **`LISTO` / `LISTO CON DEUDA` / `NO SALE`**, y debajo la lista de lo pendiente con responsable y fecha. Un checklist que acaba sin veredicto no ha servido de nada.
