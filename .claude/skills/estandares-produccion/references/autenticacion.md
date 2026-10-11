# Autenticación, sesiones y autorización

Aplica a login, registro, recuperación de contraseña, sesiones, JWT, permisos y multi-tenant.

**Antes de nada: si el proyecto puede usar un proveedor (Clerk, Auth0, Supabase Auth, NextAuth), úsalo.** La autenticación hecha a mano es el sitio donde más se pierde. Escribe la tuya solo si hay una razón real, y entonces sigue todo lo de abajo.

---

## 1. Autenticación ≠ autorización

Dos preguntas distintas, y **las dos se responden en el servidor, en cada petición**:

- **Autenticación** — ¿quién eres? (hay sesión válida)
- **Autorización** — ¿puedes hacer *esto* con *este recurso*? (el recurso es tuyo, tu rol lo permite, tu plan lo incluye)

El fallo más común y más caro es tener lo primero y no lo segundo:

```ts
// MAL — comprueba que hay sesión, no que la orden sea tuya (IDOR)
const { userId } = await auth();
if (!userId) return unauthorized();
const orden = await prisma.order.findUnique({ where: { id: params.id } });
return Response.json(orden);           // cambio el id de la URL y leo la de otro

// BIEN — la pertenencia va en el where, no en un if posterior
const orden = await prisma.order.findFirst({
  where: { id: params.id, tenantId: session.tenantId },
});
if (!orden) return notFound();          // 404, no 403: no confirmes que existe
```

**La pertenencia va siempre dentro del `where`.** Filtrar después en memoria significa que ya trajiste datos ajenos de la base.

### Multi-tenant

Toda query de una app multi-tenant filtra por tenant. Un `where` que se olvide es una fuga entre clientes, y eso es siempre bloqueante. Dos formas de que no dependa de la memoria de quien escribe:

- **Row Level Security** en Postgres/Supabase, con políticas por tenant. Es la única que protege aunque el código se equivoque.
- **Extensión de cliente Prisma** (`$extends`) que inyecte el `tenantId` en todas las consultas, y prohibición de usar el cliente crudo en handlers.

```bash
# Buscar queries sin filtro de tenant (revisar los resultados uno a uno)
grep -rn "prisma\.[a-zA-Z]*\.\(findMany\|findFirst\|findUnique\|update\|delete\)" \
  --include="*.ts" src app | grep -v "tenantId\|organizationId"
```

### Autorización en el borde no basta

Comprobar el rol en el middleware protege las rutas de página, pero **no** las llamadas a API que se saltan el middleware, ni las Server Actions. La comprobación va en el handler, pegada a la query. El middleware es una conveniencia, no el control.

---

## 2. Contraseñas

- **Hash con Argon2id** (preferido) o **bcrypt** con coste ≥ 12. Nunca SHA/MD5, nunca "hash casero", nunca sal compartida.
- **Longitud mínima 8–12, sin reglas de composición absurdas.** Contrasta contra una lista de contraseñas filtradas (`zxcvbn`, o la API k-anonymity de HaveIBeenPwned) — eso ataja mucho más que exigir un símbolo.
- **Comparación en tiempo constante.** La función `compare` de bcrypt/argon ya lo hace; si comparas tokens a mano, `crypto.timingSafeEqual`.
- **No reveles si el usuario existe.** Mismo mensaje y **mismo tiempo de respuesta** en "usuario no existe" y "contraseña incorrecta" — si en el primer caso no hasheas, el tiempo te delata. Aplica igual en registro y en recuperación ("si el correo existe, te hemos enviado un enlace").
- **Tokens de recuperación**: aleatorios (`crypto.randomBytes(32)`), guardados **hasheados**, de un solo uso, con caducidad corta (15–60 min), invalidados al usarse y al cambiar la contraseña.
- **Al cambiar la contraseña, invalida todas las sesiones activas** menos la actual.

---

## 3. Sesiones: cookie de sesión vs JWT

| | Sesión en servidor (id opaco) | JWT autocontenido |
|---|---|---|
| Revocar al instante | Sí, borras la fila | No, hasta que caduca |
| Coste por petición | Una lectura (Redis/BD) | Ninguna, solo verificar firma |
| Tamaño | Mínimo | Crece con los claims |
| Cuándo | **Por defecto, para apps web** | Entre servicios, o APIs sin estado |

**Recomendación: para una app web con panel, sesión en servidor.** La revocación instantánea vale más que ahorrarse una lectura. Si necesitas JWT, usa el patrón de acceso corto + refresh (abajo).

### La cookie, siempre así

```ts
const jar = await cookies();               // en Next 15+ cookies() es async
jar.set('session', token, {
  httpOnly: true,                          // JS no puede leerla → un XSS no roba la sesión
  secure:   process.env.NODE_ENV === 'production',   // solo por HTTPS
  sameSite: 'lax',                         // corta CSRF en la mayoría de casos
  path:     '/',
  maxAge:   60 * 60 * 8,                   // caducidad explícita
});
```

