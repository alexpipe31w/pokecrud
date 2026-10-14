# Endurecimiento de API y superficie pública

Aplica a toda ruta HTTP que reciba tráfico externo: endpoints, webhooks, formularios, subidas de archivos, Server Actions.

---

## 1. Validación de entrada

**Todo input externo se valida con esquema en el borde.** Un tipo de TypeScript no valida nada: se borra en runtime.

```ts
// MAL — el cast es una mentira en tiempo de ejecución
const body = (await req.json()) as CrearOrdenDto;

// BIEN
const parsed = CrearOrdenSchema.safeParse(await req.json());
if (!parsed.success) {
  return Response.json({ error: 'datos inválidos', detalles: parsed.error.flatten() }, { status: 400 });
}
```

- **Valida también** query params, path params, cabeceras que uses y el contenido de los webhooks.
- **Lista blanca, no lista negra.** Con Zod, `.strict()` para rechazar campos desconocidos: evita el *mass assignment* (que alguien mande `{ role: 'admin' }` o `{ precio: 0 }` y acabe en un `data:` de Prisma).
- **Nunca pases el body directo a la BD.** `data: body` es una vulnerabilidad, no un atajo. Construye el objeto campo a campo con lo que el esquema aprobó.
- **Pon topes**: longitud de strings, tamaño de arrays, rango de números, tamaño total del body. Un array de 100.000 elementos es un ataque.
- **Los datos que decide el servidor no se aceptan del cliente**: precio, total, `userId`, `tenantId`, `role`, estado del pedido. Se calculan o se leen de la sesión.
- **SQL siempre parametrizado.** `$queryRaw` con template tag está parametrizado; `$queryRawUnsafe` no. En Postgres, los identificadores (nombres de tabla/columna) no se pueden parametrizar: si vienen del usuario, valídalos contra una lista blanca.

```bash
grep -rn "as [A-Z][A-Za-z]*Dto\|as unknown as" --include="*.ts" src app
grep -rn "data: body\|data: req.body\|\.\.\.body" --include="*.ts" src app
grep -rn "queryRawUnsafe\|executeRawUnsafe" --include="*.ts" src app
```

---

## 2. Rate limiting

**Toda ruta de escritura o de autenticación lleva rate limit.** Y las de lectura caras también.

### El footgun de serverless

Un rate limiter en memoria **no funciona** en Vercel, Lambda o cualquier cosa que escale a varias instancias: cada instancia tiene su propio contador, así que el límite real es *N × tu límite*, y se resetea en cada arranque en frío. Hace falta un **almacén compartido** (Redis/Upstash) o el rate limiting de la plataforma.

```ts
import { Ratelimit } from '@upstash/ratelimit';
const limiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'api:checkout',
});

const { success, limit, remaining, reset } = await limiter.limit(clave);
if (!success) {
  return new Response('Demasiadas peticiones', {
    status: 429,
    headers: {
      'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      'RateLimit-Limit': String(limit),
      'RateLimit-Remaining': String(remaining),
    },
  });
}
```

- **Elige bien la clave.** Usuario autenticado → id de usuario. Anónimo → IP, pero detrás de un proxy la IP real está en `x-forwarded-for` y **es falsificable si no confías en el proxy**: usa la cabecera que tu plataforma firma (en Vercel, `request.ip` / `x-real-ip`), no la primera de la lista a ciegas.
- **Límites distintos por ruta.** El login y el envío de correos no toleran lo mismo que un listado.
- **Devuelve siempre `429` con `Retry-After`.** Un 500 le dice al cliente que reintente sin control.
- **Ten un límite global además del de ruta**, para que un endpoint olvidado no quede desnudo.
- **Rate limit por coste, no solo por petición**, cuando lo que hay detrás cuesta dinero (LLM, SMS, WhatsApp): cuenta tokens o mensajes, no llamadas.

---

## 3. Cabeceras de seguridad

Se ponen **una vez** para toda la app (middleware o config), no endpoint por endpoint.

| Cabecera | Valor razonable | Qué evita |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | degradación a HTTP |
| `Content-Security-Policy` | ver abajo | XSS e inyección de scripts |
| `X-Content-Type-Options` | `nosniff` | que el navegador adivine el tipo |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | fuga de URLs con tokens |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | APIs del navegador que no usas |
| `X-Frame-Options` | `DENY` (o `frame-ancestors` en CSP) | clickjacking |

**CSP es la que de verdad importa y la que cuesta.** Una CSP con `unsafe-inline` en `script-src` no protege de casi nada. Con Next.js, genera un nonce por petición en el middleware y pásalo a los scripts:

```ts
const nonce = crypto.randomUUID();
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://res.cloudinary.com`,
  `connect-src 'self' https://api.tuservicio.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');
```

Despliégala primero en `Content-Security-Policy-Report-Only` y mira qué rompe antes de activarla.

---

## 4. CORS y CSRF

**CORS no es seguridad, es un permiso del navegador.** No protege tu API de nada que no sea un navegador. Aun así:

- Lista blanca explícita de orígenes. **Nunca `origin: '*'` junto a `credentials: true`** — es una contradicción que algunos frameworks aceptan y abre la API entera.
- No reflejes el `Origin` de la petición sin comprobarlo contra la lista.

