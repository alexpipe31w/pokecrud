---
name: estandares-produccion
description: "Manual de ingeniería de Alex para que el código nazca listo para producción real: idempotencia, atomicidad, transacciones, concurrencia y condiciones de carrera, escalabilidad (N+1, índices, paginación, retención), autenticación y sesiones (JWT, cookies httpOnly, refresh tokens, autorización en servidor, multi-tenant), endurecimiento de API (rate limiting, límites de intentos, cabeceras de seguridad, CORS, CSRF, validación de input, uploads, webhooks con HMAC), resiliencia (timeouts, reintentos con backoff, degradación) y manejo de errores y observabilidad. Úsala ANTES de escribir cualquier endpoint, job, cron, webhook, migración o flujo de autenticación, al arrancar un proyecto nuevo, y para revisar código antes de mergear. Triggers: 'aplica mis estándares', 'que quede robusto', 'listo para producción', 'buenas prácticas', 'código resistente', 'endurece esto', 'arranco un proyecto', 'crea un endpoint', 'crea un webhook', 'monta la autenticación', 'JWT', 'sesiones', 'cookies seguras', 'rate limit', 'límite de intentos', 'cabeceras de seguridad', 'condiciones de carrera', 'esto es idempotente', 'revisa antes de mergear', 'auditoría de código', 'pasa el checklist'."
---

# Estándares de producción

Este es el manual que Alex aplica a todo el código que toca **datos persistentes, red, autenticación o estado compartido**. Es la versión ejecutable y ampliada de la sección 2 de `~/.claude/CLAUDE.md`.

**Regla fundamental: el código se escribe ya endurecido, no se endurece después.** Un timeout, un `@@unique` o un `where` de tenant cuestan una línea mientras escribes y cuestan un incidente en producción. No entregues un endpoint "que funciona" con la promesa de asegurarlo luego.

**Segunda regla, igual de dura: nada se afirma sin leerlo.** Antes de decir que algo es idempotente, abre el `schema.prisma` y la migración. Antes de decir que hay índice, míralo. Si no puedes verificarlo, dilo como supuesto explícito — nunca como hecho.

---

## Cómo se usa esta skill

Tiene dos modos. Elige según lo que te hayan pedido:

| Te piden… | Modo |
|---|---|
| escribir un endpoint, job, cron, webhook, migración, login, integración | **A — Construir** |
| revisar un diff, una rama, un PR, "¿esto está listo?" | **B — Revisar** |
| arrancar un proyecto desde cero | **A**, empezando por *Día 1* |

No cargues las siete referencias. Carga **solo** las que toque lo que estás haciendo (tabla de enrutado más abajo).

---

## Los no negociables

Doce reglas que aplican **siempre**, sin necesidad de abrir ninguna referencia. Si un cambio rompe una de estas, no está terminado:

1. **Toda llamada externa lleva timeout.** `fetch(url, { signal: AbortSignal.timeout(5000) })`. Sin timeout no hay disponibilidad.
2. **Todo input externo se valida con esquema en el borde.** Zod o `class-validator`. Un `as MiDto` no valida nada: el tipo se borra en runtime.
3. **Toda autorización se comprueba en el servidor, en cada endpoint.** Que la UI oculte el botón no es control de acceso.
4. **Toda query multi-tenant filtra por tenant.** Un `where` sin `tenantId` es una fuga de datos entre clientes.
5. **Todo listado tiene paginación y límite desde el día uno.** Nada de `findMany()` sin `take`.
6. **Todo lo reintentable es idempotente.** Webhook, cron, job en cola: clave de idempotencia con `UNIQUE` en BD, no un `SELECT` suelto seguido de un `INSERT`.
7. **Los contadores se modifican en la sentencia `UPDATE`, nunca leyendo, restando y guardando.** Stock, saldos, cupos: `updateMany({ where: { id, stock: { gte: n } }, data: { stock: { decrement: n } } })`.
8. **Las escrituras que deben cuadrar entre sí van en una transacción**, y ninguna llamada de red vive dentro de ella.
9. **Ningún secreto en el código, en el repo ni en los logs.** Solo variables de entorno.
10. **Ningún `catch` vacío ni que devuelva `null` tragándose el error.** Se registra con contexto (ids, no objetos enteros, nunca secretos) o se relanza.
11. **Ningún token de sesión en `localStorage`.** Cookie `httpOnly` + `Secure` + `SameSite`.
12. **Toda ruta de escritura o de autenticación tiene rate limit.** Y el login, además, límite de intentos.