- **`httpOnly` no es opcional.** Un token en `localStorage` es un token robado en cuanto haya un XSS, y siempre acaba habiendo un XSS.
- **`sameSite`**: `lax` por defecto; `strict` para paneles internos; `none` **solo** si el front está en otro dominio, y entonces `secure` es obligatorio y necesitas token CSRF.
- **Prefijo `__Host-`** en el nombre (`__Host-session`) si no necesitas compartirla entre subdominios: el navegador la ata a ese host exacto con `Secure` y `path=/`.
- **Caducidad absoluta además de la deslizante.** Una sesión que se renueva sola para siempre es una sesión eterna: pon un tope (p. ej. 30 días) desde la creación.
- **Rota el identificador de sesión al iniciar sesión** (fijación de sesión) y al elevar privilegios.

### JWT bien hecho

Si vas con JWT, esto no es negociable:

- **Access token corto: 5–15 minutos.** Es la única defensa que tienes, porque no puedes revocarlo.
- **Refresh token largo en cookie `httpOnly`, rotativo y de un solo uso.** Cada uso emite uno nuevo e invalida el anterior. Si llega un refresh ya usado, es que lo robaron: **invalida toda la familia de tokens de ese usuario**.
- **Algoritmo fijado en la verificación.** Nunca aceptes el `alg` del propio token: es el ataque clásico de `alg: none` / cambio HS↔RS.
  ```ts
  await jwtVerify(token, key, { algorithms: ['HS256'], issuer: ISS, audience: AUD });
  ```
- **Verifica `iss`, `aud` y `exp` siempre.** Un token válido de otro entorno (staging) no puede servir en producción.
- **Secreto de ≥ 32 bytes aleatorios**, distinto por entorno, solo en env. Si usas RS256, la privada nunca sale del emisor.
- **Nada sensible en el payload**: un JWT va firmado, no cifrado — cualquiera lo lee en jwt.io.
- **Los claims son una foto del pasado.** Si metes `role` o `plan` en el token, un usuario degradado conserva sus permisos hasta que caduque. Para permisos que cambian, léelos del servidor.
- **`jti` + lista de revocación** si necesitas cerrar sesión de verdad antes de que caduque.
- Verifica **en el servidor**. Decodificar el JWT en el cliente sirve para pintar la UI, jamás para decidir acceso.

### Cómo buscarlo
```bash
grep -rn "localStorage.*token\|sessionStorage.*token" --include="*.ts" --include="*.tsx" src app
grep -rn "cookies()\.set\|res.cookie" --include="*.ts" src app | grep -v httpOnly
grep -rn "jwt.decode\|decodeJwt" --include="*.ts" src app     # decode ≠ verify
grep -rn "jwt.verify\|jwtVerify" --include="*.ts" src app     # ¿fija algorithms?
grep -rn "expiresIn" --include="*.ts" src app                 # ¿access token corto?
```

---

## 4. Límite de intentos y bloqueo

Distinto del rate limit general (ver `api-endurecimiento.md`): aquí lo que se protege es la **cuenta**, no el servidor.

- **Cuenta por dos claves a la vez: por identificador y por IP.** Solo por IP, un atacante con proxies pasa; solo por cuenta, un atacante bloquea a tus usuarios a propósito (denegación de servicio por bloqueo).
- **Backoff progresivo antes que bloqueo duro.** Retraso creciente tras el 3.er intento; bloqueo temporal (15 min) tras 5–10. El bloqueo indefinido convierte un ataque en una avería para el usuario legítimo.
- **Cuenta también los fallos de MFA, de recuperación y de reenvío de código.**
- **Registra cada intento fallido** con IP, user-agent, identificador y momento. Sin eso no puedes investigar nada después.
- **Notifica al usuario** el inicio de sesión desde un dispositivo nuevo y el cambio de contraseña o de correo.
- **CAPTCHA solo tras varios fallos**, no de entrada.

---

## 5. Endurecimiento adicional

- **MFA (TOTP)** para cuentas con acceso a dinero o a datos de terceros. Códigos de recuperación de un solo uso, guardados hasheados.
- **Reautenticación para acciones críticas**: cambiar correo, cambiar contraseña, borrar cuenta, mover dinero. Pide la contraseña otra vez aunque haya sesión.
- **Verificación de correo** antes de dar acceso a nada que importe.
- **Cierre de sesión real**: borra la fila de sesión en el servidor, no solo la cookie del navegador.
- **Panel de sesiones activas** con opción de cerrar las demás, si la app maneja datos sensibles.
- **Claves de API de terceros**: guardadas hasheadas si las emites tú, con prefijo identificable, ámbito limitado y caducidad. Y con rotación posible sin downtime.
- **Registro de auditoría** para acciones sensibles: quién, qué, cuándo, desde dónde. Ver `errores-y-observabilidad.md`.

---

## Autoverificación

Antes de dar por terminado un flujo de autenticación:

1. Si copio el id de otro usuario en la URL, ¿qué recibo? (debe ser 404, y sin haber leído el dato)
2. Si me roban la cookie, ¿cuánto dura el acceso? ¿Puedo cortarlo desde el servidor ahora mismo?
3. Si pruebo 10.000 contraseñas, ¿en qué intento me para el sistema?
4. Si el usuario cambia de contraseña, ¿mueren las demás sesiones?
5. ¿Puedo distinguir, por el mensaje o por el tiempo, si un correo está registrado?
6. ¿Hay algún sitio donde la decisión de acceso la tome el cliente?