**CSRF** aplica cuando autenticas con cookies:

- `SameSite=Lax` corta el caso común (peticiones cross-site que no sean GET de navegación).
- Si necesitas `SameSite=None` (front en otro dominio), hace falta **token CSRF** (doble envío o sincronizador).
- Las **Server Actions de Next.js** ya comprueban origen; una route handler `POST` a mano, no.
- Comprueba `Origin`/`Referer` en endpoints de cambio de estado como refuerzo.

---

## 5. Webhooks entrantes

Un webhook sin verificar es un endpoint público que marca pedidos como pagados. Los cuatro controles, siempre:

1. **Firma HMAC verificada** con el secreto del proveedor, sobre el **cuerpo crudo** (no sobre el JSON re-serializado: cambia un espacio y la firma no cuadra). En Next.js, `await req.text()` antes de parsear.
2. **Comparación en tiempo constante**: `crypto.timingSafeEqual`, nunca `===`.
3. **Ventana temporal**: rechaza eventos con marca de tiempo de hace más de unos minutos, para cortar reenvíos (*replay*).
4. **Idempotencia** por el id del evento — ver `datos-y-concurrencia.md`.

```ts
const raw = await req.text();
const esperado = crypto.createHmac('sha256', SECRET).update(`${ts}.${raw}`).digest();
const recibido = Buffer.from(req.headers.get('x-signature') ?? '', 'hex');
if (recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) {
  return new Response('firma inválida', { status: 401 });
}
```

Y dos reglas de comportamiento: **responde 2xx rápido** y haz el trabajo pesado en cola (si tardas, el proveedor reintenta y te duplica el evento); **devuelve 5xx solo cuando quieras que reintente** — un 200 en un caso de error real hace que el evento se pierda para siempre.

---

## 6. Subida de archivos

- **Límite de tamaño en el borde**, antes de leer el archivo en memoria.
- **Valida el tipo por contenido (*magic bytes*), no por extensión ni por `Content-Type`**, que los pone el cliente.
- **Renombra siempre** con un id generado por ti. Nunca uses el nombre del usuario en la ruta: `../../` es un ataque de recorrido de directorios.
- **Sírvelos desde otro dominio o desde un CDN**, con `Content-Disposition: attachment` para lo que no sea imagen. Un SVG o un HTML servido desde tu dominio ejecuta JavaScript con tus cookies.
- **URLs firmadas y caducas** para lo privado, no "URL difícil de adivinar".
- Antivirus si aceptas archivos arbitrarios de terceros.

---

## 7. Otras vulnerabilidades habituales

- **IDOR** — el id de la URL sin comprobar pertenencia. Ver `autenticacion.md`; es el fallo más frecuente de todos.
- **SSRF** — si el usuario te da una URL y tú la pides (webhooks salientes, importar desde URL, previsualizar enlaces), valida el esquema, resuelve el DNS y **bloquea rangos internos** (`127.0.0.0/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254.169.254`). Bloquea también las redirecciones a esos rangos.
- **Redirección abierta** — `?next=` sin validar. Solo rutas relativas o lista blanca de dominios.
- **Enumeración** — mensajes o tiempos distintos según si el recurso existe. 404 uniforme.
- **Fuga por diferencias de respuesta** — 403 vs 404 revelan qué ids existen.
- **Secretos en el cliente** — en Next, **todo lo que empieza por `NEXT_PUBLIC_` va en el bundle**. Una clave de servicio ahí es una clave pública.
- **Dependencias** — `npm audit` en CI, y actualizar lo que tenga CVE explotable. Fija versiones (lockfile commiteado).
- **Prototype pollution** al hacer merge de objetos que vienen del usuario.
- **ReDoS** — expresiones regulares con anidamiento sobre input sin límite de longitud.

```bash
grep -rn "NEXT_PUBLIC_.*\(SECRET\|KEY\|TOKEN\|PASSWORD\)" --include="*.ts" --include="*.tsx" --include=".env*" .
grep -rn "redirect(.*req\|redirect(.*searchParams" --include="*.ts" src app
grep -rn "createHmac\|timingSafeEqual" --include="*.ts" src app
```

---

## 8. Secretos

- Solo en variables de entorno. Nunca en el repo, ni en un commit anterior (si se coló, **rótalo**: borrarlo del historial no basta, ya se filtró).
- Distintos por entorno. La clave de producción no vive en tu portátil.
- Nunca en logs, ni en mensajes de error, ni en la respuesta de un endpoint de diagnóstico.
- Con rotación posible sin downtime: acepta la clave vieja y la nueva durante la ventana de rotación.

---

## Autoverificación

1. ¿Qué pasa si mando un body con campos de más? ¿Y con un array de 100.000 elementos?
2. ¿Qué pasa si llamo a este endpoint 1.000 veces por segundo?
3. Si falsifico la cabecera de firma del webhook, ¿entra?
4. ¿Puedo hacer que el servidor pida una URL que yo elija?
5. ¿Hay algún dato que decide el servidor (precio, rol, tenant) que estoy aceptando del cliente?
6. ¿Qué cabeceras devuelve una respuesta cualquiera de esta app? (`curl -I`)
