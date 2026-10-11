# Manejo de errores y observabilidad

Transversal: aplica a todo. Es lo que decide si un fallo en producción se arregla en diez minutos o en dos días.

---

## 1. Taxonomía: dos clases de error

- **Operativos** — esperables: input inválido, recurso no encontrado, tercero caído, conflicto de concurrencia, sin permisos. Se manejan, se traducen a una respuesta y **no** son un bug.
- **De programación** — un `undefined` donde no debía, un caso no contemplado. No se "manejan": se registran completos, se devuelve un 500 genérico y se arreglan.

Confundirlos es lo que produce el peor antipatrón: envolver todo en un `try/catch` que devuelve `null`, con lo que un bug se convierte en un dato falso que aparece tres capas más arriba sin origen.

```ts
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,          // 'STOCK_INSUFICIENTE'
    readonly status: number,        // 409
    readonly contexto?: Record<string, unknown>,
  ) { super(message); }
}
```

Con eso, un único manejador global traduce: si es `AppError`, su `status` y su `code`; si no, 500 genérico + log completo.

---

## 2. Reglas del `catch`

**Nunca un `catch` vacío ni uno que se traga el error y devuelve `null`.**

```ts
// MAL — el fallo desaparece
try { return await obtener(); } catch { return null; }

// BIEN — o relanzas, o registras con contexto y decides explícitamente
try {
  return await obtener();
} catch (e) {
  logger.error({ err: e, usuarioId, recursoId }, 'fallo al obtener recurso');
  throw new AppError('no disponible', 'UPSTREAM_DOWN', 503);
}
```

- **Captura estrecho.** Envuelve la línea que puede fallar, no las cuarenta del handler: si no, no sabes cuál falló.
- **No pierdas la causa.** Al re-lanzar, encadena: `new Error('...', { cause: e })`. Un error sin traza original no se depura.
- **Distingue por tipo de error**, no por el texto del mensaje (`e.message.includes('duplicate')` se rompe cuando el proveedor cambia el texto). Con Prisma, usa `e.code === 'P2002'`.
- **Nunca devuelvas el error crudo al cliente.** El stack, la query o el nombre de la tabla son información para un atacante. Mensaje genérico fuera, detalle completo en el log, unidos por un id de correlación que sí puedes enseñar: *"error 4f3a-..., pásaselo a soporte"*.

```bash
grep -rn -A3 "catch" --include="*.ts" src app | grep "catch.*{[[:space:]]*}\|return null;\|return \[\];"
grep -rn "e.message.includes\|error.message ===" --include="*.ts" src app
```

---

## 3. Logs

**Estructurados (JSON), no cadenas concatenadas.** Un log que no se puede filtrar no sirve cuando hay 400.000 líneas.

```ts
logger.info({ ordenId, tenantId, pasarela: 'wompi', montoCents }, 'orden pagada');
```

- **Ids, no objetos enteros.** `{ ordenId }`, no `{ orden }`. El objeto entero llena el log, cuesta dinero y acaba filtrando datos personales.
- **Nunca secretos ni datos personales**: tokens, contraseñas, cabeceras de autorización, números de tarjeta, el body completo de la petición. Si el logger tiene redacción automática de campos, configúrala.
- **Id de correlación por petición**, propagado a todas las llamadas internas y devuelto en la respuesta. Sin él no puedes reconstruir qué pasó.
- **Niveles con criterio**: `error` = alguien tiene que mirarlo; `warn` = degradación; `info` = hito de negocio; `debug` = apagado en producción. Si todo es `error`, nada lo es.
- **Loguea también los éxitos que importan** (pagos, sincronizaciones): el error solo cuenta la mitad de la historia.

---

## 4. Traza auditable

Los flujos de **dinero** y de **sincronización** dejan registro auditable. No es lo mismo que un log: es una tabla, consultable, con retención definida.

Qué guarda cada fila: quién (usuario/sistema), qué acción, sobre qué recurso, cuándo, desde dónde (IP), el estado anterior y el nuevo, y el id del evento externo si lo hay.

Va **en la misma transacción** que el cambio que audita. Un registro de auditoría que puede faltar cuando el cambio sí ocurrió no sirve como auditoría.

Aplica también a acciones sensibles de administración: cambios de rol, borrados, cambios de precio, accesos a datos de clientes.

---

## 5. Errores en el cliente

- **Captura global** (React error boundary, `window.onerror`, `unhandledrejection`) enviada al mismo sistema que el backend, con el id de correlación.
- **Mensajes útiles**: qué pasó y qué puede hacer el usuario. "Algo salió mal" no es un mensaje.
- **Nunca dejes la UI en estado de carga infinito** cuando la petición falla: todo `loading` necesita su rama de error.
- **Distingue "no hay datos" de "no se pudieron cargar"**. Una lista vacía por un 500 es una mentira visual.

---

## 6. Métricas y alertas

Lo mínimo para saber que algo va mal **antes** de que lo diga un cliente:

- **Tasa de error por endpoint** y latencia (p50/p95/p99 — la media esconde el problema).
- **Profundidad de las colas** y antigüedad del item más viejo.
- **Fallos de los terceros** por proveedor.
- **Métricas de negocio que delatan averías**: pagos completados por hora, mensajes enviados, sincronizaciones fallidas. Una caída a cero aquí se ve antes que en cualquier métrica técnica.

**Una alerta que nadie mira es ruido.** Alerta sobre síntomas que afectan al usuario (tasa de error, cola atascada, pagos a cero), no sobre cada excepción suelta.

Herramienta concreta si el proyecto ya la tiene: Sentry para errores, con `release` y `environment` bien puestos para saber qué versión rompió qué.

---

## Autoverificación

1. Cuando esto falle a las 3 de la mañana, ¿el log basta para reproducirlo sin acceso a la base?
2. ¿Hay algún `catch` aquí que convierta un fallo en un dato falso?
3. ¿Estoy logueando algo que no debería salir del servidor?
4. Si un cliente dice "me cobraron dos veces", ¿con qué consulta lo compruebo?
5. ¿Qué alerta habría saltado con este fallo? Si ninguna, ¿debería existir?