---

## Modo A — Construir

### Paso 0 (solo proyecto nuevo) — Día 1

Antes de la primera feature, deja puesto esto. Añadirlo después siempre cuesta más:

- **Validación de entrada** con Zod/`class-validator` y un helper compartido para parsear el body.
- **Manejador de errores global** con taxonomía de errores (ver `references/errores-y-observabilidad.md`), que traduce a códigos HTTP y nunca filtra el stack al cliente.
- **Logger estructurado** (JSON) con id de correlación por petición. `console.log` suelto no es observabilidad.
- **Migraciones versionadas** desde el primer modelo. Nada de tocar el esquema a mano en la base.
- **Rate limiting** en el borde, con almacén compartido (ver aviso de serverless en `references/api-endurecimiento.md`).
- **Cabeceras de seguridad** en middleware/config, una sola vez para toda la app.
- **`.env` fuera del repo** y un `.env.example` con las claves sin valores.
- **Health check** (`/health`) que distinga *vivo* de *listo*.

### Paso 1 — Clasificar y cargar solo lo que toca

Mira lo que vas a escribir y carga las referencias correspondientes:

| Vas a escribir… | Lee |
|---|---|
| endpoint que escribe en BD, job, cron, cola | `references/datos-y-concurrencia.md` |
| listado, búsqueda, reporte, cualquier consulta que crezca | `references/escalabilidad.md` |
| login, registro, sesiones, JWT, permisos, multi-tenant | `references/autenticacion.md` |
| cualquier ruta HTTP pública, webhook, subida de archivos, formulario | `references/api-endurecimiento.md` |
| integración con un tercero (pasarela, LLM, WhatsApp, CRM) | `references/resiliencia.md` |
| cualquier cosa (siempre, es transversal) | `references/errores-y-observabilidad.md` |

Casi todo endpoint real cae en tres o cuatro filas a la vez. Un webhook de pago, por ejemplo, las toca todas menos escalabilidad.

### Paso 2 — Escribir

Sigue el estilo del código que ya existe en el repo: lee dos o tres archivos vecinos antes de introducir un patrón. Un patrón nuevo y "mejor" que nadie más usa es deuda, no mejora.

Si un no negociable no se puede cumplir por una restricción real del proyecto, **escríbelo en el código como comentario y díselo al usuario**. Lo que no se puede es incumplirlo en silencio.

### Paso 3 — Autoverificación antes de entregar

No digas que está hecho hasta poder responder esto sobre lo que acabas de escribir:

1. ¿Qué pasa si esto se ejecuta **dos veces** con la misma entrada?
2. ¿Qué pasa si **dos peticiones simultáneas** tocan el mismo registro?
3. ¿Qué pasa si la **segunda escritura falla** después de la primera?
4. ¿Qué pasa si el **servicio externo tarda 60 segundos** o devuelve 500?
5. ¿Puede un usuario pedir el recurso de **otro usuario u otro tenant** cambiando un id?
6. Cuando esto falle en producción a las 3 de la mañana, ¿**el log basta** para reproducirlo?
7. ¿Qué pasa cuando esta tabla tenga **un millón de filas**?

Cada respuesta debe ser una línea de código concreta que ya escribiste, no una intención. Las que no lo sean, arréglalas antes de entregar.

Y ejecuta la comprobación: el test, el build, la query. **Pega la salida.** Nunca digas "funciona" sin haberlo visto.

---

## Modo B — Revisar

### 1. Alcance
Si no te dijeron qué revisar, resuélvelo y anúncialo en una línea con números (`Revisando 14 archivos / 620 líneas de origin/main...feat/cod`):

```bash
git status --short                        # ¿cambios sin commitear? → git diff
git diff --stat origin/main...HEAD        # rama vs main
gh pr diff <n>                            # si te dieron un PR
```
Si estás en `main` y limpio, pregunta qué revisar en vez de adivinar.

### 2. Triaje
Quédate solo con lo que toca datos persistentes, red, autenticación o estado compartido. UI pura, tipos, estilos y copy quedan fuera, y lo dices: `Fuera de alcance: 9 archivos (componentes y tipos)`. Si no queda nada, dilo y termina — no inventes hallazgos para justificar la revisión.

### 3. Contexto real (obligatorio antes de cualquier hallazgo)
- **Lee el middleware y la configuración global ANTES de acusar a una ruta.** Rate limiting, autenticación, cabeceras de seguridad y CORS casi nunca viven en el handler: viven en `middleware.ts`, en `next.config`, en un guard de Nest o en un interceptor. Una ruta "sin rate limit" que en realidad lo tiene en un matcher global es el falso positivo más fácil de cometer y el que más credibilidad te cuesta.
- Abre `schema.prisma` **y** las migraciones: un `@@unique` que no esté en una migración no existe en producción.
- Comprueba las env vars de las que dependa el hallazgo.
- Busca quién llama al código: puede estar protegido por el llamante.
- Si hay MCP de Supabase de solo lectura (`supabase-ro`), confirma índices y constraints en la base real. Nunca uses un MCP de escritura para revisar.

```bash
# Capas globales primero: qué cubre el middleware y hasta dónde llega su matcher
cat src/middleware.ts middleware.ts 2>/dev/null | grep -n "matcher\|pathname.startsWith\|RateLimit\|headers.set"
grep -rn "@Injectable\|APP_GUARD\|useGlobalGuards\|useGlobalPipes" --include="*.ts" src 2>/dev/null | head

grep -rn "@@unique\|@@index" --include="schema.prisma" .
grep -rn "CREATE UNIQUE INDEX\|CREATE INDEX\|ADD CONSTRAINT" prisma/migrations supabase/migrations 2>/dev/null
```

### 4. Pasar el checklist
Recorre las referencias que apliquen y usa sus secciones **"Cómo buscarlo"** (traen los `grep` concretos por stack).

### 5. Informe
Cada hallazgo lleva cinco cosas, o no es un hallazgo:

- **Severidad** — `BLOQUEANTE` (cobra dos veces, corrompe datos, filtra datos entre tenants, tumba el flujo principal) / `GRAVE` (falla bajo carga o deja el sistema ciego) / `MENOR` (deuda acotada).
- **Categoría** — una de las siete.
- **Ubicación** — `archivo:línea`.
- **Escenario de fallo** — con datos concretos: *"dos compras del último cartucho a la vez: ambas leen `stock=1`, ambas restan, queda `-1` y se vende dos veces"*. En abstracto no vale.
- **Evidencia** — qué leíste que lo demuestra, citando línea.

Y debajo la corrección, en el idioma del código que ya existe en ese repo.

**Descarta antes de escribir** todo hallazgo que no pase estas tres: ¿señalo la línea exacta?, ¿tengo escenario con datos concretos?, ¿he comprobado que no esté ya resuelto en otra capa (constraint, middleware, el llamante)? Lo que no pase va a una sección **`Sin verificar`** con la pregunta que lo cerraría. Un falso positivo cuesta más que un hallazgo de menos.

Cierra con **veredicto** (`NO MERGEAR` / `MERGEAR CON DEUDA` / `LISTO`) y la tabla de las siete categorías. **Las siete salen siempre**, aunque digan `➖ no aplica: <razón>`. Silencio no es aprobado.

**No arregles nada por tu cuenta.** Termina preguntando una sola cosa: *"¿Arreglo los bloqueantes (#1 y #2) o prefieres revisarlos antes?"*

---

## Antes de salir a producción

Cuando el proyecto vaya a recibir usuarios reales, pasa `references/checklist-preprod.md`. Es la puerta de salida, no una sugerencia.
